/* eslint-disable import/prefer-default-export */
import * as ActionTypes from '../constants/ActionTypes';
import ConfigManager from '../helper/ConfigManager';
import gatewayClient from '../helper/GatewayClient';
import { accessManager } from '../helper/AccessManager';

const CONFIG = ConfigManager.config.gatewayClientConfig;

export function getAllUsers() {
	return async (dispatch) => {
		dispatch({ type: ActionTypes.USERS_FETCH });
		try {
			const res = await gatewayClient.authEntityGet({
				type: 'user',
				query: { },
			});
			dispatch({ type: ActionTypes.USERS_FETCHED, users: res.response });
			return res.response;
		} catch (error) {
			dispatch({ type: ActionTypes.ERROR, error });
			return error;
		}
	};
}

export function removeUserByUserId(userId) {
	return async (dispatch) => {
		dispatch({ type: ActionTypes.USERS_REMOVE });
		try {
			const res = await gatewayClient.authEntityDelete({
				type: 'user',
				id: userId,
			});
			dispatch({ type: ActionTypes.USERS_REMOVED, result: res.response, userId });
			return res.response;
		} catch (error) {
			dispatch({ type: ActionTypes.ERROR, error });
			return error;
		}
	};
}

export function createUser(user) {
	return async (dispatch) => {
		try {
			dispatch({ type: ActionTypes.USERS_SAVE });
			user.lastModified = new Date().toISOString();
			const result = await gatewayClient.authEntityCreate({
				type: 'user',
				user,
			});
			dispatch({ type: ActionTypes.USERS_SAVED, user, result: result.response });
			return { result: result.response, user };
		} catch (error) {
			dispatch({ type: ActionTypes.ERROR, error });
			throw error;
		}
	};
}

export function updateUser(user) {
	return async (dispatch) => {
		try {
			user.lastModified = new Date().toISOString();
			dispatch({ type: ActionTypes.USERS_SAVE });
			const result = await gatewayClient.authEntityUpdate({
				type: 'user',
				user,
			});
			dispatch({ type: ActionTypes.USERS_SAVED, user, result: result.response });
			return { result: result.response, user };
		} catch (error) {
			dispatch({ type: ActionTypes.ERROR, error });
			return error;
		}
	};
}

export function getUserByUserId(userId) {
	return (dispatch) => {
		dispatch({ type: ActionTypes.USER_FETCH });
		return gatewayClient.authEntityGet({
			type: 'user',
			query: { userId },
		})
			.then((res) => {
				dispatch({ type: ActionTypes.USER_FETCHED, user: res.response });
				accessManager.updateLocalStorageFromSession(res.session); // TODO: revisit
				return Promise.resolve(res.response[0]);
			})
			.catch((err) => {
				dispatch({ type: ActionTypes.ERROR, err });
				throw err;
			});
	};
}

export function saveCurrentUser(user) {
	return async (dispatch) => {
		try {
			user.lastModified = new Date().toISOString();
			dispatch({ type: ActionTypes.USER_SAVE });
			await gatewayClient.authEntityUpdate({
				type: 'user',
				user,
			});
			dispatch({ type: ActionTypes.USER_SAVED, user });
			return user;
		} catch (err) {
			dispatch({ type: ActionTypes.ERROR, err });
			throw err;
		}
	};
}

export function saveUserSettings(settings) {
	return async (dispatch, getState) => {
		dispatch({
			type: ActionTypes.USER_SETTINGS_SAVE,
		});
		const { id } = getState().user.user;
		const mutation = `
		mutation UpdateUserSettings($id: ID!, $settings: UserSettingsInput!) {
			updateUserSettings(id: $id, settings: $settings) {
				success
				code
				fieldErrors {
					locale
				}
			}
		}
		`;

		try {
			await gatewayClient.graphql(mutation, { id, settings });
			dispatch({ type: ActionTypes.USER_SETTINGS_SAVED });
		} catch (error) {
			dispatch({ type: ActionTypes.ERROR, err });
		}
	};
}

export function setUser(user) {
	return (dispatch) => {
		dispatch({ type: ActionTypes.USER_SET, user });
	};
}

export function setUserSettings(settings) {
	return (dispatch) => {
		dispatch({ type: ActionTypes.USER_SETTING_SET, settings });
	};
}

export function login(credentials) {
	return (dispatch) => {
		dispatch({ type: ActionTypes.USER_LOGIN });
		return gatewayClient.connect(CONFIG)
			.then(() => gatewayClient.authenticate(credentials))
			.then((resp) => {
				dispatch({ type: ActionTypes.USER_LOGIN_RESPONSE, response: resp });
				const response = resp.response || resp;
				if (!response.error && response.token) {
					const { session } = response;
					accessManager.loginUI(response.token, response.user, session);
					return true;
				}
				return response;
			})
			.catch(({ error }) => {
				dispatch({ type: ActionTypes.ERROR });
				return {
					error
				};
			});
	};
}

export function logout(token) {
	return async (dispatch) => {
		dispatch({ type: ActionTypes.USER_LOGOUT, token });

		try {
			await gatewayClient.connect({
				...CONFIG
			});
			gatewayClient.logout(token);
			// accessManager.logoutUI()
		} catch(err) {
			dispatch({ type: ActionTypes.ERROR, err });
			throw err;
		}

	};
}
