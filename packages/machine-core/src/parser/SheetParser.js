const Cell = require('../machine/Cell');
const ERROR = require('../functions/errors');
const { ErrorTerm } = require('./Error');
const SheetParserContext = require('./SheetParserContext');
const { ConcatOperator, Operations } = require('./Operations');
const { Drawings, ErrorCodes, Operation, Parser, Term, Operand } = require('@cedalo/parser');

class ObjectTerm extends Term {
	constructor(value) {
		super();
		this.operand = new Operand('object', value);
	}

	get value() {
		return this.operand.value; // <-- return undefined can cause NaN e.g. 1 * undefined!
	}

	newInstance() {
		return new ObjectTerm();
	}

	toString(/* ...params */) {
		return this.value.toString();
	}

	toLocaleString(/* locale, ...params */) {
		return this.toString();
	}
}

const termFromCellDescriptor = (descr, scope) => {
	// eslint-disable-next-line no-use-before-define
	let term = descr.formula ? SheetParser.parse(descr.formula, scope) : undefined;
	if (!term) {
		const { value } = descr;
		const type = descr.type || typeof value;
		switch (type) {
			case 'bool':
			case 'boolean':
				term = Term.fromBoolean(`${descr.value}`.toLowerCase() === 'true');
				break;
			case 'number':
				term = Term.fromNumber(Number(value != null ? value : 0));
				break;
			case 'object':
				term = new ObjectTerm(descr.value);
				break;
			case 'unit':
				// eslint-disable-next-line no-use-before-define
				term = SheetParser.parseValue(descr.value, scope);
				break;
			default:
				term = value != null ? Term.fromString(`${value}`) : undefined;
		}
	} else if (term.isUnit) {
		// to distinguish unit created by value from one created by formula: e.g. 5% & =5%
		term.formula = descr.formula;
	}
	return term;
};

const valueFromCellDescriptor = (descr) => {
	const value = descr.value;
	// we still get #CALC values from client :-( so have to handle it here...
	return descr.formula && value !== '#CALC' ? value : undefined;
};

const convertParserError = (error) => {
	let err = ERROR.isError(error.code) || ERROR.isError(error.operand);
	if (!err) {
		switch (error.code) {
			case ErrorCodes.MISSING_OPERAND:
			case ErrorCodes.UNKNOWN_FUNCTION:
			case ErrorCodes.UNKNOWN_IDENTIFIER:
				err = ERROR.NAME;
				break;
			default:
				err = ERROR.ERR;
		}
	}
	return err;
};

Operation.register(new ConcatOperator(), 7);

// replace basic parser operations with own, more excel like, once
Operations.forEach((op) => Operation.set(op));

const parse = (value, scope, fn) => {
	let term;
	// eslint-disable-next-line no-use-before-define
	const { context } = SheetParser;
	context.scope = scope || context.scope;
	try {
		term = fn(value, context);
	} catch (err) {
		// DL -714: ignore unknown parser error and create an error term
		const sheeterror = convertParserError(err);
		term = ErrorTerm.fromError(sheeterror, value);
	}
	context.scope = undefined;
	return term;
};

class SheetParser {
	static parse(formula, scope) {
		return parse(formula, scope, Parser.parse);
	}

	static parseValue(value, scope) {
		return value != null ? parse(value, scope, Parser.parseValue) : undefined;
	}

	static createCell(value, scope) {
		if (value == null) {
			return new Cell();
		}
		// we always use a cell descriptor:
		const type = typeof value;
		const descr = type === 'object' ? value : { value, type };
		// value is either a cell descriptor or term...
		const term = descr instanceof Term ? descr : termFromCellDescriptor(descr, scope);
		const cellValue = valueFromCellDescriptor(descr);
		const cell = new Cell(cellValue, term);
		cell.level = descr.level != null ? descr.level : 0;
		return cell;
	}
}

SheetParser.context = new SheetParserContext();

class SheetDrawings extends Drawings {
	_deleteProperties(fromObj) {
		if (fromObj) Object.keys(fromObj).forEach((key) => delete fromObj[key]);
	}
	_deleteProperty(name, fromObj = {}) {
		if (fromObj[name]) delete fromObj[name];
	}

	removeDrawing(name) {
		this._deleteProperty(name, this._drawings);
	}

	removeGraphItem(name) {
		this._deleteProperty(name, this._graphItems);
	}

	removeAll() {
		this._deleteProperties(this._drawings);
		this._deleteProperties(this._graphItems);
	}
}

module.exports = {
	SheetDrawings,
	SheetParser
};
