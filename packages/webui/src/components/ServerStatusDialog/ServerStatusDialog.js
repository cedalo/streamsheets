import CircularProgress from '@material-ui/core/CircularProgress';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import ReconnectTimerIcon from '@material-ui/icons/Timelapse';
import PropTypes from 'prop-types';
import React from 'react';
import { FormattedMessage } from 'react-intl';
import { connect } from 'react-redux';

function ServerStatusDialog(props) {
	const {
		streamsLoaded,
		machinesLoaded,
		isConnected,
		disconnectedServices,
		allServicesConnected,
		open,
		connectingIn,
	} = props;
	const getDialogContent = () => {
		if (!allServicesConnected) {
			return (
				<React.Fragment>
					<FormattedMessage
						id="Status.ServiceConnecting"
						defaultMessage="The following services are not available: "
					/>
					<br />
					{`${disconnectedServices}`}
				</React.Fragment>
			);
		} else if (!isConnected) {
			return <FormattedMessage id="Status.Connecting" defaultMessage="Connecting ..." />;
		} else if (!machinesLoaded) {
			return <FormattedMessage id="Status.LoadingMachines" defaultMessage="Loading machines ..." />;
		} else if (!streamsLoaded) {
			return <FormattedMessage id="Status.LoadingStreams" defaultMessage="Loading data sources ..." />;
		}
		return null;
	};

	const content = getDialogContent();

	return (
		<Dialog fullWidth mode="indeterminate" size={50} open={open}>
			<DialogContent style={{ textAlign: 'center' }}>
				<CircularProgress />
				{content ? (
					<div>
						<DialogContentText>{content}</DialogContentText>
					</div>
				) : null}
				{connectingIn ? (
					<div>
						<ReconnectTimerIcon />
						<DialogContentText>
							<FormattedMessage
								id="lostConnection"
								defaultMessage="Lost connection, reconnecting in {connectingIn}"
								values={{ connectingIn }}
							/>
						</DialogContentText>
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

ServerStatusDialog.propTypes = {
	connectingIn: PropTypes.number,
	open: PropTypes.bool.isRequired,
	streamsLoaded: PropTypes.bool.isRequired,
	machinesLoaded: PropTypes.bool.isRequired,
	isConnected: PropTypes.bool.isRequired,
	allServicesConnected: PropTypes.bool.isRequired,
	disconnectedServices: PropTypes.string.isRequired,
};

ServerStatusDialog.defaultProps = {
	connectingIn: undefined,
};

function mapStateToProps(state, ownProps) {
	const streamsLoaded = state.streams.fetched;
	const machinesLoaded = state.machines.fetched;
	const { isConnected } = state.monitor;
	const { allServicesConnected } = state.meta;
	const disconnectedServices = state.meta.disconnectedServices.join(', ');
	return {
		open:
			!allServicesConnected ||
			(!ownProps.isMachineDetailPage && (!isConnected || !machinesLoaded || !streamsLoaded)),
		streamsLoaded,
		machinesLoaded,
		isConnected,
		allServicesConnected,
		disconnectedServices,
		connectingIn: state.monitor.connectingIn,
	};
}

export default connect(mapStateToProps)(ServerStatusDialog);
