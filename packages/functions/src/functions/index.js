const database = require('./database');
const date = require('./date');
const drawing = require('./drawing');
const engineering = require('./engineering');
const info = require('./info');
const logical = require('./logical');
const lookup = require('./lookup');
const math = require('./math');
// const olap = require('./olap');
const stack = require('./stack');
const statistical = require('./statistical');
const streamsheet = require('./streamsheet');
const text = require('./text');

module.exports = {
	...database.functions,
	...date.functions,
	...drawing.functions,
	...engineering.functions,
	...info.functions,
	...logical.functions,
	...lookup.functions,
	...math.functions,
	// ...olap.functions,
	...stack.functions,
	...statistical.functions,
	...streamsheet.functions,
	...text.functions
};
