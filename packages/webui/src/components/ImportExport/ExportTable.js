import Checkbox from '@material-ui/core/Checkbox';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import PropTypes from 'prop-types';
import React from 'react';

export default function ExportTable(props) {
	const numResources = props.resources.length;
	const numSelected = props.selected.size;
	return (
		<Table style={{ background: 'white', overflowY: 'auto' }}>
			<TableHead>
				<TableRow>
					<TableCell padding="checkbox">
						<Checkbox
							indeterminate={numSelected > 0 && numSelected < numResources}
							checked={numSelected > 0 && numSelected >= numResources}
							onChange={props.onSelectAll}
						/>
					</TableCell>
					<TableCell>Name</TableCell>
					{props.columns.map((column) => column.header)}
				</TableRow>
			</TableHead>
			<TableBody>
				{props.resources.map((resource) => {
					const isSelected = props.selected.has(resource.id);
					return (
						<TableRow
							onClick={() => props.onSelect(resource.id)}
							selected={isSelected}
							role="checkbox"
							aria-checked={isSelected}
							key={resource.id}
						>
							<TableCell padding="checkbox">
								<Checkbox checked={isSelected} />
							</TableCell>
							<TableCell>{resource.name}</TableCell>
							{props.columns.map((column) => column.cellCreator(resource))}
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}

ExportTable.propTypes = {
	onSelectAll: PropTypes.func.isRequired,
	// onSelect: PropTypes.func.isRequired,
	resources: PropTypes.arrayOf(
		PropTypes.shape({
			id: PropTypes.string,
			name: PropTypes.string,
		}),
	).isRequired,
	selected: PropTypes.instanceOf(Set).isRequired,
	columns: PropTypes.arrayOf(
		PropTypes.shape({
			header: PropTypes.element,
			cellCreator: PropTypes.func,
		}),
	),
};

ExportTable.defaultProps = {
	columns: [],
};
