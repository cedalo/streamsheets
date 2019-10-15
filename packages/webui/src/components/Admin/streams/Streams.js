/* eslint-disable no-unused-vars,react/prop-types,react/no-unused-state */
import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Field } from '@cedalo/sdk-streams';
import { withStyles } from '@material-ui/core/styles';
import StreamIcon from '@material-ui/icons/DeviceHub';
import { FormattedMessage } from 'react-intl';

import NotAuthorizedComponent from '../../Errors/NotAuthorizedComponent';
import CombinedResourceListing from '../../base/listing/CombinedResourceListing';
import * as Actions from '../../../actions/actions';
import { accessManager } from '../../../helper/AccessManager';
import styles from '../styles';
import AdminConstants from '../../../constants/AdminConstants';

const options = [
	<FormattedMessage id="Admin.edit" defaultMessage="Edit" />,
	<FormattedMessage id="Admin.delete" defaultMessage="Delete" />,
];

class Streams extends Component {
	constructor(props) {
		super(props);
		this.state = {
			anchorEl: null,

		};
	}

	onFilter = (filter, resources) => (filter && filter.length > 0 ?
		resources.filter(stream => stream.name.toLowerCase().indexOf(filter.toLowerCase()) >= 0) : resources);

	onResourceOpen = (resource) => {
		this.props.openStream(resource);
	};

	handleMenuSelect = (optionIndex, resourceId) => {
		this.props.setConfigurationActive(resourceId, AdminConstants.CONFIG_TYPE.ConsumerConfiguration);
		this.forceUpdate();
		switch (optionIndex) {
		case 0:
			window.open(`/administration/stream/${resourceId}`);
			break;
		case 1: {
			const { deleteDialogOpen } = this.props.appState;
			this.props.setDeleteDialogOpen(!deleteDialogOpen);
			break;
		}
		default:
		}
		this.setState({ anchorEl: null });
	};

	handleNew = (event) => {
		event.preventDefault();
		this.props.toggleDialogAddConfiguration(event);
	};

	render() {
		if (!accessManager.canViewUI(accessManager.PERMISSIONS.STREAM_VIEW)) {
			return <NotAuthorizedComponent target={accessManager.PERMISSIONS.STREAM_VIEW} />;
		}
		let fields = [];
		const streams = [...this.props.streams.consumers,
			...this.props.streams.producers];
		const consumers = streams.map((stream) => {
			const status = (stream.status && stream.status.streamEventType)
					|| this.props.streams.statusMap[stream.id] || 'dispose';
			stream.status = stream.disabled ? 'DISABLED' : status;
			stream.status = stream.status.toUpperCase().replace('CONNECTOR_', '');
			fields = [
				{ label: 'Status', key: 'status' },
				{ label: 'Owner', key: 'owner' },
				{ label: <FormattedMessage id="Admin.connector" defaultMessage="Connector" />, key: 'connector.name' },
				{ label: 'Provider', key: 'connector.provider.name' },
				{ label: 'dataFormat', key: 'dataFormat' },
				{ label: 'labelAttribute', key: 'labelAttribute' },
				{ label: 'idAttribute', key: 'idAttribute' },
			];
			if (stream.connector) {
				const connector = this.props.streams.connectors.find(p => p.id === stream.connector.id);
				const provider = this.props.streams.providers
					.find(p => connector && connector.provider && p.id === connector.provider.id);
				if (provider) {
					provider.definition.stream.forEach((f) => {
						const field = new Field(f);
						if (f.type !== 'PASSWORD') {
							fields.push({ label: field.getLabel(), key: `${field.id}` });
						}
					});
					provider.definition.connector.forEach((f) => {
						const field = new Field(f);
						if (f.type !== 'PASSWORD') {
							fields.push({ label: field.getLabel(), key: `${field.id}` });
						}
					});
				}
				return {
					...stream,
					connector: connector ? {
						...connector,
						provider: {
							...provider,
							name: (provider) ?
								provider.name : {
									error:
									<FormattedMessage
										id="Admin.providerNotAvailable"
										defaultMessage="Provider {providerId} not available"
										values={{ providerId: connector.provider.id }}
									/>,
								},
						},
					} : {},
				};
			}
			return {
				...stream,
			};
		});

		return (
			<CombinedResourceListing
				type="admin"
				fields={fields}
				label={<FormattedMessage
					id="Dashboard.streams"
					defaultMessage="Streams"
				/>}
				handleNew={accessManager.canViewUI(accessManager.PERMISSIONS.STREAM_ADD) ? this.handleNew : false}
				titleAttribute="name"
				resources={consumers}
				icon={<StreamIcon />}
				menuOptions={options}
				onFilter={this.onFilter}
				onMenuSelect={this.handleMenuSelect}
				onResourceOpen={this.onResourceOpen}
				headerBackgroundColor="#0CC34A"
				handleReload={this.props.reloadAllStreams}
				// filters={this.getFilters()}
			/>
		);
	}
}

function mapStateToProps(state) {
	return {
		appState: state.appState,
		streams: state.streams,
		adminSecurity: state.adminSecurity,
	};
}
function mapDispatchToProps(dispatch) {
	return bindActionCreators({ ...Actions }, dispatch);
}

export default withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(Streams));
