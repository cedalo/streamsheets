const { MessagingService } = require('@cedalo/service-core');
const { Topics } = require('@cedalo/protocols');
const IdGenerator = require('@cedalo/id-generator');
const { MongoDBConfigurationRepository } = require('@cedalo/repository');

const config = require('../../config');
const SocketServer = require('../../ws/SocketServer');

const startRESTServer = require('../../rest/start');
const MachineServiceMessageRouter = require('./MachineServiceMessageRouter');
const Auth = require('../../Auth');

module.exports = class GatewayService extends MessagingService {

	constructor(metadata) {
		super(metadata);
		this.socketServer = new SocketServer(config.get('socket'), this);
		this.machineRouter = new MachineServiceMessageRouter(this);
		this._services = new Map();
		this.configRepo = new MongoDBConfigurationRepository();
	}

	async prepareJWT() {
		let jwtToken;
		let jwtSecret = config.get('auth.jwtSecret') || '';
		const jwtConfig = await this.configRepo.getJWT();
		if (jwtConfig && typeof jwtConfig.secret === 'string') {
			jwtSecret = jwtConfig.secret;
			jwtToken = jwtConfig.token;
		}
		if (!jwtConfig || (typeof jwtConfig.secret === 'string' && jwtSecret.length < 1)) {
			jwtSecret = IdGenerator.generateUUID();
		}
		Auth.jwtSecret = jwtSecret;
		jwtToken =
			jwtToken ||
			Auth.getToken({
				service: 'internal',
				issuer: 'Cedalo'
			});
		this.publishMessage(
			Topics.CONFIG_JWT,
			{
				jwt: {
					secret: jwtSecret,
					token: jwtToken
				}
			},
			{ retain: true, qos: 2 }
		);
		this.configRepo.saveJWT({ secret: jwtSecret, token: jwtToken });
	}

	async _preStart() {
		await this.configRepo.connect();
		await super._preStart();
		await this.prepareJWT();
		await this.socketServer.start();
	}

	async _doStart() {
		await startRESTServer(this);
	}

	async _postStart() {
		await super._postStart();
		this.messagingClient.subscribe(`${Topics.SERVICES_STATUS}/#`);
		this.messagingClient.on('message', (topic, message) => {
			if (topic.startsWith(`${Topics.SERVICES_STATUS}/`)) {
				const serviceName = topic.substring(topic.lastIndexOf('/') + 1);
				const serviceInformation = JSON.parse(message.toString());
				this._updateServices(serviceName, serviceInformation);
				this.socketServer.broadcast(serviceInformation);
				this.broadcastEvent(serviceName, serviceInformation);
			}
		});
	}


	notifySendMessageToClient() {
		if (this._messagesCounter) {
			this._messagesCounter.inc();
		}
	}

	_updateServices(serviceName, serviceInformation) {
		if (!this._services.get(serviceName)) {
			this._services.set(serviceName, {
				instances: new Map()
			});
		}
		const serviceContainer = this._services.get(serviceName);
		serviceContainer.instances.set(serviceInformation.id, serviceInformation);
		// if the service instance was stopped
		if (serviceInformation.status === 'stopped') {
			// delete the stopped service instance from the service registry
			serviceContainer.instances.delete(serviceInformation.id);
		}
	}

	get services() {
		const services = {};
		// eslint-disable-next-line
		for (const [serviceName, serviceContainerMap] of this._services) {
			const serviceContainer = {};
			const instances = {};
			// eslint-disable-next-line
			for (const [serviceID, serviceInformation] of serviceContainerMap.instances) {
				// TODO: improve this
				serviceContainer.name = serviceInformation.name;
				serviceContainer.description = serviceInformation.description;
				serviceContainer.provider = serviceInformation.provider;
				serviceContainer.buildNumber = serviceInformation.buildNumber;
				serviceContainer.version = serviceInformation.version;
				instances[serviceID] = {
					id: serviceInformation.id,
					os: serviceInformation.os,
					status: serviceInformation.status
				};
			}
			serviceContainer.instances = instances;
			services[serviceName] = serviceContainer;
		}
		return services;
	}

	getServiceStatus(service) {
		const serviceInformation = this._services.get(service);
		if (serviceInformation) {
			const instances = Array.from(serviceInformation.instances);
			// TODO: get status for different instances
			if (instances && instances[0] && instances[0][1]) {
				return this.convertToEvent(service, instances[0][1]);
			}
		}
		return {};
	}

	getServicesByType(type) {
		return this.services[type];
	}

	convertToEvent(service, message) {
		let event = null;
		let type = '';
		// TODO: handle graph service and machine service like other service
		// this here is only done because of backward compability
		if (service === 'graphs') {
			type = message.status === 'running' ? 'graphserver_connected' : 'graphserver_disconnected';
		} else if (service === 'machines') {
			type = message.status === 'running' ? 'machineserver_connected' : 'machineserver_disconnected';
		} else {
			// eslint-disable-next-line
			if (message.status === 'running') {
				type = 'service_connected';
			} else if (message.status === 'stopped') {
				type = 'service_disconnected';
			}
		}
		event = {
			type: 'event',
			event: {
				type,
				service: message
			}
		};
		return event;
	}

	broadcastEvent(service, message) {
		const event = this.convertToEvent(service, message);
		if (event) {
			this.socketServer.broadcast(event);
		}
	}

	_getKeepAliveTopic() {
		return Topics.SERVICES_GATEWAY_EVENTS;
	}

	_getKeepAliveMessage() {
		return { type: 'connect', server: 'gateway-service' };
	}
};
