(() => { 'use strict'; define(function*({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/chrome/': { applications, },
	'node_modules/web-ext-utils/options/editor': Editor,
	'node_modules/es6lib/network': { HttpRequest, },
	'common/options': options,
}) {

window.options = options;

new Editor({
	options,
	host: document.querySelector('#options'),
});

const _package = JSON.parse((yield HttpRequest('/package.json')).response);
const manifest = (window.browser || window.chrome).runtime.getManifest();

set('title',              manifest.name);
set('version',            manifest.version);
set('license',            manifest.license);
set('author',             manifest.author);
set('repo',       'href', _package.repository.url);
set('appName',            applications.current.replace(/^./, c => c.toUpperCase()));
set('appVersion',         applications.version);

function set(key, attr, value) {
	value = arguments[arguments.length - 1];
	attr = arguments.length > 2 ? attr : 'textContent';
	const element = document.querySelector('#'+ key);
	element && (element[attr] = value);
}


}); })();
