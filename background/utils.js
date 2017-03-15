(function() { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/string': { fuzzyMatch, },
	'node_modules/web-ext-utils/utils/': { reportError, },
	require,
}) => {

/**
 * Removes any tags (not their content) that are not listed in 'allowed' and any attributes except for href (not data: or javascript:) and title (order must be href, title)
 * @param  {string}               html  Untrusted HTML markup.
 * @return {[ string, number, ]}        Sanitized, undangerous, simple HTML and the text length of that HTML.
 */
function sanatize(html) {
	const allowed = /^(?:a|b|big|br|code|div|i|p|pre|li|ol|ul|span|sup|sub|tt|math|semantics|annotation(?:-xml)?|m(?:enclose|error|fenced|frac|i|n|o|over|padded|root|row|s|space|sqrt|sub|supsubsup|table|td|text|tr|under|underover))$/;
	let tagLength = 0;
	const text = html.replace(
		(/<(\/?)(\w+)[^>]*?(\s+href="(?!(?:javascript|data):)[^"]*?")?(\s+title="[^"]*?")?[^>]*?>/g),
		(match, slash, tag, href, title) => {
			tagLength += match.length;
			return allowed.test(tag) ? ('<'+ slash + tag + (title || '') + (href ? href +'target="_blank"' : '') +'>') : '';
		}
	);
	return [ text, html.length - tagLength, ];
}

/**
 * Extracts a #section from an article
 * @param  {string}  html  HTML markup
 * @param  {string}  id    Optional id of the section to extract
 * @return {string}        The HTML section between a header section that contains an `id=${ id }` and the next header section
 */
function extractSection(html, id) {
	if (!id) { return html; }

	// the ids linked tend to be incorrect, so this finds the closest one actually present
	const ids = [ ], getId = (/id="(.*?)"/g); let m; while ((m = getId.exec(html))) { ids.push(m[1]); }
	const _id = fuzzyFind(ids, id);

	const exp = new RegExp(String.raw`id="${ _id }"[^]*?\/h\d>[^]*?(<[a-gi-z][a-z]*>[^]*?)(?:<h\d|$)`, 'i');
	const match = exp.exec(html);
	if (!match) { console.error(`Failed to extract section "${ id }" /${ exp.source }/ from ${ html }`); return html; }
	return match[1];
}

/**
 * Finds the string in an array that best matches the search string.
 * @param  {[string]}  array   The array in which to search.
 * @param  {string}    string  The string for which to search.
 * @return {string}            The string in an array that best matches the search string.
 */
function fuzzyFind(array, string) {
	const norms = array.map(item => fuzzyMatch(string, item, 2));
	return array[norms.indexOf(norms.reduce((a, b) => a >= b ? a : b))];
}


function attr(string) {
	return '"'+ (string || '').replace(/"/g, '&quot;') +'"'; // should be save
}

/* global devicePixelRatio, navigator, document, window, setTimeout, */

function article({ html, thumb = { width: 0, height: 0, }, lang = '', }) {
	const [ text, length, ] = sanatize(html);
	if (!thumb.source && length < 20) { return ''; }
	const minHeight = thumb.height / devicePixelRatio + 20;
	const thumbWidth = thumb.width / devicePixelRatio;
	let   width = Math.sqrt(length * 225 + (thumb.height / devicePixelRatio + 20) * (thumb.width / devicePixelRatio + 20));
	if (thumbWidth && width - thumbWidth < 100) { width = thumbWidth + 24; }
	else if (thumbWidth && width - thumbWidth < 180) { width = thumbWidth + 200; }
	else if (width < 150) { width = 150; }
	return (
		`<style>
			#content { width: ${ width << 0 }px; min-height: ${ minHeight << 0 }px; }
			article>:first-child { margin-top: 0; }
			article>:last-child { margin-bottom: 0; }
			.thumb {
				float: right;
				margin: 3px 3px 3px 10px;
			}`
			+(width - thumb.width < 300 ? `
			article${ width > 300 ? '>:first-child' : '' } {
				hyphens: auto;
				-ms-hyphens: auto;
				-webkit-hyphens: auto;
			}` : '')+`
		</style>`
		+ (thumb.source ? `<img
			src="${ thumb.source }" class="thumb" alt="loading..."
			style="width: ${ thumbWidth }px; height: ${ thumb.height / devicePixelRatio }px;"
		>` : '')
		+ `<article lang="${ lang.replace(/[^\w-]/g, '') || navigator.language }">${ text }</article>`
	);
}

function image({ src, img, title, description, base, }) { return (
	(base ? `<base href=${ attr(base) }>`: '')
	+ `<style>
		#content { padding: 4px; text-align: center; }
		#title { font-variant: small-caps; }
	</style>`
	+ (title ? `<div id="title">${ sanatize(title)[0] }</div>` : '')
	+ (img || `<img src=${ attr(src) } alt=${ attr(title) }>`)
	+ (description ? `<div id="description">${ sanatize(description)[0] }</div>` : '')
	+ `<script>(`+ (() => {
		document.body.classList.add('loading');
		const img = document.querySelector('#content>img');
		img.addEventListener('load', async () => {
			document.body.classList.remove('loading');
			const width = img.naturalWidth  / devicePixelRatio;
			img.style.width = width  +'px';
			document.querySelector('#content').style.width = width + 8 +'px';
			(await window.resize());
			setTimeout(() => window.resize(), 10);
		});
	}) +`)();</script>`
); }


function setFunctionOnChange(loader, options, func, name = func.name) {
	options[name].whenChange(async value => { try {
		loader[name].destroy && loader[name].destroy();
		loader[name] = options[name].values.isSet
		? (await require.async('./evaluator')).newFunction('url', value) : func;
		return loader[name].ready;
	} catch (error) { reportError(`Could not compile "${ name }" for "${ loader.name }"`, error); throw error; } });
}

return {
	sanatize,
	extractSection,
	fuzzyFind,
	article,
	image,
	setFunctionOnChange,
};

}); })();
