const {	date: { serial2ms }, runFunction } = require('../../utils');
const { convert } = require('@cedalo/commons');
const { FunctionErrors } = require('@cedalo/error-codes');

const ERROR = FunctionErrors.code;

const serialtoms = (sheet, ...terms) =>
	runFunction(sheet, terms)
		.withArgCount(1)
		.mapNextArg(serial => convert.toNumber(serial.value) || ERROR.VALUE)
		.run(serial => serial2ms(serial));


module.exports = serialtoms;
