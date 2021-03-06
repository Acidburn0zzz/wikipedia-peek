(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'common/sandbox': makeSandbox,
}) => {

const Self = new WeakMap;
class Evaluator {
	constructor() {
		return EvaluatorInit.apply(this, arguments);
	}

	async eval(code) {
		return Self.get(this).request('eval', code);
	}

	newFunction(...args) {
		const sandbox = Self.get(this), _this = this;
		const id = Math.random().toString(32).slice(2);
		const stub = async function() {
			if (!Self.has(_this)) { throw new TypeError(`Dead remote function called`); }
			return sandbox.request('call', id, ...arguments);
		};
		Object.defineProperty(stub, 'ready', { value: sandbox.request('create', id, ...args).then(length => {
			Object.defineProperty(stub, 'length', { value: length, }); return stub;
		}), });
		Object.defineProperty(stub, 'destroy', { value() { Self.has(this) && sandbox.post('destroy', id); }, });
		return stub;
	}

	destroy() {
		const sandbox = Self.get(this); if (!sandbox) { return; } Self.delete(this);
		sandbox.post('destroy');
		sandbox.frame.remove();
		sandbox.destroy();
	}
}

async function EvaluatorInit() {
	Self.set(this, (await makeSandbox(port => {
		const FunctionCtor = (x=>x).constructor;
		const globEval = eval;
		const functions = { };
		port.addHandlers({
			eval(code) {
				return globEval(code);
			},
			create(id, ...args) {
				const func = functions[id] = new FunctionCtor(...args);
				return func.length;
			},
			call(id, ...args) {
				const func = functions[id];
				if (!func) { throw new TypeError(`Dead remote function called`); }
				return FunctionCtor.prototype.apply.call(func, func, args);
			},
			destroy(id) {
				delete functions[id];
			},
		});
		{
			const frozen = new Set;
			const freeze = object => {
				if ((typeof object !== 'object' && typeof object !== 'function') || object === null || frozen.has(object)) { return; }
				frozen.add(object);
				Object.getOwnPropertyNames(object).forEach(key => { try { freeze(object[key]); } catch (_) { } });
				Object.getOwnPropertySymbols(object).forEach(key => { try { freeze(object[key]); } catch (_) { } });
				// try { freeze(Object.getPrototypeOf(object)); } catch (_) { }
			};
			[ 'Object', 'Array', 'Function', 'Math', 'Error', 'TypeError', 'String', 'Number', 'Boolean', 'Symbol', 'RegExp', 'Promise', ]
			.forEach(prop => {
				Object.defineProperty(window, prop, { writable: false, configurable: false, });
				freeze(window[prop]);
			});
			frozen.forEach(Object.freeze);
			frozen.clear();
		}
	})));
	return this;
}

return new Evaluator;

}); })(this);
