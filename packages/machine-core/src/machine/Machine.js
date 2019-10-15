const IdGenerator = require('@cedalo/id-generator');
const EventEmitter = require('events');
const State = require('../State');
const NamedCells = require('./NamedCells');
const Outbox = require('./Outbox');
const StreamSheet = require('./StreamSheet');
const locale = require('../locale');
const logger = require('../logger').create({ name: 'Machine' });
const FunctionRegistry = require('../FunctionRegistry');
const Streams = require('../streams/Streams');
const { convert } = require('../functions/_utils');

// REVIEW: move to streamsheet!
const defaultStreamSheetName = (streamsheet) => {
	let suffix = 1;
	const { machine } = streamsheet;
	while (machine.getStreamSheetByName(`S${suffix}`)) {
		suffix += 1;
	}
	return `S${suffix}`;
};

const defaultMachineName = () => `Machine${new Date().getUTCMilliseconds()}`;

const applyHotReplace = (replace, streamsheets) => {
	streamsheets = replace.remove ? streamsheets.filter((tr) => !replace.remove.includes(tr)) : streamsheets;
	return replace.add ? streamsheets.concat(replace.add) : streamsheets;
};

const DEF_CONF = {
	name: '',
	state: State.STOPPED,
	metadata: {
		owner: 'anon',
		lastModified: Date.now(),
		lastModifiedBy: 'unknown'
	},
	settings: {
		locale: 'en',
		isOPCUA: false,
		cycletime: 100
	}
};

/**
 * A class representing a machine.
 *
 * @class Machine
 * @public
 */
class Machine {
	constructor() {
		this._id = IdGenerator.generate();
		this.namedCells = new NamedCells();
		this._initialLoadTime = Date.now();
		this._name = DEF_CONF.name;
		this._state = DEF_CONF.state;
		// a Map keeps its insertion order
		this._streamsheets = new Map();
		this._activeStreamSheets = null;
		this._preventStop = false;
		this.metadata = { ...DEF_CONF.metadata };
		this._settings = { ...DEF_CONF.settings };
		// read only properties...
		Object.defineProperties(this, {
			stats: { value: { steps: 0 } },
			outbox: { value: new Outbox(), enumerable: true },
			_emitter: { value: new EventEmitter() },
			cyclemonitor: {
				value: {
					id: null,
					counterSecond: 0,
					last: 0,
					lastSecond: 0
				},
				enumerable: false
			}
		});
		this.metadata.lastModified = Date.now();
		this.cycle = this.cycle.bind(this);
		this.notifyStreamSheetStep = this.notifyStreamSheetStep.bind(this);
	}

	get className() {
		return 'Machine';
	}

	toJSON() {
		return {
			id: this.id,
			name: this.name,
			state: this.state,
			metadata: { ...this.metadata },
			streamsheets: this.streamsheets.map((streamsheet) => streamsheet.toJSON()),
			settings: this.settings,
			className: this.className,
			namedCells: this.namedCells.getDescriptors(),
			functionDefinitions: FunctionRegistry.functionDefinitions
		};
	}

	load(definition = {}, functionDefinitions = [], currentStreams = []) {
		FunctionRegistry.registerStreamFunctions(functionDefinitions);
		const def = Object.assign({}, DEF_CONF, definition);
		const streamsheets = def.streamsheets || [];
		this._id = def.isTemplate ? this._id : def.id || this._id;
		this._name = def.isTemplate ? defaultMachineName() : def.name;
		this.metadata = { ...this.metadata, ...definition.metadata};
		this._settings = { ...this.settings, ...definition.settings};
		this.namedCells.load(this, def.namedCells);

		// load streamsheets:
		if (streamsheets.length > 0) {
			this.removeAllStreamSheets();
			// first add all
			streamsheets.forEach((transdef) => {
				const streamsheet = new StreamSheet(transdef);
				transdef.id = streamsheet.id;
				this.addStreamSheet(streamsheet);
			});
			// then load all
			streamsheets.forEach((transdef) => this.getStreamSheet(transdef.id).load(transdef, this));
		} else {
			// at least one streamsheet (required by graph-service!!):
			this.addStreamSheet(new StreamSheet());
		}

		currentStreams.forEach((descriptor) => Streams.registerSource(descriptor, this));
		setTimeout(() => {
			Streams.prune(currentStreams.map(({ id }) => id), this._initialLoadTime, this);
			this.notifyUpdate('namedCells');
		}, 60000);

		// TODO: s this still required?
		// update value of cells to which are not currently valid without changing valid values
		// => e.g. if a cell references another cell which was loaded later...
		this._streamsheets.forEach((streamsheet) => streamsheet.sheet.iterate((cell) => cell.update()));

		// apply loaded state:
		if (def.state === State.RUNNING) {
			this.start();
		} else if (def.state === State.PAUSED) {
			this.pause();
		}
	}

	loadFunctions(functionDefinitions = []) {
		FunctionRegistry.registerStreamFunctions(functionDefinitions);
		this._streamsheets.forEach((streamsheet) => {
			const { sheet } = streamsheet;
			const json = sheet.toJSON();
			sheet.load(json);
		});
		this._emitter.emit('update', 'functions', FunctionRegistry.functionDefinitions);
	}

	get id() {
		return this._id;
	}
	get settings() {
		return this._settings;
	}

	set settings(settings) {
		this._settings = settings;
	}

	get owner() {
		return this.metadata.owner;
	}

	set owner(owner) {
		this.metadata.owner = owner || DEF_CONF.metadata.owner;
	}

	get name() {
		return this._name;
	}

	set name(name) {
		if (this.name !== name) {
			this._name = name;
			this._emitter.emit('update', 'name');
		}
	}

	get cycletime() {
		return this.settings.cycletime;
	}

	set cycletime(newtime) {
		const oldtime = this.cycletime;
		newtime = Math.max(1, convert.toNumber(newtime, oldtime));
		if (oldtime !== newtime) {
			this.settings.cycletime = newtime;
			this._emitter.emit('update', 'cycletime');
			// DL-1582: cancel old cycle and use new time...
			if (this.cyclemonitor.id) {
				clearTimeout(this.cyclemonitor.id);
				this.cyclemonitor.id = setTimeout(this.cycle, newtime, this.streamsheets);
			}
		}
	}

	get locale() {
		return this.settings.locale;
	}
	set locale(newLocale) {
		const doIt = this.settings.locale !== newLocale && locale.isSupported(newLocale);
		if (doIt) {
			this.settings.locale = newLocale;
			this._emitter.emit('update', 'locale');
		}
		return doIt;
	}
	get isOPCUA() {
		return this.settings.isOPCUA;
	}

	set isOPCUA(itIs) {
		if (itIs !== this.isOPCUA) {
			this.settings.isOPCUA = itIs;
			this._emitter.emit('update', 'opcua');
		}
	}

	get state() {
		return this._state;
	}

	get streamsheets() {
		return Array.from(this._streamsheets.values());
	}

	get activeStreamSheets() {
		return this._activeStreamSheets || this.streamsheets;
	}

	set activeStreamSheets(streamsheets) {
		this._activeStreamSheets = streamsheets;
	}

	// internal property:
	get doStop() {
		return !this._preventStop && this._state === State.WILL_STOP;
	}

	set preventStop(doIt) {
		this._preventStop = doIt || this._preventStop;
	}

	// name, cycletime, locale...
	update(props = {}) {
		this.name = props.name || this.name;
		this.locale = props.locale || this.locale;
		this.cycletime = props.cycletime || this.cycletime;
		if (props.isOPCUA != null) this.isOPCUA = props.isOPCUA;
	}

	addStreamSheet(streamsheet) {
		if (this._streamsheets.has(streamsheet.id)) {
			logger.warn(`Ignore streamsheet add! A streamsheet with same id (${streamsheet.id}) already exists!`);
		} else {
			streamsheet.machine = this;
			streamsheet.name = streamsheet.name || defaultStreamSheetName(streamsheet);
			this._streamsheets.set(streamsheet.id, streamsheet);
			streamsheet.on('step', this.notifyStreamSheetStep);
			this._emitter.emit('update', 'streamsheet_added', streamsheet);
			// reflect state to streamsheet
			if (this.state === State.PAUSED) {
				streamsheet.pause();
			} else if (this.state === State.RUNNING) {
				streamsheet.start();
				// add to cycled streamsheets
				this.hotReplace = this.hotReplace || { add: [] };
				this.hotReplace.add.push(streamsheet);
			}
		}
	}

	removeStreamSheet(streamsheet) {
		// remove from cycled streamsheets
		if (this.state === State.RUNNING) {
			this.hotReplace = this.hotReplace || { remove: [] };
			this.hotReplace.remove.push(streamsheet);
		}
		streamsheet.dispose();
		streamsheet.machine = undefined;
		if (this._streamsheets.delete(streamsheet.id)) {
			this._emitter.emit('update', 'streamsheet_removed', streamsheet);
		}
	}

	removeAllStreamSheets() {
		this._streamsheets.forEach((streamsheet) => {
			streamsheet.dispose();
			streamsheet.machine = undefined;
		});
		this._streamsheets.clear();
		this._emitter.emit('update', 'streamsheet_removed_all');
	}

	setStreamSheetsOrder(ids = []) {
		let didIt = false;
		if (ids.length === this._streamsheets.size) {
			const neworder = new Map();
			const invalidIDs = ids.some((id) => {
				const streamsheet = this.getStreamSheet(id);
				if (streamsheet) {
					neworder.set(streamsheet.id, streamsheet);
				}
				return streamsheet == null;
			});
			if (!invalidIDs) {
				this._streamsheets = neworder;
				this._emitter.emit('update', 'streamsheets_order', ids);
				didIt = true;
			}
		}
		return didIt;
	}

	getStreamSheet(id) {
		return this._streamsheets.get(id);
	}

	getStreamSheetByName(name, caseInSensitive) {
		let streamsheet;
		caseInSensitive = !!caseInSensitive;
		name = caseInSensitive ? name.toLowerCase() : name;
		this._streamsheets.forEach((tr) => {
			const trName = caseInSensitive ? tr.name.toLowerCase() : tr.name;
			if (trName === name) streamsheet = streamsheet || tr;
		});
		return streamsheet;
	}

	async reload() {
		logger.info(`reloading streamsheets of machine: ${this.id}`);
		this._loadStreamSheets(this.streamsheets.map((t) => t.toJSON()));
		const data = {
			timestamp: new Date(),
			attached: true,
			streams: this.streamManager.configurations
		};
		this._emitter.emit('update', 'streams_reloaded', data);
	}

	notifyUpdate(type, message) {
		this._emitter.emit('update', type, message);
	}

	notifyMessage(type, message) {
		this._emitter.emit('message', type, message);
	}

	notifyStreamSheetStep(streamsheet) {
		this._emitter.emit('streamsheetstep', streamsheet);
	}

	on(event, callback) {
		this._emitter.on(event, callback);
	}
	off(event, callback) {
		this._emitter.removeListener(event, callback);
	}

	dispose() {
		this.stop();
		this.streamsheets.forEach((streamsheet) => streamsheet.dispose());
		this._emitter.removeAllListeners('update');
	}

	async start() {
		if (this._state !== State.RUNNING && this._state !== State.WILL_STOP) {
			const oldstate = this._state;
			const allStreamSheets = this.streamsheets;
			try {
				if (this._state === State.STOPPED) {
					this._activeStreamSheets = null;
					// clear in- & outbox (DL-204) on start (not stop, user might want to see current messages...)
					this.outbox.clear();
					allStreamSheets.forEach((streamsheet) => streamsheet.start());
				}
				this._emitter.emit('willStart', this);
				this._state = State.RUNNING;
				this.cyclemonitor.counterSecond = 0;
				this.cyclemonitor.last = Date.now();
				this.cyclemonitor.lastSecond = Date.now();
				this._emitter.emit('update', 'state');
				this.cycle(allStreamSheets);
				this._emitter.emit('didStart', this);
				logger.info(`Machine: -> STARTED machine ${this.id}`);
			} catch (err) {
				this._clearCycle();
				this._state = oldstate;
				throw err;
			}
		}
	}

	async stop() {
		const prevstate = this._state;
		if (prevstate !== State.STOPPED) {
			this._clearCycle();
			this._willStop();
			const pendingStreamSheets = this.activeStreamSheets.filter((streamsheet) => !streamsheet.stop());
			const preventStop = !!pendingStreamSheets.length;
			this._state = preventStop ? State.WILL_STOP : State.STOPPED;
			this.activeStreamSheets = preventStop ? pendingStreamSheets : null;
			if (preventStop && prevstate !== State.PAUSED) {
				this.cycle(this.activeStreamSheets);
			}
			this._didStop();
			logger.info(`Machine: -> ${this._state} machine ${this.id}`);
			this._emitter.emit('update', 'state');
		}
	}
	_willStop() {
		if (this._state !== State.WILL_STOP) {
			this._emitter.emit('willStop', this);
		}
	}
	_didStop() {
		if (this._state === State.STOPPED) {
			// DL-565 reset steps on stop...
			this.stats.steps = 0;
			this.stats.cyclesPerSecond = 0;
			this._emitter.emit('didStop', this);
		}
	}

	forceStop() {
		this._state = State.STOPPED;
		try {
			this._clearCycle();
			this.activeStreamSheets.filter((streamsheet) => !streamsheet.stop());
			this._didStop();
			logger.info(`Machine: -> ${this._state} machine ${this.id}`);
		} catch (err) {
			/* ignore */
		}
		this._emitter.emit('update', 'state');
	}

	async pause() {
		if (this._state !== State.PAUSED && this._state !== State.WILL_STOP) {
			this._clearCycle();
			this._state = State.PAUSED;
			this.stats.cyclesPerSecond = 0;
			this.streamsheets.forEach((streamsheet) => streamsheet.pause());
			this._emitter.emit('update', 'state');
			logger.info(`Machine: -> PAUSED machine ${this.id}`);
		}
	}

	async step() {
		if (this._state !== State.RUNNING) {
			this._doStep(this.activeStreamSheets, true);
		}
	}

	async _doStep(streamsheets, manual) {
		this._preventStop = false;
		this.stats.steps += 1;
		streamsheets.forEach((streamsheet) => streamsheet.step(manual));
		this._emitter.emit('update', 'step');
		if (this.doStop) {
			this.stop();
		}
	}

	async cycle(streamsheets) {
		this.cyclemonitor.counterSecond += 1;
		const t0 = Date.now();
		try {
			if (this.hotReplace) {
				streamsheets = applyHotReplace(this.hotReplace, streamsheets);
				this.hotReplace = undefined;
			}
			await this._doStep(streamsheets);
			if (this._state !== State.STOPPED) {
				// next cycle
				this._scheduleNextCycle(t0, Date.now(), streamsheets);
				this.cyclemonitor.last = t0;
			}
		} catch (err) {
			this.forceStop();
			logger.error(`Error while performing next cycle on machine ${this.id}!! Stopped machine...`, err);
			this._emitter.emit('error', err);
		}
	}
	_scheduleNextCycle(t0, t1, streamsheets) {
		const last = this.cyclemonitor.last;
		const cycletime = this.cycletime;
		// if we were called after desired cycletime we try to speed up...
		const delay = Math.max(0, t0 - last - cycletime);
		const speedUp = last > 0 && delay > 0 ? delay : 0;
		const perSecond = t1 - this.cyclemonitor.lastSecond;
		if (perSecond >= 1000) {
			this.stats.cyclesPerSecond = Math.ceil(this.cyclemonitor.counterSecond / (perSecond / 1000));
			this.cyclemonitor.lastSecond = t1;
			this.cyclemonitor.counterSecond = 0;
		}
		const nextcycle = Math.max(1, cycletime - (t1 - t0) - speedUp);
		this.cyclemonitor.id = setTimeout(this.cycle, nextcycle, streamsheets);
	}
	_clearCycle() {
		if (this.cyclemonitor.id) {
			clearTimeout(this.cyclemonitor.id);
			this.cyclemonitor.id = null;
		}
	}

	setLastModifiedAt(timestamp, byUser) {
		this.metadata.lastModified = timestamp;
		this.metadata.lastModifiedBy = byUser || this.metadata.lastModifiedBy;
		this._emitter.emit('update', 'lastModified');
	}
}

module.exports = Machine;
