const ERROR = require('./errors');
const sheetutils = require('./_utils').sheet;
const runFunction = require('./_utils').runFunction;

const deleteRange = (cellrange) => {
	const sheet = cellrange.sheet;
	if (cellrange) {
		cellrange.iterate((cell, index) => {
			sheet.setCellAt(index, undefined);
		});
	}
};
const deletecells = (sheet, ...terms) =>
	runFunction(sheet, terms)
		.onSheetCalculation()
		.run(() => {
			let error;
			terms.some((term) => {
				const cellrange = sheetutils.getCellRangeFromTerm(term, sheet);
				error = ERROR.isError(cellrange);
				if (!error) deleteRange(cellrange);
				return !!error;
			});
			return error || true;
		});

module.exports = deletecells;
