const Reader = require('./Reader');
const Strings = require('../commons/Strings');

module.exports = class JSONReader extends Reader {
	constructor(stream) {
		super(stream);

		if (stream) {
			try {
				this._json = JSON.parse(stream);
			} catch (e) {
				throw String('JSON Invalid');
			}
		}
	}

	getDocument() {
		return this.getObject(this._json, 'document');
	}

	setRoot(json) {
		this._json = json;
	}

	getRoot() {
		return this._json;
	}

	getAttribute(object, key) {
		return object[key];
	}

	getAttributeNumber(object, name, defvalue) {
		const nrstr = this.getAttribute(object, name);
		return nrstr !== undefined ? Number(nrstr) : defvalue;
	}

	getObject(object, key) {
		return object[`o-${key}`];
	}

	getString(object) {
		return object.text;
	}

	iterateObjects(object, callback) {
		/* eslint-disable no-restricted-syntax */
		for (const prop in object) {
			// only enumerate objects, not attributes
			if (Strings.startsWith(prop, 'o-')) {
				const name = prop.slice(2);
				if (callback(name, object[prop]) === false) {
					return false;
				}
			} else if (Strings.startsWith(prop, 'a-')) {
				// enumerate sub items in array
				const name = prop.slice(2);
				object[prop].every((val) => {
					if (callback(name, val) === false) {
						return false;
					}
					return true;
				});
			}
		}
		/* eslint-enable no-restricted-syntax */

		return true;
	}

	iterateAttributes(object, callback) {
		/* eslint-disable no-restricted-syntax */
		for (const prop in object) {
			// only enumerate attributes, not objects or arrays
			if (
				!Strings.startsWith(prop, 'o-') &&
				!Strings.startsWith(prop, 'a-')
			) {
				if (callback(prop, object[prop]) === false) {
					return false;
				}
			}
		}
		/* eslint-enable no-restricted-syntax */

		return true;
	}
};
