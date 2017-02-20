(function() { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/network': { HttpRequest, },
	'background/utils': { sanatize, fuzzyFind, article, },
	module,
}) => {

let allOptions; require.async('common/options').then(_ => {
	allOptions = _;
});

const Self = {
	name: module.id.split('/').pop(),
	title: `Wikia.com`,
	description: ``,

	priority: 1,
	includes: [ '*://*.wikia.com/wiki/*', ],

	async load(url) {
		url = new URL(url);
		const title = url.pathname.replace(/^\/(?:wiki\/)?/, '');
		if (url.search /*|| title.includes(':')*/) { return null; }
		const section = url.hash.slice(1);
		return Self.doLoad('https://'+ url.host +'/api', title, section); // always use https
	},

	async doLoad(api, title, section) {

		const thumbPx = allOptions.thumb.children.size.value * devicePixelRatio;

		title.includes(',') && console.warn(`The title "${ title }" contains commas and may not load correctly`);

		const src = (
			api +'/v1/Articles/Details/?abstract=500' // 500 is max
			+ '&width='+ thumbPx // +'&height='+ thumbPx
			+ '&titles='+ title
		);

		const { response, } = (await HttpRequest({ src, responseType: 'json', }));
		const page = response.items[Object.keys(response.items)[0]];
		if (/^REDIRECT /.test(page.abstract)) {
			const [ , title, section, ] = (/^(.*?)(?:#.*)?$/).exec(page.abstract.slice('REDIRECT '.length));
			return Self.doLoad(api, title, section);
		}

		const thumb = allOptions.thumb.value && page.thumbnail && {
			source: page.thumbnail
			.replace(/\/x-offset\/\d+/, '/x-offset/0').replace(/\/window-width\/\d+/, '/window-width/'+ page.original_dimensions.width)
			.replace(/\/y-offset\/\d+/, '/y-offset/0').replace(/\/window-height\/\d+/, '/window-height/'+ page.original_dimensions.height),
			width: thumbPx, height: (page.original_dimensions.height / page.original_dimensions.width * thumbPx) << 0,
		} || { width: 0, height: 0, };
		let html; if (section) {
			const { response, } = (await HttpRequest({ src: `${ api }/v1/Articles/AsSimpleJson?id${ page.id }`, responseType: 'json', }));
			const section = fuzzyFind(response.sections.map(_=>_.title), section.replace(/_/g, ' '));
			html = response.sections.find(_=>_.title === section).content
			.filter(_=>_.type === 'paragraph')
			.map(({ text, }) => `<p>${ text }</p>`).join('');
		} else {
			html = `<p>${ page.abstract }</p>`;
		}
		const [ text, length, ] = sanatize(html);

		const minHeight = thumb.height / devicePixelRatio + 20;
		const width = Math.sqrt(length * 225 + (thumb.height / devicePixelRatio + 20) * (thumb.width / devicePixelRatio + 20));

		return article({ width, minHeight, thumb, text, });
	},
};

return Self;

}); })();
