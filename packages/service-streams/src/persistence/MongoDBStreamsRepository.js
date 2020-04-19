const { mix } = require('mixwith');
const { LoggerFactory } = require('@cedalo/logger');
const AbstractStreamsRepository = require('./AbstractStreamsRepository');
const MongoDBMixin = require('@cedalo/repository').MongoDBMixin;
const defaultConfigurations = require('./configurations.json');
const fs = require('fs');
const CONFIG = require('../config');

const COLLECTION = CONFIG.database.collection || 'streams';

const logger = LoggerFactory.createLogger(
	'MongoDBStreamsRepository',
	process.env.STREAMSHEETS_STREAMS_SERVICE_LOG_LEVEL
);

module.exports = class MongoDBStreamsRepository extends mix(
	AbstractStreamsRepository
).with(MongoDBMixin) {
	constructor(config = { conf: true }) {
		super(config);
		this.collection = this.config.collection || COLLECTION;
	}

	async init() {
		await this.connect();
		await this.setupIndicies();
		await this.populate();
	}

	async reset() {
		await this.connect();
		await this.deleteAllConfigurations();
	}

	async setupIndicies() {
		return Promise.all([
			this.db
				.collection(this.collection)
				.createIndex({ id: 1 }, { unique: true, background: true }),
			this.db
				.collection(this.collection)
				.createIndex({ name: 1 }, { unique: true }),
			this.db
				.collection(this.collection)
				.createIndex({ className: 1 }, { background: true })
		]);
	}

	async populate() {
		// clean providers
		await this.deleteAllProviders();
		const allConfigs = await this.findAllConfigurations();
		if (allConfigs.length < 1 || process.env.STREAMSHEETS_DB_SEED) {
			const providerIds = CONFIG.providers.map((id) => id);

			logger.info(
				`ensureMinDataInRepos needs to populate configs at ${new Date()}`
			);
			const defConnectors = defaultConfigurations.filter(
				(conf) =>
					conf.className === 'ConnectorConfiguration' &&
					conf.provider &&
					providerIds.includes(conf.provider.id)
			);
			const defStreams = defaultConfigurations.filter(
				(conf) =>
					conf.className !== 'ConnectorConfiguration' &&
					conf.connector &&
					!!defConnectors.find((c) => c.id === conf.connector.id)
			);
			await this.saveConfigurations([...defConnectors, ...defStreams]);
		}
		await this.syncDefaultConfigurations(
			allConfigs.filter((c) => c.className === 'ProviderConfiguration')
		); // Promise.resolve();
		if (allConfigs.length > 0) {
			const newConfigs = allConfigs.map(this.migrateConfiguration);
			const withoutOldProviders = newConfigs.filter(
				(config) =>
					!(
						config.className === 'ProviderConfiguration' &&
						(config.id === 'dl-feeder-rest' ||
							config.id === 'dl-feeder-email' ||
							config.id === 'dl-feeder-aws' ||
							config.id === 'dl-feeder-mqtt')
					)
			);
			await this.deleteAllConfigurations();
			await this.saveConfigurations(withoutOldProviders);
		}
		// TODO: end migration
	}

	syncDefaultConfigurations(configs) {
		const knownProviders = configs.reduce((all, provider) => {
			all[provider.id] = provider;
			return all;
		}, {});
		const addDefConfigs = defaultConfigurations.filter(
			(cfg) => cfg.provider && !knownProviders[cfg.provider.id]
		);
		return Promise.all[
			addDefConfigs.forEach((config) => this.saveConfiguration(config))
		];
	}

	findAllConfigurations() {
		return this.getDocuments(this.collection);
	}

	findConfigurationsByType(className) {
		return this.getDocuments(this.collection, { className });
	}

	async findConfigurationById(id) {
		const r = await this.getDocuments(this.collection, { id });
		const config = r && r.length > 0 ? r[0] : null;
		return config;
	}

	async findConfigurationByName(name) {
		const r = await this.getDocuments(this.collection, { name });
		const config = r && r.length > 0 ? r[0] : null;
		return config;
	}

	// TODO: should remove migration...
	migrateConfiguration(config) {
		if(typeof config !== 'object') {
			return config;
		}
		const json = JSON.stringify(config);
		const configuration = JSON.parse(json);
		configuration._id = configuration.id;
		if (configuration.provider) {
			if (configuration.provider.id === 'dl-feeder-rest') {
				configuration.provider.id = 'rest-server';
				configuration.provider._id = 'rest-server';
			} else if (configuration.provider.id === 'dl-feeder-email') {
				configuration.provider.id = 'stream-mail-pop3';
				configuration.provider._id = 'dl-feeder-mail-pop3';
				configuration.host = configuration.pop3Host;
				delete configuration.pop3Host;
				configuration.port = configuration.pop3Port;
				delete configuration.pop3Port;
				configuration.security = configuration.pop3Security;
				delete configuration.pop3Security;
			} else if(configuration.provider.id === 'dl-feeder-mqtt') {
				configuration.provider = {
					_id: "stream-mqtt",
					id: "stream-mqtt",
					className: "ProviderConfiguration",
					isRef: true
				};
				configuration.protocolVersion = 4;
				const port = configuration.port ? `:${configuration.port}` : '';
				configuration.url = `mqtt://${configuration.host}${port}`;
				delete configuration.port;
				delete configuration.host;
			}
		}
		if (configuration.className !== 'ProviderConfiguration') {
			configuration.name = configuration.name
			.replace(' ', '_')
			.replace(/[^a-zA-Z0-9_]/, '');
		}
		if(configuration.id === 'CONNECTOR_MQTT' && configuration.url === 'broker' && configuration.userName === 'cedalo' && !configuration.migrated){
			try {
				const newPassword = fs.readFileSync('/etc/mosquitto-default-credentials/pw_clear.txt').toString().trim();
				if(newPassword) {
					configuration.url = 'localhost';
					configuration.password = newPassword;
					configuration.migrated = true;
				}
			} catch (error) {
				// New password not found
			}
		}
		return configuration;
	}

	saveConfiguration(configuration) {
		// configuration = this.migrateConfiguration(configuration);
		configuration._id = configuration.id;
		configuration.lastModified = new Date().toISOString();
		return this.upsertDocument(
			this.collection,
			{ _id: configuration._id },
			configuration
		);
	}

	updateConfiguration(id, $set) {
		$set.lastModified = new Date().toISOString();
		return this.updateDocument(this.collection, id, $set);
	}

	saveConfigurations(configurations) {
		return Promise.all(
			configurations.map(async (c) => this.saveConfiguration(c))
		);
	}

	deleteConfiguration(id) {
		return this.deleteDocument(this.collection, id);
	}

	deleteAllConfigurations() {
		return this.deleteAllDocuments(this.collection);
	}

	async deleteAllProviders() {
		return this.db
			.collection(this.collection)
			.remove({ className: 'ProviderConfiguration' });
	}
};
