import React, { Component } from 'react';
import PropTypes from 'prop-types';
import TextField from '@material-ui/core/TextField';
import Fab from '@material-ui/core/Fab';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import FormHelperText from '@material-ui/core/FormHelperText';

const styles = {
	fieldSet: {
		margin: '20px 0px'
	},
	legend: {
	},
	fab: {
		width: '25px',
		height: '20px',
		minHeight: '25px',
		marginTop: '15px',
		marginLeft: '10px',
	},
	textField: {
		width: 'calc(100% - 40px)',
	},
};
export default class MultipleTextField extends Component {
	static propTypes = {
		values: PropTypes.arrayOf(PropTypes.string),
		onChange: PropTypes.func,
		label: PropTypes.element,
		name: PropTypes.string,
		disabled: PropTypes.bool,
	};

	static defaultProps = {
		label: undefined,
		values: [],
		onChange: undefined,
		name: new Date().getMilliseconds(),
		disabled: false,
	};

	constructor(props) {
		super(props);
		this.errors = [];
		this.state = {
			values: props.values || [],
		};
	}

	onChangeData = idx => (event) => {
		const newValues = this.state.values.map((value, sidx) => {
			if (idx !== sidx) return value;
			this.errors[idx] = null;
			return event.target.value;
		});
		if (typeof this.props.onChange === 'function') {
			const fakeEvent = {
				target: {
					name: this.props.name,
					value: newValues,
					type: 'multitextfield',
				},
			};
			this.props.onChange(fakeEvent, newValues, idx, event);
		}
		this.setState({ values: newValues });
	};

	handleAddItem = () => {
		const values = this.state.values.concat(['']);
		if (typeof this.props.onChange === 'function') {
			const fakeEvent = {
				target: {
					name: this.props.name,
					value: values,
					type: 'multitextfield',
				},
			};
			this.props.onChange(fakeEvent, values, this.state.values.length);
		}
		this.setState({
			values,
		});
	};

	handleRemoveItem = idx => () => {
		const values = this.state.values.filter((s, sidx) => idx !== sidx);
		this.setState({
			values,
		});
		if (typeof this.props.onChange === 'function') {
			const fakeEvent = {
				target: {
					name: this.props.name,
					value: values,
					type: 'multitextfield',
				},
			};
			this.props.onChange(fakeEvent, values, idx);
		}

	};

	render() {
		const { label, name, disabled } = this.props;
		const { values } = this.state;
		return (
			<fieldset style={styles.fieldSet}>
				<legend style={styles.legend}>{label}</legend>
				{values.map((value, idx) => (
					<div>
						<TextField
							disabled={disabled}
							name={name}
							error={!!this.errors[idx]}
							value={value}
							onChange={this.onChangeData(idx)}
							style={styles.textField}
						/>
						<Fab
							size="small"
							onClick={this.handleRemoveItem(idx)}
							aria-label="Add"
							style={styles.fab}
						>
							<DeleteIcon/>
						</Fab>
						{this.errors[idx]
							?
							<FormHelperText>{this.errors[idx]}</FormHelperText>
							: null}
					</div>
				))}
				<Fab
					size="small"
					onClick={this.handleAddItem}
					aria-label="Remove"
					style={{
						...styles.fab,
						marginTop: '10px',
					}}

				>
					<AddIcon/>
				</Fab>
			</fieldset>
		);
	}
}
