const JSG = require('../../JSG');
const Node = require('./Node');
const FormatAttributes = require('../attr/FormatAttributes');
const ItemAttributes = require('../attr/ItemAttributes');
const StringAttribute = require('../attr/StringAttribute');
const GridLayout = require('../../layout/GridLayout');
const CaptionNode = require('./CaptionNode');
const ButtonNode = require('./ButtonNode');
const TreeNode = require('./TreeNode');
const TreeItemsNode = require('./TreeItemsNode');
const SplitterNode = require('./SplitterNode');
const SetTreeShowDepthCommand = require('../command/SetTreeShowDepthCommand');
const SetTreeItemShowDepthCommand = require('../command/SetTreeItemShowDepthCommand');

/**
 * @class MessageContainer

 * @extends Node
 * @constructor
 */
module.exports = class MessageContainer extends Node {
	constructor() {
		super();

		this._topMargin = 0;
		this._drawEnabled = false;
	}

	addButton(parent, name, image, halign) {
		const button = new ButtonNode();
		button.getItemAttributes().addAttribute(new StringAttribute('LayoutHorizontal', halign));
		button.getItemAttributes().addAttribute(new StringAttribute('LayoutVertical', 'center'));
		button.getFormat().setFillStyle(FormatAttributes.FillStyle.PATTERN);
		button.getFormat().setPattern(image);
		button.setSize(400, 400);
		parent.addItem(button);
		button.setName(name);
		button.onClick = this.onClick;
		button.setEventScope(this);
	}

	createItems() {
		// inbox list
		this._messageList = new TreeNode();
		this._messageList.setHeight(5000);
		this._messageList.setType('ml');
		this.getMessageListItems()
			.getTreeItemAttributes()
			.setColorJsonString('#1D89E4');
		this.getMessageListItems()._defaultElementName = 'Message';
		this.addItem(this._messageList);

		this.getMessageListItems().setCustomDataHandler('_json', {
			onGet: (treeitem, element, key) => {},
			onSet: (treeitem) => {},
			onInit: (treeitem) => {},
			onAdd: (treeitem) => {
				if (treeitem._json === undefined) {
					this.getMessageTreeItems().setJson('{"NewKey1" : "Value"}');
					treeitem._userItems = this.getMessageTreeItems().getJsonTree();
				}
			},
			onSelect: (treeitem) => {},
			onDeSelect: (treeitem) => {
				if (treeitem !== undefined) {
					if (treeitem._json === undefined) {
						treeitem._userItems = this.getMessageTreeItems().getJsonTree();
					}
				}
			},
			onDelete: (treeitem) => {},
			onUpdate: (treeitem) => {},
			onCopy: (source, target) => {
				target._json = source._json;
			},
			onPaste: (source, target) => {
				target._json = source._json;
			}
		});

		// splitter
		this._splitter = new SplitterNode();
		this._splitter.setDirection(ItemAttributes.Direction.HORIZONTAL);
		this.addItem(this._splitter);

		// json caption
		this._messageCaption = new CaptionNode();
		this._messageCaption.setName(JSG.getLocalizedString('DataObject'));
		this.addItem(this._messageCaption);

		// json tools to limit level view
		this._messageTools = new Node();
		this._messageTools.getFormat().setFillColor('#EEEEEE');
		this._messageTools.getFormat().setLineColor('#AAAAAA');
		this._messageTools.getItemAttributes().setSelectionMode(ItemAttributes.SelectionMode.NONE);
		this._messageTools.getItemAttributes().setClipChildren(true);
		this._messageTools.getItemAttributes().setPortMode(ItemAttributes.PortMode.NONE);
		this._messageTools.getItemAttributes().setContainer(false);
		this._messageTools.setLayout(GridLayout.TYPE);
		this.addItem(this._messageTools);

		// json editor
		this._messageEditor = new TreeNode();
		this._messageEditor.setType('me');
		this._messageEditor.getTreeItemsNode()._saveCollapsed = true;
		this.addItem(this._messageEditor);

		this.addButton(this._messageTools, 't1l', 't1', 'left');
		this.addButton(this._messageTools, 't2l', 't2', 'left');
		this.addButton(this._messageTools, 't3l', 't3', 'left');
		this.addButton(this._messageTools, 't4l', 't4', 'left');
		this.addButton(this._messageTools, 't1r', 't1', 'right');
		this.addButton(this._messageTools, 't2r', 't2', 'right');
		this.addButton(this._messageTools, 't3r', 't3', 'right');
		this.addButton(this._messageTools, 't4r', 't4', 'right');

		this.getFormat().setLineColor('#AAAAAA');
		this.getItemAttributes().setPortMode(ItemAttributes.PortMode.NONE);
		this.getItemAttributes().setRotatable(false);
		this.getItemAttributes().setContainer(false);
		this.getFormat().setLineColor('#AAAAAA');
		this.getItemAttributes().setSelectionMode(ItemAttributes.SelectionMode.NONE);

		const nc = JSG.NotificationCenter.getInstance();
		nc.register(this, TreeItemsNode.SELECTION_CHANGED_NOTIFICATION, 'onTreeSelectionChanged');
	}

	dispose() {
		super.dispose();

		const nc = JSG.NotificationCenter.getInstance();
		nc.unregister(this, TreeItemsNode.SELECTION_CHANGED_NOTIFICATION);
	}

	onClick(button) {
		const items = this._messageEditor.getTreeItemsNode();

		switch (button.getName().getValue()) {
			case 't1l':
				return new SetTreeShowDepthCommand(items, 0);
			case 't2l':
				return new SetTreeShowDepthCommand(items, 1);
			case 't3l':
				return new SetTreeShowDepthCommand(items, 2);
			case 't4l':
				return new SetTreeShowDepthCommand(items, 3);
			case 't1r': {
				const selectedItem = items.getSelectedItem();
				if (selectedItem) {
					return new SetTreeItemShowDepthCommand(items, selectedItem.level, 1);
				}
				break;
			}
			case 't2r': {
				const selectedItem = items.getSelectedItem();
				if (selectedItem) {
					return new SetTreeItemShowDepthCommand(items, selectedItem.level, 2);
				}
				break;
			}
			case 't3r': {
				const selectedItem = items.getSelectedItem();
				if (selectedItem) {
					return new SetTreeItemShowDepthCommand(items, selectedItem.level, 3);
				}
				break;
			}
			case 't4r': {
				const selectedItem = items.getSelectedItem();
				if (selectedItem) {
					return new SetTreeItemShowDepthCommand(items, selectedItem.level, 4);
				}
				break;
			}
			default:
				break;
		}

		return undefined;
	}

	onTreeSelectionChanged(notification) {}

	newInstance() {
		return new MessageContainer();
	}

	isAddLabelAllowed() {
		return false;
	}

	getMessageCaption() {
		return this._messageCaption;
	}

	getMessageList() {
		return this._messageList;
	}

	getMessageListItems() {
		return this._messageList.getTreeItemsNode();
	}

	getMessageTree() {
		return this._messageEditor;
	}

	getMessageTreeItems() {
		return this._messageEditor.getTreeItemsNode();
	}

	clearListItems() {
		this.getMessageListItems().setJson('{}');
	}

	clearTreeItems() {
		this.getMessageTreeItems().setJson('{}');
	}

	saveCondensed(writer, name) {
		writer.writeStartElement(name);

		writer.writeAttributeNumber('split', this._messageList.getHeight().getValue(), 0);
		writer.writeAttributeNumber('width', this.getWidth().getValue(), 0);

		writer.writeEndElement();
	}

	readCondensed(reader, object) {
		const split = Number(reader.getAttribute(object, 'split'));
		const width = Number(reader.getAttribute(object, 'width'));

		this._messageList.setHeight(split);
		this.setWidth(width);
	}

	saveContent(file, absolute) {
		if (this.getId() !== undefined) {
			file.writeAttributeString('id', this.getId());
			file.writeAttributeNumber('messageheight', this._messageList.getHeight().getValue(), 0);
		}

		this._pin.save('pin', file, absolute);
		this._size.save('size', file);
	}

	read(reader, object) {
		// read splitter positions
		let id = reader.getAttribute(object, 'id');
		if (id !== undefined) {
			id = Number(id);
			if (id !== undefined) {
				this.setId(id);
			}
		}

		let height = reader.getAttribute(object, 'messageheight');
		if (height !== undefined) {
			height = Number(height);
			if (height !== undefined) {
				this._messageList.setHeight(height);
			}
		}

		reader.iterateObjects(object, (name, subnode) => {
			switch (name) {
				case 'size':
					this._size.read(reader, subnode);
					this._updateBoundingBox();
					break;
				case 'pin':
					this._pin.read(reader, subnode);
					this._updateOrigin();
					break;
			}
		});
	}

	layout() {
		const box = JSG.boxCache.get();
		const size = this.getSize().toPoint();
		const sizeSheet = this._messageList.getSize().toPoint();
		const heightCaption = 650;

		box.setLeft(0);
		box.setTop(this._topMargin);
		box.setWidth(size.x);
		box.setHeight(sizeSheet.y);

		this._messageList.setBoundingBoxTo(box);
		this._messageList.layout();

		box.setTop(sizeSheet.y + this._topMargin);
		box.setHeight(SplitterNode.DEFAULT_SIZE);

		this._splitter.setBoundingBoxTo(box);

		box.setTop(sizeSheet.y + this._topMargin + SplitterNode.DEFAULT_SIZE);
		box.setHeight(heightCaption);

		this._messageCaption.setBoundingBoxTo(box);

		box.setTop(sizeSheet.y + SplitterNode.DEFAULT_SIZE + heightCaption + this._topMargin);
		this._messageTools.setBoundingBoxTo(box);

		box.setTop(sizeSheet.y + SplitterNode.DEFAULT_SIZE + heightCaption * 2 + this._topMargin);
		box.setHeight(size.y - this._topMargin - heightCaption * 2 - SplitterNode.DEFAULT_SIZE - sizeSheet.y);

		this._messageEditor.setBoundingBoxTo(box);
		this._messageEditor.layout();

		JSG.boxCache.release(box);

		this._messageTools.layout();

		super.layout();
	}
};
