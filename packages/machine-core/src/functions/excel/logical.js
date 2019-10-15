const ERROR = require('../errors');
const { convert, runFunction, terms: onTerms, values: { isEven } } = require('../_utils');


const runWith = (sheet, terms, logic) => 
	runFunction(sheet, terms)
		.withMinArgs(1)
		.run(() => {
			let error;
			let res;
			onTerms.iterateAllTermsValues(sheet, terms, (value, err) => {
				error = error || err;
				const bool = convert.toBoolean(value);
				// ignore values which could not be converted
				if (bool != null) res = logic(res, bool);
			});
			return error || (res == null ? ERROR.VALUE : res);
		});

// boolean values: strings always true!! and 0 always false 
const and = (sheet, ...terms) => runWith(sheet, terms, (res, currbool) => (res == null ? currbool : res && currbool));

const or = (sheet, ...terms) => runWith(sheet, terms, (res, currbool) => res || currbool);


const not = (sheet, ...terms) =>
	runFunction(sheet, terms)
		.withArgCount(1)
		.run(() => {
			const val = convert.toBoolean(terms[0].value, ERROR.VALUE);
			const error = ERROR.isError(val);
			return error || !val;
		});


const _switch = (sheet, ...terms) => {
	const error = !sheet || terms.length < 3 ? ERROR.ARGS : undefined;
	if (!error) {
		let matchIndex = -1;
		const value = terms.shift().value;
		const defval = isEven(terms.length) ? ERROR.NA : terms[terms.length - 1].value;
		terms.some((term, index) => {
			// index must be even
			matchIndex = (term.value === value && isEven(index)) ? index : -1;
			return matchIndex > -1;
		});
		return matchIndex > -1 ? terms[matchIndex + 1].value : defval;
	}
	return error;
};


module.exports = {
	AND: and,
	NOT: not,
	OR: or,
	SWITCH: _switch
};
