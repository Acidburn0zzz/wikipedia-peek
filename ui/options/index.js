'use strict'; // license: MPL-2.0

require.async('common/options').then(options => {
	window.options = options;
	require('web-ext-utils/options/editor')({
		options,
		host: document.querySelector('#options'),
	});
});
