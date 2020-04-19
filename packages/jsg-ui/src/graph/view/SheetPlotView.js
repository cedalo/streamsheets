import {
	default as JSG,
	GraphUtils,
	MathUtils,
	TextFormatAttributes,
	Numbers,
	FormatAttributes
} from '@cedalo/jsg-core';

import NodeView from './NodeView';

export default class SheetPlotView extends NodeView {
	onSelectionChange(selected) {
		if (!selected) {
			this.chartSelection = undefined;
			this.getGraphView().clearLayer('chartselection');
		}
	}

	drawBorder(graphics, format, rect) {
		super.drawBorder(graphics, format, rect);
	}

	drawRect(graphics, rect, item, format, id) {
		const lineColor = format.lineColor || item.getTemplate('basic')[id].format.lineColor;
		const fillColor = format.fillColor || item.getTemplate('basic')[id].format.fillColor;

		graphics.beginPath();
		graphics.setLineWidth(1);
		graphics.setLineColor(lineColor);
		graphics.setFillColor(fillColor);
		graphics.rect(rect.left, rect.top, rect.width, rect.height);
		if (lineColor !== 'none') {
			graphics.stroke();
		}
		if (fillColor !== 'none') {
			graphics.fill();
		}
	}

	drawFill(graphics, format, rect) {
		super.drawFill(graphics, format, rect);

		const item = this.getItem();

		if (item._isFeedback) {
			return;
		}

		// item.setMinMax();
		// item.setScales();
		//
		const { series } = item;
		const plotRect = item.plot.position;

		this.drawRect(graphics, plotRect, item, item.plot.format, 'plot');

		this.drawAxes(graphics, plotRect, item, true);

		series.forEach((serie, index) => {
			this.drawPlot(graphics, item, plotRect, serie, index);
		});

		this.drawAxes(graphics, plotRect, item, false);
		this.drawLegend(graphics, plotRect, item);
		this.drawTitle(graphics, item);
	}

	drawLegend(graphics, plotRect, item) {
		const legendData = item.getLegend();
		const margin = 200;
		const { legend } = item;

		this.drawRect(graphics, legend.position, item, legend.format, 'legend');
		item.setFont(graphics, legend.format, 'legend', 'middle', TextFormatAttributes.TextAlignment.LEFT);
		const textSize = item.measureText(graphics, graphics.getCoordinateSystem(), legend.format, 'legend', 'X');
			let y = legend.position.top + margin;

		legendData.forEach((entry, index) => {
			graphics.beginPath();
			graphics.setLineColor(entry.series.format.lineColor || item.getTemplate('basic').series.line[index]);
			graphics.setLineWidth(entry.series.format.lineWidth || item.getTemplate('basic').series.linewidth);
			graphics.moveTo(legend.position.left + margin, y + textSize.height / 2);
			graphics.lineTo(legend.position.left + margin * 4, y + textSize.height / 2);
			graphics.stroke();

			graphics.fillText(entry.name, legend.position.left + margin * 5, y + textSize.height / 2);
			y += textSize.height;
		});

		graphics.setLineWidth(-1);
	}

	drawAxes(graphics, plotRect, item, grid) {
		item.xAxes.forEach((axis) => {
			this.drawAxis(graphics, plotRect, item, axis, grid);
		});

		item.yAxes.forEach((axis) => {
			this.drawAxis(graphics, plotRect, item, axis, grid);
		});
	}

	drawAxis(graphics, plotRect, item, axis, grid) {
		if (!axis.position || !axis.scale) {
			return;
		}
		// draw axis line
		if (!grid) {
			graphics.beginPath();
			graphics.setLineColor(axis.format.lineColor || item.getTemplate('basic').axis.linecolor);
			switch (axis.align) {
			case 'left':
				graphics.moveTo(axis.position.right, axis.position.top);
				graphics.lineTo(axis.position.right, axis.position.bottom);
				item.setFont(graphics, axis.format, 'axis', 'middle', TextFormatAttributes.TextAlignment.RIGHT);
				break;
			case 'right':
				graphics.moveTo(axis.position.left, axis.position.top);
				graphics.lineTo(axis.position.left, axis.position.bottom);
				item.setFont(graphics, axis.format, 'axis', 'middle', TextFormatAttributes.TextAlignment.LEFT);
				break;
			case 'top':
				graphics.moveTo(axis.position.left, axis.position.bottom);
				graphics.lineTo(axis.position.right, axis.position.bottom);
				item.setFont(graphics, axis.format, 'axis', 'bottom', TextFormatAttributes.TextAlignment.CENTER);
				break;
			case 'bottom':
				graphics.moveTo(axis.position.left, axis.position.top);
				graphics.lineTo(axis.position.right, axis.position.top);
				item.setFont(graphics, axis.format, 'axis', 'top', TextFormatAttributes.TextAlignment.CENTER);
				break;
			}
			graphics.stroke();
		}

		let current = axis.scale.min;
		let pos;
		let plot;
		let text;

		if (grid) {
			graphics.beginPath();
			graphics.setLineColor('#CCCCCC');
		}

		if (axis.type === 'time') {
			current = item.incrementScale(axis, current - 0.0000001);
		}

		let refLabel;
		if (axis.type === 'category') {
			item.series.forEach((series, index) => {
				if (series.xAxis === axis.name) {
					refLabel = item.getDataSourceInfo(series.formula);
				}
			});
		}

		while (current <= axis.scale.max) {
			if (axis.type === 'category' && current >= axis.scale.max) {
				break;
			}

			pos = item.scaleToAxis(axis, current, grid);

			if (!grid) {
				if (axis.type === 'category' && refLabel) {
					text = item.getLabel(refLabel, Math.floor(current));
					if (text === undefined) {
						text = current;
					}
				} else {
					text = item.formatNumber(current, axis.format && axis.format.numberFormat ? axis.format : axis.scale.format);
				}
			}

			switch (axis.align) {
			case 'left':
				plot = plotRect.bottom - pos * plotRect.height;
				if (grid) {
					graphics.moveTo(plotRect.left, plot);
					graphics.lineTo(plotRect.right, plot);
				} else {
					graphics.fillText(`${text}`, axis.position.right - 200, plot);
				}
				break;
			case 'right':
				plot = plotRect.bottom - pos * plotRect.height;
				if (grid) {
					graphics.moveTo(plotRect.left, plot);
					graphics.lineTo(plotRect.right, plot);
				} else {
					graphics.fillText(`${text}`, axis.position.left + 200, plot);
				}
				break;
			case 'top':
				plot = plotRect.left + pos * plotRect.width;
				if (grid) {
					graphics.moveTo(plot, plotRect.top);
					graphics.lineTo(plot, plotRect.bottom);
				} else {
					graphics.fillText(`${text}`, plot, axis.position.bottom - 200);
				}
				break;
			case 'bottom':
				plot = plotRect.left + pos * plotRect.width;
				if (grid) {
					graphics.moveTo(plot, plotRect.top);
					graphics.lineTo(plot, plotRect.bottom);
				} else {
					graphics.fillText(`${text}`, plot, axis.position.top + 200);
				}
				break;
			}

			current = item.incrementScale(axis, current);
		}
		if (grid) {
			graphics.stroke();
		}
	}

	drawPlot(graphics, item, plotRect, serie, seriesIndex) {
		let index = 0;
		let x;
		let y;
		let barWidth = 100;
		const barMargin = serie.stacked ? 0 : 150;
		let zero;
		const value = {};

		const ref = item.getDataSourceInfo(serie.formula);
		if (!ref) {
			return;
		}

		const axes = item.getAxes(serie);
		if (!axes) {
			return;
		}
		graphics.save();
		graphics.beginPath();
		graphics.rect(plotRect.left, plotRect.top, plotRect.width, plotRect.height);
		graphics.clip();

		graphics.beginPath();
		graphics.setLineColor(serie.format.lineColor || item.getTemplate('basic').series.line[seriesIndex]);
		graphics.setLineWidth(serie.format.lineWidth || item.getTemplate('basic').series.linewidth);
		graphics.setFillColor(serie.format.fillColor || item.getTemplate('basic').series.fill[seriesIndex]);

		if (axes.x.type === 'category') {
			barWidth = item.scaleToAxis(axes.x, 1, false)  * plotRect.width -
				item.scaleToAxis(axes.x, 0, false) * plotRect.width;
			barWidth = barWidth * 0.7 / (serie.stacked ? 1 : item.series.length);
			zero = item.scaleToAxis(axes.y, 0, false);
		}

		let offset;
		let height;
		let tmp;

		while (item.getValue(ref, index, value)) {
			x = item.scaleToAxis(axes.x, value.x, false);
			if (serie.stacked) {
				if (serie.relative) {
					y = 0;
					for (let i = 0; i < seriesIndex; i += 1) {
						tmp = axes.x.categories[index].values[i].y;
						if (Numbers.isNumber(tmp)) {
							if (value.y < 0) {
								const neg = axes.x.categories[index].neg;
								if (Numbers.isNumber(neg) && neg !== 0) {
									y += tmp / neg * 100;
								}
							} else if (tmp > 0) {
								const pos = axes.x.categories[index].pos;
								if (Numbers.isNumber(pos) && pos !== 0) {
									y += tmp / pos * 100;
								}
							}
						}
					}
					y = item.scaleToAxis(axes.y, y, false);
				} else {
					y = 0;
					for (let i = 0; i < seriesIndex; i += 1) {
						tmp = axes.x.categories[index].values[i].y;
						if (Numbers.isNumber(tmp)) {
							if (value.y < 0) {
								if (tmp < 0) {
									y += tmp;
								}
							} else if (tmp > 0) {
								y += tmp;
							}
						}
					}
					y = item.scaleToAxis(axes.y, y, false);
				}
			} else {
				y = item.scaleToAxis(axes.y, value.y, false);
			}
			switch (serie.type) {
			case 'line':
			case 'scatter':
				if (index) {
					graphics.lineTo(plotRect.left + x * plotRect.width, plotRect.bottom - y * plotRect.height);
				} else {
					graphics.moveTo(plotRect.left + x * plotRect.width, plotRect.bottom - y * plotRect.height);
				}
				break;
			case 'column':
				if (serie.relative) {
					height = 0;
					if (value.y > 0) {
						tmp = axes.x.categories[index].pos;
						if (Numbers.isNumber(tmp) && tmp !== 0) {
							height = item.scaleToAxis(axes.y, value.y / tmp * 100, false);
						}
					} else {
						tmp = Math.abs(axes.x.categories[index].neg);
						if (Numbers.isNumber(tmp) && tmp !== 0) {
							height = -item.scaleToAxis(axes.y, value.y / tmp * 100, false);
						}
					}
				} else {
					height = item.scaleSizeToAxis(axes.y, value.y);
				}
				y = serie.stacked ? y : zero;
				offset = serie.stacked ? -barWidth / 2 : -item.series.length / 2 * barWidth + seriesIndex * barWidth + barMargin / 2;
				graphics.rect(plotRect.left + x * plotRect.width + offset, plotRect.bottom - y * plotRect.height, barWidth - barMargin, -height * plotRect.height);
				break;
			}
			index += 1;
		}

		if (serie.type === 'column') {
			graphics.fill();
		}
		graphics.stroke();
		graphics.setLineWidth(1);
		graphics.restore();
	}

	drawTitle(graphics, item) {
		const { title } = item;

		const text = String(item.getExpressionValue(title.formula));

		this.drawRect(graphics, title.position, item, title.format, 'title');
		item.setFont(graphics, title.format, 'title', 'middle', TextFormatAttributes.TextAlignment.CENTER);

		graphics.fillText(text, title.position.left + title.position.width / 2, title.position.top + title.position.height / 2 + 50);
	}

	getSelectedFormat() {
		const f = new FormatAttributes();

		if (this.chartSelection) {
			const data = this.getItem().getDataFromSelection(this.chartSelection);
			const template = this.getItem().getTemplate('basic');
			if (data) {
				switch (this.chartSelection.element) {
				case 'series':
					f.setFillColor(data.format.fillColor || template.series.fill[this.chartSelection.index]);
					f.setLineColor(data.format.lineColor || template.series.line[this.chartSelection.index]);
					break;
				case 'title':
				case 'legend':
					f.setFillColor(data.format.fillColor || template[this.chartSelection.element].format.fillColor);
					f.setLineColor(data.format.lineColor || template[this.chartSelection.element].format.lineColor);
					break;
				case 'xAxis':
				case 'yAxis':
					f.setLineColor(data.format.lineColor || template.axis.format.lineColor);
					f.setFillColor(data.format.fillColor || template.axis.format.fillColor);
					break;
				default:
					break;
				}
			}
		}

		return f;
	}

	getSelectedTextFormat() {
		const tf = new TextFormatAttributes();

		if (this.chartSelection) {
			const data = this.getItem().getDataFromSelection(this.chartSelection);
			const template = this.getItem().getTemplate('basic');
			if (data) {
				switch (this.chartSelection.element) {
				case 'series':
				case 'title':
				case 'legend':
					tf.setFontName(data.format.fontName || template[this.chartSelection.element].format.fontName || template.font.name);
					tf.setFontSize(data.format.fontSize || template[this.chartSelection.element].format.fontSize || template.font.size);
					if (data.format.fontStyle !== undefined) {
						tf.setFontStyle(data.format.fontStyle);
					} else if (template[this.chartSelection.element].format.fontStyle !== undefined) {
						tf.setFontStyle(template[this.chartSelection.element].format.fontStyle);
					} else {
						tf.setFontStyle(template.font.style);
					}
					break;
				case 'xAxis':
				case 'yAxis':
					tf.setFontName(data.format.fontName || template.axis.format.fontName || template.font.name);
					tf.setFontSize(data.format.fontSize || template.axis.format.fontSize || template.font.size);
					if (data.format.fontStyle !== undefined) {
						tf.setFontStyle(data.format.fontStyle);
					} else if (template.axis.format.fontStyle !== undefined) {
						tf.setFontStyle(template.axis.format.fontStyle);
					} else {
						tf.setFontStyle(template.font.style);
					}
					break;
				default:
					break;
				}
			}
		}

		return tf;
	}

	hasSelectedFormula(sheet) {
		if (this.chartSelection) {
			switch (this.chartSelection.element) {
			case 'series':
			case 'title':
			case 'legend':
			case 'xAxis':
			case 'yAxis':
				return true;
			default:
				return false;
			}
		}

		return false;
	}

	getSelectedFormula(sheet) {
		let expr;

		if (this.chartSelection) {
			switch (this.chartSelection.element) {
			case 'series':
			case 'xAxis':
			case 'yAxis':
			case 'title':
			case 'legend': {
				const data = this.getItem().getDataFromSelection(this.chartSelection);
				if (!data) {
					return super.getSelectedFormula(sheet);
				}
				expr = data.formula;
				break;
			}
			default:
				break;
			}
		}

		if (expr) {
			if (expr.getTerm()) {
				const formula = `=${expr.getTerm().toLocaleString(JSG.getParserLocaleSettings(), {
					item: sheet,
					useName: true,
				})}`;
				return formula
			} else {
				return expr.getValue();
			}
		}

		return super.getSelectedFormula(sheet);
	}

	applyAttributes(map, viewer) {
		const update = (key) => {
			const cmd = this.getItem().prepareCommand(key);
			const data = this.getItem().getDataFromSelection(this.chartSelection);
			if (!data) {
				return;
			}
			let value = map.get('linecolor');
			if (value ) {
				data.format.lineColor = map.get('linecolor');
			}
			value = map.get('fillcolor');
			if (value ) {
				data.format.fillColor = map.get('fillcolor');
			}
			value = map.get('fontcolor');
			if (value ) {
				data.format.fontColor = map.get('fontcolor');
			}
			value = map.get('fontname');
			if (value ) {
				data.format.fontName = map.get('fontname');
			}
			value = map.get('fontsize');
			if (value ) {
				data.format.fontSize = Number(map.get('fontsize'));
			}
			value = map.get('fontstyle');
			if (value !== undefined ) {
				data.format.fontStyle = Number(map.get('fontstyle'));
			}
			value = map.get('numberformat');
			if (value === 'General') {
				data.format.numberFormat = undefined;
				data.format.localCulture = undefined;
			} else {
				if (value !== undefined) {
					data.format.numberFormat = map.get('numberformat');
				}
				value = map.get('localculture');
				if (value !== undefined) {
					data.format.localCulture = map.get('localculture');
				}
			}
			this.getItem().finishCommand(cmd, key);
			viewer.getInteractionHandler().execute(cmd);
		};

		if (this.chartSelection) {
			switch (this.chartSelection.element) {
			case 'series':
				update('series');
				return true;
			case 'xAxis':
			case 'yAxis':
				update('axes');
				return true;
			case 'title':
				update('title');
				return true;
			case 'legend':
				update('legend');
				return true;
			case 'plot':
				update('plot');
				return true;
			default:
				break;
			}
		}
		return false;
	}
}
