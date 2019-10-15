/* eslint-disable react/prop-types */
import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Avatar from '@material-ui/core/Avatar';
import * as Colors from '@material-ui/core/colors';
import { FormattedMessage } from 'react-intl';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Select from '@material-ui/core/Select';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Button from '@material-ui/core/Button';
import ListItemText from '@material-ui/core/ListItemText';
import IconButton from '@material-ui/core/IconButton';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import CircularProgress from '@material-ui/core/CircularProgress';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableBody from '@material-ui/core/TableBody';
import Table from '@material-ui/core/Table';
import Tooltip from '@material-ui/core/Tooltip';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import Typography from '@material-ui/core/es/Typography/Typography';

import * as Actions from '../../actions/actions';
import { graphManager } from '../../GraphManager';

const TabContainer = (props) => (
		<Typography component="div" style={{ padding: 8 * 3 }}>
			{props.children}
		</Typography>
	);

TabContainer.propTypes = {
	children: PropTypes.node.isRequired,
};
const VERSION = process.env.REACT_APP_VERSION || 'unknown';
// const BUILD_NUMBER = process.env.REACT_APP_BUILD_NUMBER || 'unknown';

/**
 * A modal dialog can only be closed by selecting one of the actions.
 */
export class SettingsMenu extends React.Component {

	static getDerivedStateFromProps(props, state) {
		const { permissions } = props.adminSecurity;
		const { user } = props.user;
		if (!state.loaded && user && user.settings && permissions.length > 0) {
			return {
				...state,
				loaded: true
			};
		}
		return { ...state };
	}

	constructor(props) {
		super(props);
		this.state = {
			experimental: false,
			prevLocale: 'en',
			tab: 'status'
		};
		this.showHelpDialog = this.showHelpDialog.bind(this);
		this.logout = this.logout.bind(this);
	}

	showPreferencesDialog = () => {
		this.setState({ prevLocale: this.props.locale });
		this.props.setAppState({
			showLoading: false,
			openMoreSettingMenu: false,
		});
		this.props.setAppState({ openPreferences: true });
	};

	handlePreferencesCancel = () => {
		this.props.setAppState({ openPreferences: false });
		this.props.setUserSettings({ locale: this.state.prevLocale });
	};

	handlePreferencesSubmit = () => {
		this.props.setAppState({ openPreferences: false });
		const { user } = this.props.user;
		this.props.saveUserSettings(user.settings);
	};

	showHelpDialog = () => {
		this.setState({ experimental: this.props.appState.experimental });
		this.setState({ debug: this.props.appState.debug });
		this.props.setAppState({
			showLoading: false,
			openMoreSettingMenu: false,
		});
		this.props.setAppState({ openHelp: true });
	};

	showLicenseAgreement = () => {
		window.location.href = "/license_DE.pdf";
	}

	logout = () => {
		this.props.openPage('/logout');
	};

	handleCloseHelp = () => {
		this.props.setAppState({
			showLoading: true,
			experimental: this.state.experimental,
			debug: this.state.debug,
			openHelp: false
		});
		localStorage.setItem('experimental', this.state.experimental);
		if(this.state.debug === true) {
			localStorage.setItem('DLDEBUG', this.state.debug);
		} else {
			localStorage.removeItem('DLDEBUG');
		}
		graphManager.updateDimensions();
	};

	handleExperimental = () => (event, state) => {
		this.setState({ experimental: state });
	};

	handleTabChange = (event, tab) => {
		this.setState({tab})
	};

	async handleLanguageChange(event) {
		const locale = event.target.value;
		this.props.setUserSettings({
			locale,
		});
	}

	renderServiceDetails(service) {
		return service && service.instances && Object.keys(service.instances).length > 0 ?
			Object.keys(service.instances).map((key) => {
				const instance = service.instances[key];
				return <TableRow
					key={instance.id}
				>
					<TableCell>
						<Tooltip>
							<strong>{service.name}</strong>
						</Tooltip>
					</TableCell>
					<TableCell>{service.version}</TableCell>
					{/* <TableCell>{service.buildNumber}</TableCell> */}
					<TableCell>{instance.status === 'running' ? <CheckCircleIcon style={{color: 'green'}} /> : ''}</TableCell>
					<TableCell>{instance.id}</TableCell>
				</TableRow>
			}
			)
			: <TableRow>
				<TableCell>N/A</TableCell>
				<TableCell>N/A</TableCell>
				{/* <TableCell>N/A</TableCell> */}
				<TableCell>N/A</TableCell>
				<TableCell>N/A</TableCell>
			</TableRow>
	}

	render() {
		const { displayName } = JSON.parse(localStorage.getItem('user')) || {};
		const { tab } = this.state;
		const { user } = this.props.user;
		return (
			<div
				style={{
					marginLeft: '20px',
				}}
			>
				<Tooltip enterDelay={300} title={<FormattedMessage id="Tooltip.SettingsMenu" defaultMessage="User Settings and Info" />}>
					<div>
						<IconButton
							aria-label="More"
							color="inherit"
							aria-owns={this.props.appState.openMoreSettingMenu ? 'long-menu' : null}
							aria-haspopup="true"
							onClick={event =>
								this.props.setAppState({ anchorEl: event.currentTarget, openMoreSettingMenu: true })}
						>
							<Avatar alt="Remy Sharp" src="images/avatar.png" />
						</IconButton>
					</div>
				</Tooltip>
				<Menu
					id="long-menu"
					anchorEl={this.props.appState.anchorEl}
					open={this.props.appState.openMoreSettingMenu}
					onClose={() => this.props.setAppState({ anchorEl: null, openMoreSettingMenu: false })}
				>
					<Card
						style={{
							marginTop: '-8px',
						}}
					>
						<CardHeader
							title={<div style={{ color: Colors.grey[50] }}>{ displayName}</div>}
							subheader={<address style={{ color: Colors.grey[50] }}>{user ? user.mail : ""}</address>}
							avatar={<Avatar alt="Remy Sharp" src="images/avatar.png" />}
							style={{
								backgroundColor: Colors.blue[800],
							}}
						/>
					</Card>
					<MenuItem onClick={this.showPreferencesDialog}>
						<ListItemText primary={<FormattedMessage id="UserPreferences" defaultMessage="User Preferences" />} />
					</MenuItem>
					<MenuItem onClick={this.showHelpDialog}>
						<ListItemText primary={<FormattedMessage id="Info" defaultMessage="Info" />} />
					</MenuItem>
					<MenuItem onClick={this.showLicenseAgreement}>
						<ListItemText primary={<FormattedMessage id="Setup.LicenseAgreement.DownloadLicense" defaultMessage="Download license" />} />
					</MenuItem>
					<MenuItem onClick={this.logout}>
						<ListItemText primary={<FormattedMessage id="Logout" defaultMessage="Logout" />} />
					</MenuItem>
				</Menu>
				<Dialog
					open={this.props.appState.openPreferences}
					onClose={this.handlePreferencesCancel}
				>
					<DialogTitle>
						<FormattedMessage
							id="DialogPreferences.title"
							defaultMessage="User Preferences"
						/>
					</DialogTitle>
					<DialogContent style={{
						minWidth: '500px',
						minHeight: '100px',
					}}
					>
						<div
							style={{
								position: 'relative',
							}}
						>
							{ this.props.appState.showLoading ? (
								<div
									style={{
										width: '100%',
										height: '100%',
										position: 'absolute',
										boxSizing: 'border-box',
										zIndex: 10,
										background: 'rgba(255, 255, 255, 0.8)',
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										justifyContent: 'center',
									}}
								>
									<CircularProgress color={Colors.blue[800]} />
								</div>
							) : null }
							{ user && user.settings ? (
								<div>
									<FormControl style={{ marginTop: '20px' }}>
										<InputLabel htmlFor="language-selection">
											<FormattedMessage
												id="Language"
												defaultMessage="Language"
											/>
										</InputLabel>
										<Select
											value={this.props.locale}
											onChange={event => this.handleLanguageChange(event)}
											fullWidth
											input={<Input
												defaultValue={ !this.props.locale ? "en" : undefined }
												name="language-selection"
												id="language-selection"
											/>}
										>
											<MenuItem value="en">
												<FormattedMessage
													id="English"
													defaultMessage="English"
												/>
											</MenuItem>
											<MenuItem value="de">
												<FormattedMessage
													id="German"
													defaultMessage="German"
												/>
											</MenuItem>
										</Select>
									</FormControl>
								</div>) : null}
						</div>
					</DialogContent>
					<DialogActions>
						<Button
							color="primary"
							onClick={this.handlePreferencesCancel}
						>
							<FormattedMessage
								id="Cancel"
								defaultMessage="Cancel"
							/>
						</Button>
						<Button
							color="primary"
							onClick={this.handlePreferencesSubmit}
						>
							<FormattedMessage
								id="OK"
								defaultMessage="OK"
							/>
						</Button>
					</DialogActions>
				</Dialog>
				<Dialog
					open={this.props.appState.openHelp}
					onClose={this.handleCloseHelp}
					fullWidth
					maxWidth="md"
				>
					<DialogTitle>
						<FormattedMessage
							id="SettingsMenu.help.header"
							defaultMessage="Info"
						/>
					</DialogTitle>
					<DialogContent>
						<DialogContentText>
							<div
								style={{
									position: 'relative',
								}}
							>
								<Tabs value={tab} onChange={this.handleTabChange}>
									<Tab value="status" label={<FormattedMessage
										id="Info.SystemStatusTitle"
										defaultMessage="System status and version"
									/>} wrapped />
								</Tabs>

								{ tab === 'status' && <TabContainer>
									<Table>
										<TableHead>
											<TableRow>
												<TableCell>
													<FormattedMessage
														id="Product.name.header"
														defaultMessage="Product name"
													/>
												</TableCell>
												<TableCell>
													<FormattedMessage
														id="Version"
														defaultMessage="Version"
													/>
												</TableCell>
												<TableCell />
												<TableCell />
											</TableRow>
										</TableHead>
										<TableBody>
											<TableRow>
												<TableCell>
													<strong>
														<FormattedMessage
															id="Product.name"
															defaultMessage="Streamsheets"
														/>
													</strong>
												</TableCell>
												<TableCell>
													{VERSION}
												</TableCell>
												<TableCell />
												<TableCell />
											</TableRow>
										</TableBody>
									</Table>
									<Table>
										<TableHead>
											<TableRow>
												<TableCell>
													<FormattedMessage
														id="Component"
														defaultMessage="Component"
													/>
												</TableCell>
												<TableCell>
													<FormattedMessage
														id="Version"
														defaultMessage="Version"
													/>
												</TableCell>
												{/* <TableCell>
												<FormattedMessage
													id="BuildNumber"
													defaultMessage="BuildNumber"
												/>
											</TableCell> */}
												<TableCell>
													<FormattedMessage
														id="Status"
														defaultMessage="Status"
													/>
												</TableCell>
												<TableCell>
													<FormattedMessage
														id="Instances"
														defaultMessage="Instances"
													/>
												</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{/* TODO: make this table more generic to display any number of services */}
											<TableRow>
												<TableCell><strong>Web UI</strong></TableCell>
												<TableCell>{VERSION}</TableCell>
												{/* <TableCell>{BUILD_NUMBER}</TableCell> */}
												<TableCell>
													<CheckCircleIcon style={{color: 'green'}}/>
												</TableCell>
												<TableCell>webui</TableCell>
											</TableRow>
											{
												this.props.meta.services && 
												Object.values(this.props.meta.services)
													.sort((a, b) => a.name.localeCompare(b.name))
													.map((service) => this.renderServiceDetails(service)
												)
											}
										</TableBody>
									</Table>
								</TabContainer>}
							</div>
						</DialogContentText>
						<FormControlLabel
							style={{
								marginTop:'10px',
							}}
							control={
								<Checkbox
									checked={this.state.experimental}
									onChange={this.handleExperimental()}
								/>
							}
							label={<FormattedMessage
								id="Settings.ExperimentalFeatures"
								defaultMessage="Experimental Features"
							/>}
						/>
						<FormControlLabel
							style={{
								marginTop:'10px',
							}}
							control={
								<Checkbox
									checked={this.state.debug}
									onChange={() => this.setState({debug: !this.state.debug})}
								/>
							}
							label={<FormattedMessage
								id="Settings.Debug"
								defaultMessage="Debug Mode"
							/>}
						/>
					</DialogContent>
					<DialogActions>
						<Button
							color="primary"
							onClick={this.handleCloseHelp}
						>
							<FormattedMessage
								id="Close"
								defaultMessage="Close"
							/>
						</Button>
					</DialogActions>
				</Dialog>
			</div>
		);
	}
}

function mapStateToProps(state) {
	return {
		appState: state.appState,
		machine: state.machine,
		monitor: state.monitor,
		meta: state.meta,
		user: state.user,
		adminSecurity: state.adminSecurity,
		locale: state.locales.locale
	};
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators(Actions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(SettingsMenu);
