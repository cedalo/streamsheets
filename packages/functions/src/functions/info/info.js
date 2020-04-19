const {	runFunction, values: { isEven } } = require('../../utils');
const { convert } = require('@cedalo/commons');
const { FunctionErrors } = require('@cedalo/error-codes');

const ERROR = FunctionErrors.code;

const valueOf = (term, defval) => {
	const val = term.value;
	return val != null ? val : defval;
};

const iferror = (sheet, ...terms) =>
	runFunction(sheet, terms)
		.withArgCount(2)
		.run(() => {
			const value = valueOf(terms[0], '');
			const errvalue = valueOf(terms[1], '');
			return FunctionErrors.isError(value) ? errvalue : value;
		});

const iserr = (sheet, ...terms) =>
	runFunction(sheet, terms)
		.withMaxArgs(1)
		.run(() => {
			const value = terms.length ? terms[0].value : null;
			return value !== ERROR.NA && !!FunctionErrors.isError(value);
		});

const iserror = (sheet, ...terms) =>
	runFunction(sheet, terms)
		.withMaxArgs(1)
		.run(() => {
			const value = terms.length ? terms[0].value : null;
			return !!FunctionErrors.isError(value);
		});

const isna = (sheet, ...terms) =>
	runFunction(sheet, terms)
		.withMaxArgs(1)
		.run(() => {
			const value = terms.length ? terms[0].value : null;
			return value === ERROR.NA;
		});

const iseven = (sheet, ...terms) =>
	runFunction(sheet, terms)
		.withMaxArgs(1)
		.mapNextArg((term) => (term ? convert.toNumber(term.value, ERROR.VALUE) : ERROR.VALUE))
		.run((value) => isEven(Math.floor(value)));

const isodd = (sheet, ...terms) =>
	runFunction(sheet, terms)
		.withMaxArgs(1)
		.mapNextArg((term) => (term ? convert.toNumber(term.value, ERROR.VALUE) : ERROR.VALUE))
		.run((value) => !isEven(Math.floor(value)));

const na = (sheet, ...terms) =>	runFunction(sheet, terms).withArgCount(0).run(() => ERROR.NA);

module.exports = {
	IFERROR: iferror,
	ISERR: iserr,
	ISERROR: iserror,
	ISEVEN: iseven,
	ISNA: isna,
	ISODD: isodd,
	NA: na
};
