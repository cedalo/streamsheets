const { mix } = require('mixwith');

const AbstractConfigurationRepository = require('./AbstractConfigurationRepository');
const MongoDBMixin = require('../mongoDB/MongoDBMixin');

/**
 * A configuration repository which stores the settings in a MongDB.
 *
 * @class MongoDBConfigurationRepository
 * @extends AbstractConfigurationRepository
 * @public
 */
module.exports = class MongoDBConfigurationRepository extends mix(
	AbstractConfigurationRepository
).with(MongoDBMixin) {
	constructor(config = {}) {
		super(config);
	}

	getSetup() {
		return this.findConfiguration('setup');
	}

	saveSetup(setup) {
		return this.saveConfiguration(setup, 'setup');
	}

	async getJWT() {
		return this.findConfiguration('jwt');
	}

	async saveJWT(jwtObj) {
		return this.upsertConfiguration(jwtObj, 'jwt');
	}

	findConfiguration(id) {
		return this.getDocument(this.COLLECTIONS.CONFIGURATIONS, id).then(
			(configuration) => configuration
		);
	}

	upsertConfiguration(configuration, id) {
		const configurationToSave = Object.assign({}, configuration);
		configurationToSave._id = id;
		return this.upsertDocument(
			this.COLLECTIONS.CONFIGURATIONS,
			{ _id: id },
			configurationToSave
		).then(() => configuration);
	}

	saveConfiguration(configuration, id) {
		const configurationToSave = Object.assign({}, configuration);
		configurationToSave._id = id;
		return this.insertDocument(
			this.COLLECTIONS.CONFIGURATIONS,
			configurationToSave
		).then(() => configuration);
	}
};
