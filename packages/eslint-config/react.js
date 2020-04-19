module.exports = {
	extends: [
		'eslint-config-airbnb',
		'eslint-config-airbnb/hooks',
		'eslint-config-prettier',
		'eslint-config-prettier/react'
	].map(require.resolve),
	parser: 'babel-eslint',
	rules: {
		'no-tabs': 0,
		'no-undef': 0,
		'react/jsx-no-undef': 1,
		'import/no-named-default': 1,
		'import/no-named-as-default': 1,
		'import/no-named-as-default-member': 1,
		'no-underscore-dangle': 0,
		'class-methods-use-this': 0,
		'no-param-reassign': 0,
		'jsx-a11y/no-static-element-interactions': 1,
		'react/jsx-filename-extension': [
			1,
			{
				extensions: ['.js', '.jsx']
			}
		],
		// TODO: Fix the following
		'lines-between-class-members': 0,
		'prefer-destructuring': 0,
		'max-classes-per-file': 0,
		'import/order': 0,
		'comma-dangle': 0,
		'no-restricted-globals': 0,
		'prefer-object-spread': 0,
		'react/destructuring-assignment': 0,
		'no-else-return': 0,
		'react-hooks/exhaustive-deps': 0,
		'react/static-property-placement': 0,
		'react/jsx-fragments': 0,
		'react/forbid-prop-types': 0,
		'react/no-access-state-in-setstate': 0,
		'react/jsx-props-no-spreading': 0,
		'react/sort-comp': 0,
		'react/prop-types': 0,
		'no-async-promise-executor': 0,
		'react/state-in-constructor': 0,
		'import/no-useless-path-segments': 0,
		'import/no-cycle': 0,
		'no-useless-catch': 0,
		'jsx-a11y/control-has-associated-label': 0
	},
	parserOptions: {
		ecmaFeatures: {
			experimentalObjectRestSpread: true
		}
	}
};
