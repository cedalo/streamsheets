'use strict';

/**
 * ******************************************************************************************
 * Streams request types
 * ******************************************************************************************
 */

const STREAM_CONFIG_SAVE = 'stream_config_save';
const STREAM_CONFIG_DELETE = 'stream_config_delete';
const STREAM_CONFIG_LOAD = 'stream_config_load';
const STREAMS_CONFIG_LOAD_ALL = 'stream_config_load_all';
const STREAM_UPDATE = 'stream_update';
const STREAM_TEST = 'stream_test';
const STREAM_LIST = 'stream_list';
const STREAM_RELOAD = 'stream_reload';
const STREAM_RELOAD_ALL = 'stream_reload_all';
const STREAM_COMMAND_MESSAGE_TYPE = 'stream_command';
const STREAM_LOOKUP_REQUEST = 'stream_lookup_request';
const META_INFORMATION_MESSAGE_TYPE = 'meta_information';


/**
 * ******************************************************************************************
 * Events
 * ******************************************************************************************
 */
const STREAM_ERROR = 'stream_error';
const STREAM_UPDATED = 'stream_updated';
const STREAM_LOG = 'stream_log';
const STREAM_RELOADED = 'stream_reloaded';
const STREAM_RELOADED_ALL = 'stream_reloaded_all';
const STREAM_LOOKUP_RESPONSE = 'stream_lookup_response';

module.exports = {
	MESSAGE_TYPES: {
		STREAM_CONFIG_SAVE,
		STREAM_CONFIG_DELETE,
		STREAM_CONFIG_LOAD,
		STREAMS_CONFIG_LOAD_ALL,
		STREAM_UPDATE,
		STREAM_TEST,
		STREAM_LIST,
		STREAM_RELOAD,
		STREAM_RELOAD_ALL,
		STREAM_LOOKUP_REQUEST,
		META_INFORMATION_MESSAGE_TYPE,
		STREAM_COMMAND_MESSAGE_TYPE
	},
	EVENTS: {
		STREAM_UPDATED,
		STREAM_RELOADED,
		STREAM_RELOADED_ALL,
		STREAM_ERROR,
		STREAM_LOOKUP_RESPONSE,
		STREAM_LOG
	}
};
