import {
	default as JSG,
	Notification,
	NotificationCenter,
	ExecuteFunctionCommand,
	StreamSheet
} from '@cedalo/jsg-core';

import Interaction from './Interaction';
import SelectionProvider from '../view/SelectionProvider';

export default class SheetGraphItemEventInteraction extends Interaction {
	constructor() {
		super();

		this._controller = undefined;
		this._feedback = undefined;
	}

	deactivate(viewer) {
		viewer.removeInteractionFeedback(this._feedback);

		this._feedback = undefined;

		super.deactivate(viewer);
	}

	onMouseDown(event, viewer) {
		this.handleEvent(event, viewer, 'ONMOUSEDOWN');
		this.handleControlEvent(event, viewer, 'ONMOUSEDOWN');
	}

	onMouseDrag(event, viewer) {
		this.handleControlEvent(event, viewer, 'ONMOUSEDRAG');
	}

	onMouseDoubleClick(event, viewer) {
		this.handleEvent(event, viewer, 'ONDOUBLECLICK');
	}

	onMouseUp(event, viewer) {
		this.handleEvent(event, viewer, 'ONMOUSEUP');
		this.handleEvent(event, viewer, 'ONCLICK');
		this.handleControlEvent(event, viewer, 'ONMOUSEUP');
		this.handleControlEvent(event, viewer, 'ONCLICK');

		super.onMouseUp(event, viewer);
	}

	setRepaintOnDrag(event) {
		event.doRepaint = false;
	}

	willFinish(event, viewer) {
		super.willFinish(event, viewer);
	}

	cancelInteraction(event, viewer) {
		if (event !== undefined) {
			event.doRepaint = true;
		}
		this._controller = undefined;

		super.cancelInteraction(event, viewer);
	}

	handleEvent(event, viewer, name) {
		const events = this._controller.getModel()._sheetEvents;
		if (events && events instanceof Array) {
			events.forEach((sheetEvent) => {
				if (sheetEvent.event === name) {
					const sheet = this.getSheet();
					if (sheet) {
						const cmd = new ExecuteFunctionCommand(sheet, sheetEvent.func);
						viewer.getInteractionHandler().execute(cmd);
						if (
							sheet
								.getGraph()
								.getMachineContainer()
								.getMachineState()
								.getValue() === 0
						) {
							event.isConsumed = true;
							event.hasActivated = true;
						}
					}
				}
			});
		}
	}

	handleControlEvent(event, viewer, name) {
		const item = this._controller.getModel();
		const sheet = this.getSheet(this._controller);
		if (sheet) {
			if (
				sheet
					.getGraph()
					.getMachineContainer()
					.getMachineState()
					.getValue() === 0 &&
				this._controller.getView().handleEvent
			) {
				this._controller.getView().handleEvent(viewer, event, sheet, name);
				event.isConsumed = true;
				event.hasActivated = true;
				NotificationCenter.getInstance().send(
					new Notification(SelectionProvider.SELECTION_CHANGED_NOTIFICATION, {
						item,
						updateFinal: true
					})
				);
			}
		}
	}

	getSheet() {
		let sheet = this._controller.getModel().getParent();
		while (sheet && !(sheet instanceof StreamSheet)) {
			sheet = sheet.getParent();
		}

		return sheet;
	}
}
