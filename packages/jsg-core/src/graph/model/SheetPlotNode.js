const { NumberFormatter } = require('@cedalo/number-format');

const JSG = require('../../JSG');
const GraphUtils = require('../GraphUtils');
const MathUtils = require('../../geometry/MathUtils');
const SheetReference = require('../expr/SheetReference');
const CellRange = require('./CellRange');
const Node = require('./Node');
const ItemAttributes = require('../attr/ItemAttributes');
const TextFormatAttributes = require('../attr/TextFormatAttributes');
const Expression = require('../expr/Expression');
const Numbers = require('../../commons/Numbers');
const JSONWriter = require('../../commons/JSONWriter');
const SetPlotDataCommand = require('../command/SetPlotDataCommand');
const CompoundCommand = require('../command/CompoundCommand');
const ChartFormat = require('./chart/ChartFormat');

const epsilon = 0.000000001;

const templates = {
	basic: {
		font: {
			name: 'Verdana',
			size: 8,
			color: '#000000'
		},
		title: {
			format: new ChartFormat('none', 'none', 14, TextFormatAttributes.FontStyle.BOLD),
		},
		plot: {
			format: new ChartFormat('none', '#FFFFFF'),
		},
		legend: {
			format: new ChartFormat('#CCCCCC', '#FFFFFF'),
		},
		axis: {
			format: new ChartFormat('#AAAAAA'),
		},
		series: {
			format: new ChartFormat(),
			linewidth: 50,
			fill: [
				'rgb(54, 162, 235)',
				'rgb(255, 99, 132)',
				'rgb(255, 206, 86)',
				'rgb(75, 192, 192)',
				'rgb(153, 102, 255)',
				'rgb(255, 159, 64)',
				'rgb(98,51,58)',
				'rgb(0,177,91)',
				'rgb(88,207,255)',
				'rgb(255,139,116)',
				'rgb(131,240,255)',
				'rgb(224,108,255)'
			],
			line: [
				'rgb(54, 162, 235)',
				'rgb(255,99,132)',
				'rgb(255, 206, 86)',
				'rgb(75, 192, 192)',
				'rgb(153, 102, 255)',
				'rgb(255, 159, 64)',
				'rgb(98,51,58)',
				'rgb(0,177,91)',
				'rgb(88,207,255)',
				'rgb(255,139,116)',
				'rgb(131,240,255)',
				'rgb(224,108,255)'
			]
		}
	}
};

class ChartSeries {
	constructor(type, formula) {
		this._stacked = false;
		this._relative = false;
		this.type = type;
		this.formula = formula;
		this.format = new ChartFormat();
		this.xAxis = 'primary';
		this.yAxis = 'primary';
	}

	set type(type) {
		switch(type) {
		case 'columnstacked':
			this._type = 'column';
			this._stacked = true;
			break;
		case 'columnstacked100':
			this._type = 'column';
			this._stacked = true;
			this._relative = true;
			break;
		default:
			this._type = type || 'line';
			break;
		}
	}

	get type() {
		return this._type;
	}

	get stacked() {
		return this._stacked;
	}

	set stacked(value) {
		if (value === undefined || value === 'false') {
			this._stacked = false;
		} else {
			this._stacked = !!Number(value);
		}
	}

	get relative() {
		return this._relative;
	}

	set relative(value) {
		this._relative = (value === undefined ? false : !!Number(value));
	}

	save(writer) {
		writer.writeStartElement('series');
		writer.writeAttributeString('type', this.type);
		writer.writeAttributeNumber('stacked', this.stacked ? 1 : 0);
		writer.writeAttributeNumber('relative', this.relative ? 1 : 0);
		writer.writeAttributeString('xaxis', this.xAxis);
		writer.writeAttributeString('yaxis', this.yAxis);
		this.formula.save('formula', writer);
		this.format.save('format', writer);
		writer.writeEndElement();
	}

	read(reader, object) {
		this.type = reader.getAttribute(object, 'type');
		this.stacked = reader.getAttribute(object, 'stacked');
		this.relative = reader.getAttribute(object, 'relative');
		this.xAxis =
			reader.getAttribute(object, 'xaxis') === undefined
				? 'primary'
				: reader.getAttribute(object, 'xaxis');
		this.yAxis =
			reader.getAttribute(object, 'yaxis') === undefined
				? 'primary'
				: reader.getAttribute(object, 'yaxis');

		reader.iterateObjects(object, (name, child) => {
			switch (name) {
			case 'formula':
				this.formula = new Expression(0);
				this.formula.read(reader, child);
				break;
			case 'format':
				this.format = new ChartFormat();
				this.format.read(reader, child);
				break;
			}
		});
	}
}

class ChartRect {
	constructor(left, top, right, bottom) {
		this.set(left, top, right, bottom);
	}

	reset() {
		this.left = 0;
		this.right = 0;
		this.top = 0;
		this.bottom = 0;
	}

	containsPoint(pt) {
		return pt.x >= this.left && pt.x <= this.right && pt.y >= this.top && pt.y <= this.bottom;
	}

	set(left, top, right, bottom) {
		this.left = left || 0;
		this.top = top || 0;
		this.right = right || 0;
		this.bottom = bottom || 0;
	}

	get width() {
		return this.right - this.left;
	}

	get height() {
		return this.bottom - this.top;
	}

	toString() {
		return `${this.left} ${this.top} ${this.right} ${this.bottom} `;
	}

	static fromString(str) {
		const rect = new ChartRect(0, 0, 0, 0);
		if (str !== undefined) {
			const parts = str.split(' ');
			if (parts.length === 4) {
				rect.left = Number(parts[0]);
				rect.top = Number(parts[1]);
				rect.right = Number(parts[2]);
				rect.bottom = Number(parts[3]);
			}
		}

		return rect;
	}
}

module.exports = class SheetPlotNode extends Node {
	constructor() {
		super();

		this.getFormat().setLineColor('#AAAAAA');
		this.getTextFormat().setFontSize(8);
		this.getItemAttributes().setPortMode(ItemAttributes.PortMode.NONE);

		this.series = [];
		this.chart = {
			margins: new ChartRect(200, 200, 200, 200)
		};
		this.xAxes = [
			{
				type: 'linear',
				align: 'bottom',
				formula: new Expression(0, 'AXIS()'),
				position: new ChartRect(),
				format: new ChartFormat(),
				size: 500,
				name: 'primary'
			}
		];
		this.yAxes = [
			{
				type: 'linear',
				align: 'left',
				formula: new Expression(0, 'AXIS()'),
				position: new ChartRect(),
				format: new ChartFormat(),
				size: 1000,
				name: 'primary'
			}
		];
		this.plot = {
			position: new ChartRect(),
			format: new ChartFormat(),
		};
		this.legend = {
			formula: new Expression('Legend', ''),
			position: new ChartRect(),
			format: new ChartFormat(),
			align: 'right'
		};
		this.title = {
			formula: new Expression('Chart', ''),
			position: new ChartRect(),
			format: new ChartFormat(),
			size: 700
		};
		this.series = [new ChartSeries('line', new Expression(0, 'SERIES(B1,A2:A10,B2:B10)'))];
	}

	getExpressionValue(expr) {
		if (expr === undefined) {
			return '';
		}

		const term = expr.getTerm();
		if (term) {
			const { operand } = term;

			if (operand instanceof SheetReference) {
				const range = operand._range.copy();
				range.shiftFromSheet();
				const cell = range._worksheet.getDataProvider().getRC(range._x1, range._y1);
				return cell ? cell.getValue() : '';
			}
		}

		return expr.getValue();
	}

	setFont(graphics, format, id, vertical, horizontal) {
		const fontColor = format.fontColor || this.getTemplate('basic')[id].format.fontColor || this.getTemplate('basic').font.color;
		const fontName = format.fontName || this.getTemplate('basic')[id].format.fontName || this.getTemplate('basic').font.name;
		const fontSize = format.fontSize || this.getTemplate('basic')[id].format.fontSize || this.getTemplate('basic').font.size;
		const fontStyle = format.fontStyle === undefined ? this.getTemplate('basic')[id].format.fontStyle : format.fontStyle;

		graphics.setTextBaseline(vertical);
		graphics.setFillColor(fontColor);
		graphics.setTextAlignment(horizontal);
		graphics.setFontName(fontName);
		graphics.setFontSize(fontSize);
		graphics.setFontStyle(fontStyle === undefined ? 0 : fontStyle);
		graphics.setFont();
	}

	resetFont(graphics) {
		graphics.setFontName('Verdana');
		graphics.setFontSize(8);
		graphics.setFontStyle(0);
		graphics.setFont();
	}

	formatNumber(value, format) {
		// somehow the scale value sometimes does not show correct values
		value = MathUtils.roundTo(value, 12);
		if (format && format.numberFormat && format.numberFormat !== 'General' && format.localCulture) {
			let formattingResult = {
				value,
				formattedValue: value,
				color: undefined,
				type: 'general'
			};
			const type = format.localCulture.split(';');
			try {
				formattingResult = NumberFormatter.formatNumber(format.numberFormat, formattingResult.value, type[0]);
			} catch (e) {
				formattingResult.formattedValue = '#####';
			}

			return formattingResult.formattedValue;
		}
		return String(value);
	}

	measureText(graphics, cs, format, id, text) {
		const name = format.fontName || this.getTemplate('basic')[id].format.fontName || this.getTemplate('basic').font.name;
		const size = format.fontSize || this.getTemplate('basic')[id].format.fontSize || this.getTemplate('basic').font.size;

		return {
			width: cs.deviceToLogX(graphics.measureText(text).width),
			height: GraphUtils.getFontMetricsEx(name, size).lineheight
		}
	}

	measureAxis(graphics, axis) {
		const result = {
			width: 0,
			height: 0
		};

		if (!axis.position || !axis.scale) {
			return result;
		}

		this.setFont(graphics, axis.format, 'axis', 'middle', TextFormatAttributes.TextAlignment.CENTER);

		const cs = graphics.getCoordinateSystem();
		let current = axis.scale.min;
		let pos;
		let text;

		if (axis.type === 'time') {
			current = this.incrementScale(axis, current - 0.0000001);
		}

		let refLabel;
		if (axis.type === 'category') {
			this.series.forEach((series, index) => {
				if (series.xAxis === axis.name) {
					refLabel = this.getDataSourceInfo(series.formula);
				}
			});
		}

		while (current <= axis.scale.max) {
			if (axis.type === 'category' && current >= axis.scale.max) {
				break;
			}

			pos = this.scaleToAxis(axis, current, true);

			if (axis.type === 'category' && refLabel) {
				text = this.getLabel(refLabel, Math.floor(current));
				if (text === undefined) {
					text = current;
				}
			} else {
				text = this.formatNumber(current, axis.format && axis.format.numberFormat ? axis.format : axis.scale.format);
			}

			const size = this.measureText(graphics, cs, axis.format, 'axis', text);
			result.width = Math.max(result.width, size.width);
			result.height = Math.max(result.height, size.height);

			current = this.incrementScale(axis, current);
		}

		return result;
	}

	layout() {
		const size = this.getSize().toPoint();
		const cs = JSG.graphics.getCoordinateSystem();

		this.setMinMax();
		this.setScales();

		this.plot.position.left = this.chart.margins.left;
		this.plot.position.top = this.chart.margins.top;
		this.plot.position.bottom = size.y - this.chart.margins.bottom;
		this.plot.position.right = size.x - this.chart.margins.right;

		const title = String(this.getExpressionValue(this.title.formula));
		if (title.length) {
			this.plot.position.top += this.title.size;
			this.title.position.top = this.chart.margins.top;
			this.title.position.left = this.chart.margins.left;
			this.title.position.right = size.x - this.chart.margins.right;
			if (JSG.graphics) {
				this.setFont(JSG.graphics, this.title.format, 'title', 'middle', TextFormatAttributes.TextAlignment.CENTER);
				const textSize = this.measureText(JSG.graphics, cs, this.title.format, 'title', title);
				textSize.width += 300;
				this.title.position.left = size.x / 2 - textSize.width / 2;
				this.title.position.right = size.x / 2 + textSize.width / 2;
				this.title.size = textSize.height + 300;
				this.title.position.bottom = this.chart.margins.top + this.title.size;
				this.plot.position.top = this.title.position.bottom + 200;
			}
		} else {
			this.title.position.reset();
		}

		const legend = this.getLegend();
		if (legend.length) {
			const margin = 200;
			this.setFont(JSG.graphics, this.legend.format, 'legend', 'middle', TextFormatAttributes.TextAlignment.CENTER);
			let width = 0;
			let textSize;
			legend.forEach((entry) => {
				textSize = this.measureText(JSG.graphics, cs, this.legend.format, 'legend', String(entry.name));
				width = Math.max(textSize.width + 300, width);
			});
			width += margin * 6;
			this.plot.position.right -= (width + margin);
			this.legend.position.left = this.plot.position.right + margin;
			this.legend.position.right = size.x - this.chart.margins.right;
			this.legend.position.top = this.plot.position.top;
			this.legend.position.bottom = this.plot.position.top + legend.length * (textSize.height) + margin * 2;
		}

		this.xAxes.forEach((axis) => {
			axis.size = this.measureAxis(JSG.graphics, axis).height + 300;
			switch (axis.align) {
			case 'top':
				this.plot.position.top += axis.size;
				break;
			case 'bottom':
				this.plot.position.bottom -= axis.size;
				break;
			}
		});

		this.yAxes.forEach((axis) => {
			axis.size = this.measureAxis(JSG.graphics, axis).width + 300;
			switch (axis.align) {
			case 'left':
				this.plot.position.left += axis.size;
				break;
			case 'right':
				this.plot.position.right -= axis.size;
				break;
			}
		});

		this.xAxes.forEach((axis) => {
			if (axis.position) {
				Object.assign(axis.position, this.plot.position);
				switch (axis.align) {
				case 'top':
					axis.position.top = this.plot.position.top - axis.size;
					axis.position.bottom = this.plot.position.top;
					break;
				case 'bottom':
					axis.position.top = this.plot.position.bottom;
					axis.position.bottom = axis.position.top + axis.size;
					break;
				}
			}
		});

		this.yAxes.forEach((axis) => {
			if (axis.position) {
				Object.assign(axis.position, this.plot.position);
				switch (axis.align) {
				case 'left':
					axis.position.left = this.plot.position.left - axis.size;
					axis.position.right = this.plot.position.left;
					break;
				case 'right':
					axis.position.left = this.plot.position.right;
					axis.position.right = this.plot.position.right + axis.size;
					break;
				}
			}
		});

		super.layout();
	}

	getParamInfo(term, index) {
		if (term && term.params && term.params.length > index) {
			const { operand } = term.params[index];
			if (operand instanceof SheetReference) {
				const range = operand._range.copy();
				range.shiftFromSheet();
				return { sheet: operand._item, range };
			}
		}
		return undefined;
	}

	getParamValue(term, index, type = 'string') {
		const info = this.getParamInfo(term, index);
		if (info) {
			const cell = info.sheet.getDataProvider().getRC(info.range._x1, info.range._y1);
			return cell ? cell.getValue() : undefined;
		}
		if (term && term.params && term.params.length > index) {
			const value = term.params[index].value;
			if (value !== null && value !== undefined) {
				return type === 'string' ? term.params[index].value : Number(term.params[index].value);
			}
		}
		return undefined;
	}

	getParamFormat(term, index) {
		const info = this.getParamInfo(term, index);
		if (info) {
			const tf = info.sheet.getTextFormatAtRC(info.range._x1, info.range._y1);
			return {
				localCulture: tf
					.getLocalCulture()
					.getValue()
					.toString(),
				numberFormat: tf.getNumberFormat().getValue()
			};
		}
		return undefined;
	}

	isTimeAggregateCell(cell) {
		const expr = cell ? cell.getExpression() : undefined;
		if (expr === undefined) {
			return undefined;
		}
		const formula = expr.getFormula();

		if (formula && (formula.indexOf('TIMEAGGREGATE') !== -1 || formula.indexOf('INFLUX.SELECT') !== -1)) {
			return cell;
		}

		return undefined;
	}

	isTimeAggregateRange(sheet, range) {
		if (range.getWidth() !== 1 || range.getHeight() !== 1) {
			return undefined;
		}
		const cell = sheet.getDataProvider().getRC(range._x1, range._y1);
		return this.isTimeAggregateCell(cell);
	}

	getDataSourceInfo(ds) {
		const ret = {
			name: this.getParamValue(ds.getTerm(), 0, 'string'),
			x: this.getParamInfo(ds.getTerm(), 1),
			y: this.getParamInfo(ds.getTerm(), 2)
		};
		ret.xTime = ret.x ? this.isTimeAggregateRange(ret.x.sheet, ret.x.range) : false;
		ret.yTime = ret.y ? this.isTimeAggregateRange(ret.y.sheet, ret.y.range) : false;

		if (ret.xTime && !ret.yTime) {
			// get influx key
			ret.yKey = this.getParamValue(ds.getTerm(), 2, 'string');
		}

		return ret;
	}

	getLegend() {
		const legend = [];
		this.series.forEach((series, index) => {
			const ref = this.getDataSourceInfo(series.formula);
			if (ref && ref.name !== undefined) {
				legend.push({
					name: ref.name,
					series
				});
			}
		});

		return legend;
	}

	setScales() {
		const fill = (axis, size, direction) => {
			if (!axis) {
				return;
			}
			const { formula } = axis;
			const term = formula.getTerm();
			const result = {
				min: this.getParamValue(term, 0),
				max: this.getParamValue(term, 1),
				step: this.getParamValue(term, 2),
				minZoom: this.getParamValue(term, 4),
				maxZoom: this.getParamValue(term, 5)
			};

			result.format = this.getParamFormat(term, 0);

			if (result.minZoom !== undefined) {
				result.min = result.minZoom;
			}
			if (result.maxZoom !== undefined) {
				result.max = result.maxZoom;
			}

			this.autoScale(axis, result, size, direction);

			axis.scale = result;
		};

		this.xAxes.forEach((axis) => {
			fill(axis, this.plot.position.width, 'x');
		});
		this.yAxes.forEach((axis) => {
			fill(axis, this.plot.position.height, 'y');
		});
	}

	getAxes(series) {
		let xAxis;
		let yAxis;

		if (series === undefined) {
			xAxis = this.xAxes[0];
			yAxis = this.yAxes[0];
		} else {
			let result = this.xAxes.filter((axis) => axis.name === series.xAxis);
			xAxis = result.length ? result[0] : this.xAxes[0];
			result = this.yAxes.filter((axis) => axis.name === series.yAxis);
			yAxis = result.length ? result[0] : this.yAxes[0];
		}

		return {
			x: xAxis,
			y: yAxis
		};
	}

	setMinMax() {
		let xMin = Number.MAX_VALUE;
		let xMax = -Number.MAX_VALUE;
		let yMin = Number.MAX_VALUE;
		let yMax = -Number.MAX_VALUE;
		let valid = false;

		if (!this.xAxes.length || !this.yAxes.length) {
			return;
		}

		// evaluate min/max for series
		this.series.forEach((series, index) => {
			const ref = this.getDataSourceInfo(series.formula);
			const axes = this.getAxes(series);
			if (index === 0) {
				axes.x.categories = [];
			}
			if (ref) {
				let pointIndex = 0;
				const value = {};

				while (this.getValue(ref, pointIndex, value)) {
					if (Numbers.isNumber(value.x)) {
						xMin = Math.min(value.x, xMin);
						xMax = Math.max(value.x, xMax);
					}
					if (Numbers.isNumber(value.y)) {
						yMin = Math.min(value.y, yMin);
						yMax = Math.max(value.y, yMax);
					}
					if (!axes.x.categories[pointIndex]) {
						axes.x.categories[pointIndex] = {
							values: [],
							pos: 0,
							neg: 0
						};
					}
					axes.x.categories[pointIndex].values[index] = {
						x: value.x,
						y: value.y,
						axes,
						series,
						seriesIndex: index,
					};
					pointIndex += 1;
					valid = true;
				}
				if (series.stacked) {
					axes.x.categories.forEach((category) => {
						if (category.values) {
							let pos = 0;
							let neg = 0;
							category.values.forEach((values) => {
								if (Numbers.isNumber(values.y)) {
									if (values.y > 0) {
										pos += values.y;
									} else {
										neg += values.y;
									}
								}
							});
							category.pos = pos;
							category.neg = neg;
							yMax = Math.max(yMax, pos);
							yMin = Math.min(yMin, neg);
						}
					});
				}
				if (!valid) {
					// TODO different values for category axis
					xMin = 0;
					xMax = 100;
					yMin = 0;
					yMax = 100;
				}

				series.xMin = Numbers.isNumber(xMin) ? xMin : 0;
				series.xMax = Numbers.isNumber(xMax) ? xMax : 100;
				series.yMin = Numbers.isNumber(yMin) ? yMin : 0;
				series.yMax = Numbers.isNumber(yMax) ? yMax : 100;
				series.valueCount = pointIndex;
			} else {
				series.xMin = 0;
				series.xMax = 100;
				series.yMin = 0;
				series.yMax = 100;
				series.valueCount = 0;
			}
		});

		this.xAxes.forEach((axis) => {
			axis.minData = Number.MAX_VALUE;
			axis.maxData = -Number.MAX_VALUE;
			this.series.forEach((series, index) => {
				if (series.xAxis === axis.name) {
					axis.minData = Math.min(series.xMin, axis.minData);
					axis.maxData = Math.max(series.xMax, axis.maxData);
				}
			});
			axis.scale = undefined;
		});

		this.yAxes.forEach((axis) => {
			axis.minData = Number.MAX_VALUE;
			axis.maxData = -Number.MAX_VALUE;
			this.series.forEach((series, index) => {
				if (series.yAxis === axis.name) {
					axis.minData = Math.min(series.yMin, axis.minData);
					axis.maxData = Math.max(series.yMax, axis.maxData);
				}
			});
			axis.scale = undefined;
		});
	}

	autoScale(axis, input, size, direction) {
		let stepCount;
		let m;
		let diff;
		let potMin;
		let potMax;
		let distLin;
		let minLabel;
		let maxLabel;
		let min = axis.minData;
		let max = axis.maxData;

		switch (axis.type) {
		case 'category':
			input.min = min;
			input.max = max + 1;
			input.step = 1;
			break;
		case 'logarithmic':
			if (min <= 0.0) {
				min = 0.1;
			}
			if (max <= 0.0) {
				max = 1;
			}
			if (min >= 1.0) {
				potMin = Numbers.digitsBefore(min) - 1;
				minLabel = 10.0 ** potMin;
			} else if (min <= -Number.MAX_VALUE) {
				if (max > 0) {
					min = max / 1000;
				} else {
					min = 0.000001;
				}
				potMin = Math.floor(min);
				potMin = -Numbers.digitsBehind(min);
				if (potMin > Math.floor(Math.log10(Number.MAX_VALUE))) {
					minLabel = min;
				} else {
					minLabel = 10.0 ** potMin;
				}
			} else {
				potMin = -Numbers.digitsBehind(min);
				if (potMin > Math.floor(Math.log10(Number.MAX_VALUE))) {
					minLabel = min;
				} else {
					minLabel = 10.0 ** potMin;
				}
			}

			if (max >= 1.0) {
				potMax = Numbers.digitsBefore(max);
			} else {
				potMax = -Numbers.digitsBehind(max) + 1;
			}

			if (potMax > Math.floor(Math.log10(Number.MAX_VALUE))) {
				maxLabel = max;
			} else {
				maxLabel = 10 ** potMax;
			}

			if (input.min === undefined) {
				input.min = minLabel;
			}
			if (input.min !== undefined && input.min < epsilon) {
				input.min = 1.0;
			}
			if (input.max === undefined) {
				input.max = maxLabel;
			}
			if (input.max - input.min < epsilon) {
				input.max += 1.0; // sicher ist sicher
			}
			break;
		case 'time':
			if (direction === 'x') {
				stepCount = Math.min(13, size / 1500);
			} else {
				// dTmp = (double)m_TickLabels.GetFont().GetSize() / 72 * 2540 * 2.0;
				stepCount = Math.min(13, size / 1300);
			}

			stepCount = Math.max(1, Math.floor(stepCount));

			if (input.min === undefined) {
				input.min = min;
			}
			if (input.max === undefined) {
				input.max = max;
			}

			if (input.min >= input.max) {
				if (input.min < 0.0) {
					input.max = input.min * 0.9 + 0.15;
				} else {
					input.max = input.max * 1.1 + 0.15;
				}
			}

			diff = (input.max - input.min) / stepCount;

			if (input.step === undefined) {
				let timeStep;
				let step;
				let format = {
					localCulture: `time;en`,
					numberFormat: 'h:mm:ss',
				};
				if (diff > 90) {
					timeStep = 'year';
					step = Math.floor(Math.max(1, diff / 300));
					format = {
						localCulture: `date;en`,
						numberFormat: 'dd\\.MM\\.yy',
					};
				} else if (diff > 30) {				// from 300 to 450
					timeStep = 'quarter';
					step = 1;
					format = {
						localCulture: `date;en`,
						numberFormat: 'dd\\.MM\\.yy',
					};
				} else if (diff > 7) {				// from 70 to 300
					timeStep = 'month';
					step = 1;
					format = {
						localCulture: `date;en`,
						numberFormat: 'dd\\.MM\\.yy',
					};
				} else if (diff > 3) {				// from 10 to 70
					timeStep = 'week';
					step = 1;
					format = {
						localCulture: `date;en`,
						numberFormat: 'dd\\.MM\\.yy',
					};
				} else if (diff > 0.5) {					// from 1 to 10
					timeStep = 'day';
					if (diff < 1) {
						step = 1;
					} else if (diff < 2) {
						step = 2;
					} else {
						step = 5;
					}
					format = {
						localCulture: `date;en`,
						numberFormat: 'dd\\.MM\\.yy',
					};
				} else if (diff > 2700 / 86400) {
					timeStep = 'hour';
					if (diff < 3600 / 86400) {
						step = 1;
					} else if (diff < 7200 / 86400) {
						step = 2;
					} else if (diff < 21600 / 86400) {
						step = 6;
					} else {
						step = 12;
					}
				} else if (diff > 45 / 86400) {
					timeStep = 'minute';
					step = 1;
					if (diff < 60 / 86400) {
						step = 1;
					} else if (diff < 120 / 86400) {
						step = 2;
					} else if (diff < 300 / 86400) {
						step = 5;
					} else if (diff < 600 / 86400) {
						step = 10;
					} else {
						step = 30;
					}
				} else if (diff > 0.3 / 86000) {
					timeStep = 'second';
					if (diff < 1 / 86400) {
						step = 1;
					} else if (diff < 2 / 86400) {
						step = 2;
					} else if (diff < 5 / 86400) {
						step = 5;
					} else if (diff < 10 / 86400) {
						step = 10;
					} else {
						step = 30;
					}
				} else {
					timeStep = 'millisecond';
					if (diff < 0.05 / 86400) {
						step = 100;
					} else {
						step = 500;
					}
					format = {
						localCulture: `time;en`,
						numberFormat: 'h:mm:ss.000',
					};
				}
				input.step = step;
				input.timeStep = timeStep;
				input.format = format;
			}

			input.step = Math.max(input.step, epsilon * 10);

			// while (input.step * 1000 < input.max - input.min) {
			// 	input.step *= 10;
			// }
			break;
		case 'linear':
			/* Durch vergrößern dieser Zahl verfeinert     */
			/* sich das im Automatikmode generierte Raster */
			stepCount = 8; /* 11 => sehr fein      */

			if (direction === 'x') {
				stepCount = Math.min(13, size / 1500);
			} else {
				// dTmp = (double)m_TickLabels.GetFont().GetSize() / 72 * 2540 * 2.0;
				stepCount = Math.min(13, size / 1300);
			}

			stepCount = Math.max(1, stepCount);
			//        if(m_fMinimumScaleIsAuto && min > 0.0) min = 0.0;
			if (input.max === undefined && input.maxData < 0.0) {
				max = 0;
			}
			if (max - min > max * 0.15 && axis.type !== 'time' && min > 0) {
				min = 0;
			}
			if (input.min !== undefined) {
				min = input.min;
			}
			if (input.max !== undefined) {
				max = input.max;
			}

			if (max > min) {
				diff = max - min;

				distLin = diff / stepCount;
				// den Abstand auf eine Zahl zwischen 1 und 10 bringen
				if (distLin >= 1) {
					m = Numbers.digitsBefore(distLin) - 1;
				} else {
					m = -Numbers.digitsBehind(distLin);
				}
				distLin /= 10 ** m;
				// 1, 2 oder 5 zuweisen
				if (distLin > 5) {
					distLin = 10; // von 5.0
				} else if (distLin > 2) {
					distLin = 5; // von 5.0
				} else if (distLin > 1) {
					distLin = 2;
				} else {
					distLin = 1;
				}
				// das ist jetzt der normierte Abstand
				distLin *= 10 ** m;
			} else {
				distLin = 1;
			}
			// MinWert der Beschriftung ermitteln
			if (input.min === undefined) {
				// if value range is small...
				minLabel = min / distLin;
				minLabel = Math.floor(minLabel);
				minLabel *= distLin;
				if (min < 0.0 && minLabel >= min - 3) {
					minLabel -= distLin;
				}
			} else {
				minLabel = input.min;
			}
			// MaxWert der Beschriftung ermitteln
			if (input.max === undefined) {
				maxLabel = max / distLin;
				if (Math.abs(maxLabel % 1) > epsilon) {
					maxLabel = Math.ceil(maxLabel);
				}
				maxLabel = maxLabel * distLin;
				if (max > 0 && maxLabel <= max + 3) {
					maxLabel += distLin;
				}
			} else {
				maxLabel = input.max;
			}

			if (input.min === undefined) {
				input.min = minLabel;
			}
			if (input.max === undefined) {
				input.max = maxLabel;
			}

			if (input.min >= input.max) {
				if (input.min < 0.0) {
					input.max = input.min * 0.9 + 0.15;
				} else {
					input.max = input.max * 1.1 + 0.15;
				}
			}

			if (input.step === undefined) {
				input.step = distLin;
			}

			input.step = Math.max(input.step, epsilon * 10);

			while (input.step * 1000 < input.max - input.min) {
				input.step *= 10;
			}

			// if (nDist < 1) {
			// 	nDist = 1;
			// }
			// if (m_fMinorUnitIsAuto) {
			// 	m_minorUnit = m_dMajorUnit / nDist;
			// }
			//
			// m_minorUnit = max(m_minorUnit, ctEpsilon * 10);
			// while (m_minorUnit * 1000 < m_maximumScale - m_minimumScale) {
			// 	m_minorUnit *= 10;
			// }
			break;
		}
	}

	getLabel(ref, index) {
		let label;

		if (ref.xTime) {
			return undefined;
		} else if (ref.x) {
			const vertical = ref.x.range.getWidth() === 1;
			if (vertical) {
				if (index <= ref.x.range._y2 - ref.x.range._y1) {
					const cell = ref.x.sheet
						.getDataProvider()
						.getRC(ref.x.range._x1, ref.x.range._y1 + index);
					if (cell) {
						label = cell.getValue();
					}
				}
			} else if (index <= ref.x.range._x2 - ref.x.range._x1) {
				const cell = ref.x.sheet
					.getDataProvider()
					.getRC(ref.x.range._x1 + index, ref.x.range._y1);
				if (cell) {
					label = cell.getValue();
				}
			}
		} else {
			label = index;
		}

		return label;
	}

	getValue(ref, index, value) {
		value.x = undefined;
		value.y = 0;

		if (!this.xAxes.length || !this.yAxes.length) {
			return false;
		}

		if (this.xAxes[0].type === 'category') {
			value.x = index;
		} else if (ref.xTime) {
			const values = ref.xTime.getValues();
			if (values) {
				if (values.time) {
					if (values.time.length > index) {
						value.x = values.time[index];
					}
				} else if (values.length > index) {
					value.x = values[index].key;
				}
			}
		} else if (ref.x) {
			const vertical = ref.x.range.getWidth() === 1;
			if (vertical) {
				if (index <= ref.x.range._y2 - ref.x.range._y1) {
					const cell = ref.x.sheet
						.getDataProvider()
						.getRC(ref.x.range._x1, ref.x.range._y1 + index);
					if (cell) {
						value.x = cell.getValue();
						if (!Numbers.isNumber(value.x)) {
							value.x = 0;
						}
					}
				}
			} else if (index <= ref.x.range._x2 - ref.x.range._x1) {
				const cell = ref.x.sheet
					.getDataProvider()
					.getRC(ref.x.range._x1 + index, ref.x.range._y1);
				if (cell) {
					value.x = cell.getValue();
					if (!Numbers.isNumber(value.x)) {
						value.x = 0;
					}
				}
			}
		} else {
			value.x = index;
		}

		if (ref.yTime) {
			const values = ref.yTime.getValues();
			if (values) {
				if (values.time) {
					if (values.time.length > index) {
						value.y = values.v1[index];
						return true;
					}
				} else if (values.length > index) {
					value.y = values[index].value;
					return true;
				}
			}
		} else if (ref.xTime) {
			const values = ref.xTime.getValues();
			if (values && values.time && values.time.length > index && values[ref.yKey]) {
				value.y = values[ref.yKey][index];
				return true;
			}
		} else if (ref.y) {
			const vertical = ref.y.range.getWidth() === 1;
			if (vertical) {
				if (index <= ref.y.range._y2 - ref.y.range._y1) {
					const cell = ref.y.sheet
						.getDataProvider()
						.getRC(ref.y.range._x1, ref.y.range._y1 + index);
					if (cell) {
						value.y = cell.getValue();
						if (!Numbers.isNumber(value.y)) {
							value.y = 0;
						}
					}
					return true;
				}
			} else if (index <= ref.y.range._x2 - ref.y.range._x1) {
				const cell = ref.y.sheet
					.getDataProvider()
					.getRC(ref.y.range._x1 + index, ref.y.range._y1);
				if (cell) {
					value.y = cell.getValue();
					if (!Numbers.isNumber(value.y)) {
						value.y = 0;
					}
				}
				return true;
			}
		}

		return false;
	}

	scaleToAxis(axis, value, grid) {

		switch (axis.type) {
		case 'category':
			if (!grid) {
				value += 0.5;
			}
			value = (value - axis.scale.min) / (axis.scale.max - axis.scale.min);
			break;
		case 'linear':
			value = (value - axis.scale.min) / (axis.scale.max - axis.scale.min);
			break;
		default:
			value = (value - axis.scale.min) / (axis.scale.max - axis.scale.min);
			break;
		}

		return value;
	}

	scaleSizeToAxis(axis, value) {
		return value / (axis.scale.max - axis.scale.min);
	}

	scaleFromAxis(axes, point) {
		point.x -= this.plot.position.left;
		point.y = this.plot.position.bottom - point.y;

		return {
			x: axes.x.scale.min + (point.x / (this.plot.position.right - this.plot.position.left)) * (axes.x.scale.max - axes.x.scale.min),
			y: axes.y.scale.min + (point.y / (this.plot.position.bottom - this.plot.position.top)) * (axes.y.scale.max - axes.y.scale.min)
		};
	}

	incrementScale(axis, value) {
		let result;

		switch (axis.type) {
		case 'time':
			switch (axis.scale.timeStep) {
			case 'year': {
				const date = MathUtils.excelDateToJSDate(value);
				date.setDate(1);
				date.setMonth(0);
				date.setFullYear(date.getFullYear() + axis.scale.step);
				result = Math.floor(MathUtils.JSDateToExcelDate(date));
				break;
			}
			case 'quarter': {
				const date = MathUtils.excelDateToJSDate(value);
				date.setDate(1);
				date.setMonth(date.getMonth() - (date.getMonth() % 3) + axis.scale.step * 3);
				result = Math.floor(MathUtils.JSDateToExcelDate(date));
				break;
			}
			case 'month': {
				const date = MathUtils.excelDateToJSDate(value);
				date.setDate(1);
				date.setMonth(date.getMonth() + axis.scale.step);
				result = Math.floor(MathUtils.JSDateToExcelDate(date));
				break;
			}
			case 'week': {
				const date = MathUtils.excelDateToJSDate(value);
				const day = date.getDay();
				if (day) {
					value += 7 - day;
				} else {
					value += 7 * axis.scale.step;
				}
				result = Math.floor(value);
				break;
			}
			case 'day':
				result = Math.floor(value) + axis.scale.step;
				break;
			case 'hour': {
				const date = MathUtils.excelDateToJSDate(value);
				const h = date.getHours();
				if (h % axis.scale.step) {
					date.setHours(h + (axis.scale.step - (h % axis.scale.step)));
				} else {
					date.setHours(h + axis.scale.step);
				}
				date.setMinutes(0);
				date.setSeconds(0);
				date.setMilliseconds(0);
				result = MathUtils.JSDateToExcelDate(date);
				break;
			}
			case 'minute': {
				const date = MathUtils.excelDateToJSDate(value);
				const m = date.getMinutes();
				if (m % axis.scale.step) {
					date.setMinutes(m + (axis.scale.step - (m % axis.scale.step)));
				} else {
					date.setMinutes(m + axis.scale.step);
				}
				date.setSeconds(0);
				date.setMilliseconds(0);
				result = MathUtils.JSDateToExcelDate(date);
				break;
			}
			case 'second': {
				const date = MathUtils.excelDateToJSDate(value);
				const s = date.getSeconds();
				if (s % axis.scale.step) {
					date.setSeconds(s + (axis.scale.step - (s % axis.scale.step)));
				} else {
					date.setSeconds(s + axis.scale.step);
				}
				date.setMilliseconds(0);
				result = MathUtils.JSDateToExcelDate(date);
				break;
			}
			case 'millisecond': {
				const date = MathUtils.excelDateToJSDate(value);
				const ms = date.getMilliseconds();
				if (ms % axis.scale.step) {
					date.setMilliseconds(ms + (axis.scale.step - (ms % axis.scale.step)));
				} else {
					date.setMilliseconds(ms + axis.scale.step);
				}
				result = MathUtils.JSDateToExcelDate(date);
				break;
			}
			default:
				result = value + 1;
				break;
			}
			break;
		default:
			result = MathUtils.roundTo(value + axis.scale.step, 12);
			break;
		}
		return result;
	}

	getDataFromSelection(selection) {
		switch (selection.element) {
		case 'series':
			return this.series[selection.index];
		case 'xAxis':
			return this.xAxes[selection.index];
		case 'yAxis':
			return this.yAxes[selection.index];
		case 'title':
			return this.title;
		case 'legend':
			return this.legend;
		case 'plot':
			return this.plot;
		default:
			break;
		}
		return undefined;
	}

	isElementHit(pt) {
		let result;
		const dataPoints = [];
		let dataIndex = 0;

		if (this.title.position.containsPoint(pt)) {
			return {
				element: 'title',
				data: this.title
			};
		}

		if (this.legend.position.containsPoint(pt)) {
			return {
				element: 'legend',
				data: this.legend
			};
		}

		if (this.plot.position.containsPoint(pt)) {
			result = this.series.filter((series, index) => {
				const ref = this.getDataSourceInfo(series.formula);
				const dataRect = new ChartRect();
				const plotRect = this.plot.position;
				if (ref) {
					const axes = this.getAxes(series);
					let pointIndex = 0;
					let x;
					let y;
					const value = {};

					while (this.getValue(ref, pointIndex, value)) {
						x = this.scaleToAxis(axes.x, value.x, false);
						y = this.scaleToAxis(axes.y, value.y, false);
						dataRect.set(
							plotRect.left + x * plotRect.width - 200,
							plotRect.bottom - y * plotRect.height - 200,
							plotRect.left + x * plotRect.width + 200,
							plotRect.bottom - y * plotRect.height + 200
						);
						if (dataRect.containsPoint(pt)) {
							value.axes = axes;
							value.series = series;
							value.seriesIndex = index;
							dataPoints.push(value);
							dataIndex = index;
							return true;
						}
						pointIndex += 1;
					}
				}
				return false;
			});
			if (result.length) {
				return {
					element: 'series',
					index: dataIndex,
					data: result[0],
					dataPoints
				};
			}
		}

		result = this.xAxes.filter((axis) => axis.position.containsPoint(pt));
		if (result.length) {
			return {
				element: 'xAxis',
				index: this.xAxes.indexOf(result[0]),
				data: result[0]
			};
		}

		result = this.yAxes.filter((axis) => axis.position.containsPoint(pt));
		if (result.length) {
			return {
				element: 'yAxis',
				index: this.yAxes.indexOf(result[0]),
				data: result[0]
			};
		}

		if (this.plot.position.containsPoint(pt)) {
			return {
				element: 'plot',
				data: this.plot
			};
		}

		return undefined;
	}

	createSeriesFromSelection(viewer, sheet, selection, type) {
		if (!selection.hasSelection()) {
			return;
		}

		const range = selection.getAt(0);
		const width = range.getWidth();
		const height = range.getHeight();
		const data = range.getSheet().getDataProvider();
		let time = true;
		let formula;
		const cmp = new CompoundCommand();

		this.series = [];

		const cmdAxis = this.prepareCommand('axes');
		switch (type) {
		case 'columnstacked100':
		case 'columnstacked':
		case 'column':
		case 'line':
			this.xAxes[0].type = 'category';
			break;
		case 'scatter':
			this.xAxes[0].type = 'linear';
			break;
		}
		// check for TIMEAGGREGATES and INFLUX.SELECT
		if (width <= 2 || height <= 2) {
			const taRange = range.copy();
			if (width === 2) {
				taRange._x1 += 1;
			} else if (height === 2) {
				taRange._y1 += 1;
			}
			taRange.enumerateCells(true, (pos) => {
				const cell = data.get(pos);
				if (!this.isTimeAggregateCell(cell)) {
					time = false;
				}
			});
			if (time) {
				const cmd = this.prepareCommand('series');
				let index = 0;
				taRange.enumerateCells(true, (pos) => {
					const cell = data.get(pos);
					const expr = cell.getExpression();
					const values = cell.getValues();
					if (expr && values && values.time) {
						const source = new CellRange(taRange.getSheet(), pos.x, pos.y);
						source.shiftToSheet();
						const ref = source.toString({item: sheet, useName: true});
						Object.keys(values).forEach((key) => {
							if (key !== 'time') {
								if (values[key].length && Numbers.isNumber(values[key][0])) {
									formula = new Expression(0, `SERIES("${key}",${ref},"${key}")`);
									this.series.push(new ChartSeries(type, formula));
									index += 1;
								}
							}
						});
					} else {
						const source = new CellRange(taRange.getSheet(), pos.x, pos.y);
						source.shiftToSheet();
						const ref = source.toString({item: sheet, useName: true});
						if (width === 2) {
							const rangeName = source.copy();
							rangeName._x1 -= 1;
							rangeName._x2 -= 1;
							const refName = rangeName.toString({item: sheet, useName: true});
							formula = new Expression(0, `SERIES(${refName},${ref},${ref})`);
						} else if (height === 2) {
							const rangeName = source.copy();
							rangeName._y1 -= 1;
							rangeName._y2 -= 1;
							const refName = rangeName.toString({item: sheet, useName: true});
							formula = new Expression(0, `SERIES(${refName},${ref},${ref})`);
						} else {
							formula = new Expression(0, `SERIES(,${ref},${ref})`);
						}
						this.series.push(new ChartSeries(type, formula));
						index += 1;
					}
				});
				this.xAxes[0].type = 'time';
				this.finishCommand(cmd, 'series');
				cmp.add(cmd);
			}
		}

		if (!cmp.hasCommands()) {
			const vertical = range.getHeight() > range.getWidth();
			let startI = vertical ? range._x1 : range._y1;
			let endI = vertical ? range._x2 : range._y2;
			const startJ = vertical ? range._y1 : range._x1;
			const endJ = vertical ? range._y2 : range._x2;
			let step = 1;
			let column;
			let row;
			let seriesLabels = false;
			const tmpRange = new CellRange(range.getSheet(), 0, 0);
			const cmd = this.prepareCommand('series');

			let cell = range
				.getSheet()
				.getDataProvider()
				.getRC(range._x1, range._y1);
			let categoryLabels = cell === undefined || cell.getValue() === '' || cell.getValue() === undefined;

			if (categoryLabels) {
				startI += 1;
			}

			switch (type) {
			case 'bubble':
				step = 2;
				// startI += 1;
				break;
			case 'scatter':
			case 'scatterLine':
				if (!categoryLabels && ((vertical && width > 1) || (!vertical && height > 1))) {
					categoryLabels = true;
					startI += 1;
				}
				break;
			default:
				break;
			}
			endI = Math.max(startI, endI);

			let val;
			const start = vertical ? range._x1 + (categoryLabels ? 1 : 0) : range._y1 + (categoryLabels ? 1 : 0);
			const end = vertical ? range._x2 : range._y2;

			for (let i = start; i <= end; i += 1) {
				cell = vertical
					? range
						.getSheet()
						.getDataProvider()
						.getRC(i, range._y1, i)
					: range
						.getSheet()
						.getDataProvider()
						.getRC(range._x1, i);
				if (cell) {
					val = cell.getValue();
					if (typeof val === 'string' && val.length) {
						seriesLabels = true;
						break;
					}
				}
			}

			for (let i = startI; i <= endI; i += step) {
				formula = 'SERIES(';
				column = vertical ? i : startJ;
				row = vertical ? startJ : i;

				if (seriesLabels) {
					tmpRange.set(column, row, column, row);
					tmpRange.shiftToSheet();
					const refName = tmpRange.toString({ item: sheet, useName: true });
					formula += `${refName},`;
				} else {
					formula += ',';
				}

				if (categoryLabels) {
					if (vertical) {
						tmpRange.set(range._x1, range._y1 + (seriesLabels ? 1 : 0), range._x1, range._y2);
					} else {
						tmpRange.set(range._x1 + (seriesLabels ? 1 : 0), range._y1, range._x2, range._y1);
					}
					tmpRange.shiftToSheet();
					const refName = tmpRange.toString({ item: sheet, useName: true });
					formula += `${refName},`;
				} else {
					formula += ',';
				}

				if (type === 'bubble') {
					// if (vertical) {
					// 	tmpRange.set(column + 1, row + (seriesLabels ? 1 : 0), column + 1, row + endJ - startJ);
					// } else {
					// 	tmpRange.set(column + (seriesLabels ? 1 : 0), row + 1, column + endJ - startJ, row + 1);
					// }
					// tmpRange.shiftToSheet();
					// currentSeries.dataRadius = `=${tmpRange.toString({ item: chartSheet, useName: true })}`;
				}

				if (vertical) {
					tmpRange.set(column, row + (seriesLabels ? 1 : 0), column, row + endJ - startJ);
				} else {
					tmpRange.set(column + (seriesLabels ? 1 : 0), row, column + endJ - startJ, row);
				}

				tmpRange.shiftToSheet();
				const refName = tmpRange.toString({ item: sheet, useName: true });
				formula += `${refName})`;

				this.series.push(new ChartSeries(type, new Expression(0, formula)));
			}
			this.finishCommand(cmd, 'series');
			cmp.add(cmd);
		}

		this.evaluate();

		if (cmp.hasCommands()) {
			this.finishCommand(cmdAxis, 'axes');
			cmp.add(cmdAxis);
			viewer.getInteractionHandler().execute(cmp);
		}
	}

	newInstance() {
		return new SheetPlotNode();
	}

	evaluate() {
		super.evaluate();
		this.series.forEach((serie) => {
			serie.formula.evaluate(this);
		});
		this.xAxes.forEach((axis) => {
			axis.formula.evaluate(this);
		});
		this.yAxes.forEach((axis) => {
			axis.formula.evaluate(this);
		});
		this.title.formula.evaluate(this);
	}

	_copy(copiednodes, deep, ids) {
		const copy = super._copy(copiednodes, deep, ids);

		copy.series = [];

		this.series.forEach((serie, index) => {
			const copySerie = new ChartSeries(serie.type, serie.formula.copy());
			copy.series.push(copySerie);
		});

		return copy;
	}

	saveTitle(writer) {
		writer.writeStartElement('title');
		this.title.formula.save('formula', writer);
		this.title.format.save('format', writer);
		writer.writeEndElement();
	}

	savePlot(writer) {
		writer.writeStartElement('plot');
		this.plot.format.save('format', writer);
		writer.writeEndElement();
	}

	saveLegend(writer) {
		writer.writeStartElement('legend');
		this.legend.formula.save('formula', writer);
		this.legend.format.save('format', writer);
		writer.writeEndElement();
	}

	saveSeries(writer) {
		writer.writeStartArray('series');

		this.series.forEach((serie, index) => {
			serie.save(writer);
		});
		writer.writeEndArray('series');
	}

	saveAxes(writer) {
		const save = (data, name) => {
			writer.writeStartArray(name);

			data.forEach((axis, index) => {
				writer.writeStartElement(name);

				writer.writeAttributeNumber('size', axis.size, 0);
				writer.writeAttributeString('align', axis.align);
				writer.writeAttributeString('type', axis.type);
				writer.writeAttributeString('name', axis.name);
				writer.writeAttributeString('position', axis.position.toString());
				axis.formula.save('formula', writer);
				axis.format.save('format', writer);

				writer.writeEndElement();
			});

			writer.writeEndArray('name');
		};

		save(this.xAxes, 'xaxis');
		save(this.yAxes, 'yaxis');
	}

	saveContent(writer, absolute) {
		super.saveContent(writer, absolute);

		writer.writeAttributeString('type', 'sheetplotnode');

		writer.writeStartElement('plot');

		this.savePlot(writer);
		this.saveTitle(writer);
		this.saveSeries(writer);
		this.saveAxes(writer);
		this.saveLegend(writer);

		writer.writeEndElement();
	}

	readTitle(reader, object) {
		reader.iterateObjects(object, (name, child) => {
			switch (name) {
				case 'title': {
					reader.iterateObjects(child, (subName, subChild) => {
						switch (subName) {
						case 'formula':
							this.title.formula = new Expression(0);
							this.title.formula.read(reader, subChild);
							break;
						case 'format':
							this.title.format = new ChartFormat();
							this.title.format.read(reader, subChild);
							break;
						}
					});
					break;
				}
			}
		});
	}

	readLegend(reader, object) {
		reader.iterateObjects(object, (name, child) => {
			switch (name) {
			case 'legend': {
				reader.iterateObjects(child, (subName, subChild) => {
					switch (subName) {
					case 'formula':
						this.legend.formula = new Expression(0);
						this.legend.formula.read(reader, subChild);
						break;
					case 'format':
						this.legend.format = new ChartFormat();
						this.legend.format.read(reader, subChild);
						break;
					}
				});
				break;
			}
			}
		});
	}

	readPlot(reader, object) {
		reader.iterateObjects(object, (name, child) => {
			switch (name) {
			case 'plot':
				reader.iterateObjects(child, (subName, subChild) => {
					switch (subName) {
					case 'format':
						this.plot.format = new ChartFormat();
						this.plot.format.read(reader, subChild);
						break;
					}
				});
				break;
			}
		});
	}

	readSeries(reader, object) {
		this.series = [];

		reader.iterateObjects(object, (name, child) => {
			switch (name) {
				case 'series': {
					const serie = new ChartSeries();
					serie.read(reader, child);
					this.series.push(serie);
					break;
				}
			}
		});
	}

	readAxes(reader, object) {
		this.xAxes = [];
		this.yAxes = [];

		reader.iterateObjects(object, (name, child) => {
			switch (name) {
				case 'xaxis':
				case 'yaxis': {
					const axis = {
						format: new ChartFormat()
					};
					axis.size =
						reader.getAttribute(child, 'size') === undefined
							? 500
							: Number(reader.getAttribute(child, 'size'));
					axis.align =
						reader.getAttribute(child, 'align') === undefined
							? 'left'
							: reader.getAttribute(child, 'align');
					axis.type =
						reader.getAttribute(child, 'type') === undefined
							? 'linear'
							: reader.getAttribute(child, 'type');
					axis.name =
						reader.getAttribute(child, 'name') === undefined
							? 'primary'
							: reader.getAttribute(child, 'name');
					axis.position = ChartRect.fromString(reader.getAttribute(child, 'position'));

					reader.iterateObjects(child, (subName, subChild) => {
						switch (subName) {
						case 'formula':
							axis.formula = new Expression(0);
							axis.formula.read(reader, subChild);
							break;
						case 'format':
							axis.format = new ChartFormat();
							axis.format.read(reader, subChild);
							break;
						}
					});
					if (name === 'xaxis') {
						this.xAxes.push(axis);
					} else {
						this.yAxes.push(axis);
					}
					break;
				}
			}
		});
	}

	read(reader, object) {
		super.read(reader, object);

		const plot = reader.getObject(object, 'plot');
		if (plot) {
			this.readPlot(reader, plot);
			this.readTitle(reader, plot);
			this.readLegend(reader, plot);
			this.readSeries(reader, plot);
			this.readAxes(reader, plot);
		}
	}

	saveByKey(key) {
		const writer = new JSONWriter();
		writer.writeStartDocument();
		switch (key) {
		case 'title':
			this.saveTitle(writer);
			break;
		case 'series':
			this.saveSeries(writer);
			break;
		case 'axes':
			this.saveAxes(writer);
			break;
		case 'legend':
			this.saveLegend(writer);
			break;
		case 'plot':
			this.savePlot(writer);
			break;
		}
		writer.writeEndDocument();

		return writer.flush();
	}

	prepareCommand(key) {
		// save current state
		const current = this.saveByKey(key);
		const cmd = new SetPlotDataCommand(this, key, undefined, current);

		return cmd;
	}

	finishCommand(cmd, key) {
		cmd._data = this.saveByKey(key);
	}

	_assignName(id) {
		const name = this.getGraph().getUniqueName('Plot');
		this.setName(name);
	}

	getSheet() {
		let sheet = this;

		while (sheet && !sheet.getCellDescriptors) {
			sheet = sheet.getParent();
		}

		return sheet;
	}

	isAddLabelAllowed() {
		return false;
	}

	getTemplate(name) {
		return templates[name];
	}

	static get templates() {
		return templates;
	}
};
