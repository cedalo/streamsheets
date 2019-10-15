const { Parser } = require('@cedalo/parser');
const GraphParserContext = require('./GraphParserContext');

const isFunction = ({ type } = {}) => type === 'function' || type === 'condition';
const getFunctionName = ({ type, value }) => (type === 'condition' ? 'IF' : type === 'function' ? value : undefined);
const tokenAt = (infos, pos) => infos.reduce((t, i) => (i && pos >= i.start && pos <= i.end ? i : t), {});
const infoForToken = (token, pos, info = {}) => {
	if (token) {
		const { end, isInvalid, paramIndex, parent, start } = token;
		info.paramIndex =
			info.paramIndex != null ? info.paramIndex : !isFunction(token) || pos === start || pos >= end ? paramIndex : undefined;
		info.function = pos > start && pos < end || isInvalid ? getFunctionName(token) : undefined;
		if (info.function == null) infoForToken(parent, pos, info);
	}
	return info;
};
const infoAtPosition = (infos, pos) => {
	const token = tokenAt(infos, pos);
	const info = infoForToken(token, pos);
	if (token.type === 'identifier') {
		info.start = token.start;
		info.identifier = token.value;
	}
	return info;
};

/**
 * Used by framework.
 * Note: Should not be instantiated! An instance is accessible via <code>JSG.FormulaParser</code>.
 */
class GraphParser {
	constructor() {
		this._context = new GraphParserContext();
	}

	get context() {
		return this._context;
	}

	set context(ctxt) {
		this._context = ctxt;
	}

	runIgnoringErrors(fn, doIt = true) {
		const { ignoreErrors } = this._context;
		this._context.ignoreErrors = doIt;
		const result = fn();
		this._context.ignoreErrors = ignoreErrors;
		return result;
	}

	parse(formula, graph, item) {
		this._context.setScope(graph, item);
		const term = Parser.parse(formula, this._context);
		// clear context to prevent memory leak since graph or item are stored globally...
		this._context.setScope(undefined);
		return term;
	}

	parseValue(str, graph, item) {
		this._context.setScope(graph, item);
		const term = Parser.parseValue(str, this._context);
		// clear context to prevent memory leak since graph or item are stored globally...
		this._context.setScope(undefined);
		return term;
	}

	parseFormulaInfo(str, offset, graph, item) {
		this._context.setScope(graph, item);
		const info = Parser.getFormulaInfos(str, this._context);
		if (offset == null || offset < 0 || offset > str.length) offset = 0;
		// clear context to prevent memory leak since graph or item are stored globally...
		this._context.setScope(undefined);
		return infoAtPosition(info, offset);
	}
}

module.exports = GraphParser;
