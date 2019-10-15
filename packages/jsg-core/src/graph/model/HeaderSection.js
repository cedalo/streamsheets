const AttributeUtils = require('../attr/AttributeUtils');
const CellAttributes = require('../attr/CellAttributes');
const CellFormatAttributes = require('../attr/CellFormatAttributes');
const CellTextFormatAttributes = require('../attr/CellTextFormatAttributes');

/**
 * @class HeaderSection
 *
 * @extends HeaderSection
 * @constructor
 */
module.exports = class HeaderSection {
	constructor() {
		this._size = 0;
		this._visible = true;
		this._title = undefined;
		this._format = undefined;
		this._textFormat = undefined;
		this._attributes = undefined;
	}

	isDefault(defaultSize) {
		return (
			this._size === defaultSize &&
			this._visible === true &&
			this._title === undefined &&
			this._format === undefined &&
			this._textFormat === undefined &&
			this._attributes === undefined
		);
	}

	copy() {
		const copy = new HeaderSection();

		copy._size = this._size;
		copy._visible = this._visible;
		copy._title = this._title;
		if (this._format) {
			copy._format = this._format.copy();
		}
		if (this._textFormat) {
			copy._textFormat = this._textFormat.copy();
		}
		if (this._attributes) {
			copy._attributes = this._attributes.copy();
		}

		return copy;
	}

	getSize() {
		return this._size;
	}

	setSize(size) {
		this._size = size;
	}

	getVisible() {
		return this._visible;
	}

	setVisible(visible) {
		this._visible = visible;
	}

	getOrCreateFormat() {
		if (this._format === undefined) {
			this._format = new CellFormatAttributes();
		}

		return this._format;
	}

	getFormat() {
		return this._format;
	}

	setFormat(format) {
		this._format = format;
	}

	getOrCreateAttributes() {
		if (this._attributes === undefined) {
			this._attributes = new CellAttributes();
		}

		return this._attributes;
	}

	getAttributes() {
		return this._attributes;
	}

	setAttributes(attributes) {
		this._attributes = attributes;
	}

	getOrCreateTextFormat() {
		if (this._textFormat === undefined) {
			this._textFormat = new CellTextFormatAttributes();
		}

		return this._textFormat;
	}

	getTextFormat() {
		return this._textFormat;
	}

	setTextFormat(format) {
		this._textFormat = format;
	}

	clearFormat() {
		this._format = undefined;
		this._textFormat = undefined;
		this._attributes = undefined;
	}

	save(writer, index) {
		writer.writeStartElement('section');
		writer.writeAttributeNumber('index', index, 0);

		if (this._title !== undefined) {
			writer.writeAttributeString('title', this._title);
		}

		writer.writeAttributeNumber('size', this._size, 0);
		writer.writeAttributeNumber('visible', this._visible ? 1 : 0);

		if (this._format) {
			this._format.saveCondensed(writer, 'f');
		}

		if (this._textFormat) {
			this._textFormat.saveCondensed(writer, 't');
		}

		if (this._attributes) {
			this._attributes.saveCondensed(writer, 'a');
		}

		// if (this._attributes) {
		// 	writer.writeStartElement('cell');
		// 	this._attributes.save(writer);
		// 	writer.writeEndElement();
		// }
		//
		// if (this._format) {
		// 	writer.writeStartElement('format');
		// 	this._format.save(writer);
		// 	writer.writeEndElement();
		// }
		// if (this._textFormat) {
		// 	writer.writeStartElement('textformat');
		// 	this._textFormat.save(writer);
		// 	writer.writeEndElement();
		// }

		writer.writeEndElement();
	}

	read(reader, object) {
		const ssize = reader.getAttribute(object, 'size');
		if (ssize !== undefined) {
			this._size = Number(ssize);
		}
		const visible = reader.getAttribute(object, 'visible');
		if (visible !== undefined) {
			this._visible = Number(visible) === 1;
		}

		const title = reader.getAttribute(object, 'title');
		if (title !== undefined) {
			this._title = title;
		}
		reader.iterateObjects(object, (name, child) => {
			switch (name) {
				case 'cell':
				case 'format':
				case 'textformat': {
					const attrObj = reader.getObject(child, 'al');
					if (attrObj === undefined) {
						break;
					}
					const attr = AttributeUtils.readAttribute(reader, 'al', attrObj);
					if (attr === undefined) {
						break;
					}
					const attrName = attr.getName();
					switch (attrName) {
						case 'cell':
							this.setAttributes(attr);
							break;
						case 'format':
							this.setFormat(attr);
							break;
						case 'textformat':
							this.setTextFormat(attr);
							break;
					}
					break;
				}
				case 'a': {
					const format = this.getOrCreateAttributes();
					format.readCondensed(reader, child);
					break;
				}
				case 'f': {
					const format = this.getOrCreateFormat();
					format.readCondensed(reader, child);
					break;
				}
				case 't': {
					const format = this.getOrCreateTextFormat();
					format.readCondensed(reader, child);
					break;
				}
			}
		});
	}

	set properties(data) {
		this._properties = data;
	}

	get properties() {
		return this._properties;
	}

	get textproperties() {
		return this._properties && this._properties.formats ? this._properties.formats.text : undefined;
	}

	get styleproperties() {
		return this._properties && this._properties.formats ? this._properties.formats.styles : undefined;
	}
	get attributes() {
		return this._properties ? this._properties.attributes : undefined;
	}
};
