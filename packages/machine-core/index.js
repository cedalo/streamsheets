const Cell = require('./src/machine/Cell');
const Channel = require('./src/ipc/Channel');
const ChannelRequestHandler = require('./src/ipc/ChannelRequestHandler');
const Streams = require('./src/streams/Streams');
const Inbox = require('./src/machine/Inbox');
const LoggerMessagingClient = require('./src/messaging/LoggerClient');
const Machine = require('./src/machine/Machine');
const Message = require('./src/machine/Message');
const Outbox = require('./src/machine/Outbox');
const Sheet = require('./src/machine/Sheet');
const SheetIndex = require('./src/machine/SheetIndex');
const { SheetParser } = require('./src/parser/SheetParser');
const SheetParserContext = require('./src/parser/SheetParserContext');
const { ErrorTerm } = require('./src/parser/Error');
const SheetRange = require('./src/machine/SheetRange');
const State = require('./src/State');
const StreamSheet = require('./src/machine/StreamSheet');
const StreamSheetTrigger = require('./src/machine/StreamSheetTrigger');
const { CellRangeReference, CellReference, referenceFromString } = require('./src/parser/References');


const MachineTaskFile = require('path').resolve(__dirname, 'src', 'ipc', 'MachineTask.js');
const isType = require('./src/utils/isType');
const locale = require('./src/locale');

const DEF_PROPS = require('./defproperties.json');

module.exports = {
	Cell,
	CellRangeReference,
	CellReference,
	Channel,
	ChannelRequestHandler,
	ErrorTerm,
	Inbox,
	LoggerMessagingClient,
	Machine,
	MachineTaskFile,
	Message,
	Outbox,
	Sheet,
	SheetIndex,
	SheetParser,
	SheetParserContext,
	SheetRange,
	State,
	Streams,
	StreamSheet,
	StreamSheetTrigger,
	isType,
	locale,
	referenceFromString,
	DEF_PROPS
};
