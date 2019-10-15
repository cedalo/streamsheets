import { Table, TableBody, TableCell, TableHead, TableRow, TableSortLabel } from '@material-ui/core';
import moment from 'moment';
import PropTypes from 'prop-types';
import React from 'react';
import { FormattedMessage } from 'react-intl';
import { userShape } from './UserPropTypes';

const USER_TABLE_COLUMNS = [
	{ id: 'username', key: 'Admin.User.username' },
	{ id: 'email', key: 'Admin.User.email' },
	{ id: 'firstName', key: 'Admin.User.firstName' },
	{ id: 'lastName', key: 'Admin.User.lastName' },
	{ id: 'lastModified', key: 'Admin.User.lastModified' },
];

// Workaround for Babel restriction, see https://github.com/yahoo/babel-plugin-react-intl/issues/119
function FormattedMessageFixed(props) {
	return <FormattedMessage {...props} />;
}

export const UserTable = (props) => {
	const { users, onSelectUser, onSort, sortBy, sortDirection } = props;

	return (
		<Table>
			<TableHead>
				<TableRow>
					{USER_TABLE_COLUMNS.map((column) => (
						<TableCell key={column.id} sortDirection={sortBy === column.id ? sortDirection : false}>
							<TableSortLabel
								active={sortBy === column.id}
								direction={sortDirection}
								onClick={() => onSort(column.id)}
							>
								<FormattedMessageFixed id={column.key} defaultMessage={column.key} />
							</TableSortLabel>
						</TableCell>
					))}
				</TableRow>
			</TableHead>
			<TableBody>
				{users.map((user) => (
					<TableRow hover key={user.id} onClick={() => onSelectUser(user.id)} style={{ cursor: 'pointer' }}>
						<TableCell>
							<b>{user.username}</b>
						</TableCell>
						<TableCell>{user.email}</TableCell>
						<TableCell>{user.firstName}</TableCell>
						<TableCell>{user.lastName}</TableCell>
						<TableCell>{moment(user.lastModified).fromNow()}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
};

UserTable.propTypes = {
	users: PropTypes.arrayOf(userShape).isRequired,
	sortBy: PropTypes.string,
	sortDirection: PropTypes.string,
	onSelectUser: PropTypes.func.isRequired,
	onSort: PropTypes.func.isRequired,
};

UserTable.defaultProps = {
	sortBy: undefined,
	sortDirection: undefined,
};
