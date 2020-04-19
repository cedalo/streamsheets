

module.exports = class ChartFormat {
	constructor(lineColor, fillColor, fontSize, fontStyle) {
		this.lineColor = lineColor;
		this.fillColor = fillColor;
		this.fontSize = fontSize;
		this.fontStyle = fontStyle;
	}

	get lineColor() {
		return this.line && this.line.color ? this.line.color : undefined;
	}

	set lineColor(value) {
		if (value === undefined) {
			return;
		}
		if (this.line === undefined) {
			this.line = {};
		}
		this.line.color = value;
	}

	get lineWidth() {
		return this.line && this.line.width !== undefined ? this.line.width : undefined;
	}

	set lineWidth(value) {
		if (value === undefined) {
			return;
		}
		if (this.line === undefined) {
			this.line = {};
		}
		this.line.width = Number(value);
	}

	get fillColor() {
		return this.fill && this.fill.color ? this.fill.color : undefined;
	}

	set fillColor(value) {
		if (value === undefined) {
			return;
		}
		if (this.fill === undefined) {
			this.fill = {};
		}
		this.fill.color = value;
	}

	get fontColor() {
		return this.font && this.font.color ? this.font.color : undefined;
	}

	set fontColor(value) {
		if (value === undefined) {
			return;
		}
		if (this.font === undefined) {
			this.font = {};
		}
		this.font.color = value;
	}

	get fontStyle() {
		return this.font && this.font.style !== undefined ? this.font.style : undefined;
	}

	set fontStyle(value) {
		if (value === undefined) {
			return;
		}
		if (this.font === undefined) {
			this.font = {};
		}
		this.font.style = Number(value);
	}

	get fontName() {
		return this.font && this.font.name ? this.font.name : undefined;
	}

	set fontName(value) {
		if (value === undefined) {
			return;
		}
		if (this.font === undefined) {
			this.font = {};
		}
		this.font.name = value;
	}

	get fontSize() {
		return this.font && this.font.size ? this.font.size : undefined;
	}

	set fontSize(value) {
		if (value === undefined) {
			return;
		}
		if (this.font === undefined) {
			this.font = {};
		}
		this.font.size = Number(value);
	}

	get numberFormat() {
		return this.font && this.font.number ? this.font.number : undefined;
	}

	set numberFormat(value) {
		if (this.font === undefined) {
			this.font = {};
		}
		this.font.number = value;
	}

	get localCulture() {
		return this.font && this.font.local ? this.font.local : undefined;
	}

	set localCulture(value) {
		if (this.font === undefined) {
			this.font = {};
		}
		this.font.local = value;
	}

	save(name, writer) {
		writer.writeStartElement(name);
		if (this.line) {
			writer.writeStartElement('line');
			if (this.lineColor) {
				writer.writeAttributeString('color', this.lineColor);
			}
			if (this.lineWidth !== undefined) {
				writer.writeAttributeNumber('width', this.lineWidth, 0);
			}
			writer.writeEndElement();
		}
		if (this.fill) {
			writer.writeStartElement('fill');
			if (this.fillColor) {
				writer.writeAttributeString('color', this.fillColor);
			}
			writer.writeEndElement();
		}
		if (this.font) {
			writer.writeStartElement('font');
			if (this.fontColor) {
				writer.writeAttributeString('color', this.fontColor);
			}
			if (this.fontName) {
				writer.writeAttributeString('name', this.fontName);
			}
			if (this.fontSize) {
				writer.writeAttributeNumber('size', this.fontSize, 0);
			}
			if (this.fontStyle !== undefined) {
				writer.writeAttributeNumber('style', this.fontStyle, 0);
			}
			if (this.numberFormat) {
				writer.writeAttributeString('number', this.numberFormat);
			}
			if (this.localCulture) {
				writer.writeAttributeString('local', this.localCulture);
			}
			writer.writeEndElement();
		}
		writer.writeEndElement();
	}

	read(reader, object) {
		reader.iterateObjects(object, (name, child) => {
			switch (name) {
			case 'line':
				this.line = {};
				this.lineWidth = reader.getAttribute(child, 'width');
				this.lineColor = reader.getAttribute(child, 'color');
				break;
			case 'fill':
				this.fill = {};
				this.fillColor = reader.getAttribute(child, 'color');
				break;
			case 'font':
				this.font = {};
				this.fontColor = reader.getAttribute(child, 'color');
				this.fontName = reader.getAttribute(child, 'name');
				this.fontSize = reader.getAttribute(child, 'size');
				this.fontStyle = reader.getAttribute(child, 'style');
				if (reader.getAttribute(child, 'number') !== undefined) {
					this.numberFormat = reader.getAttribute(child, 'number');
				}
				if (reader.getAttribute(child, 'local') !== undefined) {
					this.localCulture = reader.getAttribute(child, 'local');
				}
				break;
			}
		});
	}
};
