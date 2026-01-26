let wasm;

export function set_wasm(_wasm) {
	wasm = _wasm;
	assert_init = () => {};
}

const registry =
	typeof FinalizationRegistry === "undefined"
		? { register: () => {}, unregister: () => {} }
		: new FinalizationRegistry((impl) => {
				impl.delete();
			});

export class ClangFormat {
	constructor() {
		assert_init();
		this._impl = new wasm.ClangFormat();
		registry.register(this, this._impl, this);
	}

	with_style(style) {
		this._impl.with_style(style);
		return this;
	}

	with_fallback_style(style) {
		this._impl.with_fallback_style(style);
		return this;
	}

	format(content, filename = "<stdin>") {
		const result = this._impl.format(content, filename);
		return unwrap(result) ?? content;
	}

	format_range(content, offset, length, filename = "<stdin>") {
		const result = this._impl.format_range(content, filename, offset, length);
		return unwrap(result) ?? content;
	}

	format_line(content, from, to, filename = "<stdin>") {
		const result = this._impl.format_line(content, filename, from, to);
		return unwrap(result) ?? content;
	}

	static version() {
		assert_init();
		return wasm.ClangFormat.version();
	}

	static dump_config({ style = "file", filename = "<stdin>", code = "" } = {}) {
		assert_init();
		const result = wasm.ClangFormat.dump_config(style, filename, code);
		return unwrap(result);
	}

	[Symbol.dispose]() {
		if (this._impl) {
			registry.unregister(this);
			this._impl.delete();
			this._impl = null;
		}
	}
}

function assert_init() {
	throw new Error("uninit");
}

function unwrap(result) {
	const { status, content } = result;
	if (status === wasm.ResultStatus.Error) {
		throw Error(content);
	}
	if (status === wasm.ResultStatus.Unchanged) {
		return null;
	}
	return content;
}

export function version() {
	return ClangFormat.version();
}

export function dump_config(args) {
	return ClangFormat.dump_config(args);
}

export function format(content, filename = "<stdin>", style = "LLVM") {
	const formatter = new ClangFormat();
	try {
		return formatter.with_style(style).format(content, filename);
	} finally {
		formatter[Symbol.dispose]();
	}
}

export function format_line_range(content, from, to, filename = "<stdin>", style = "LLVM") {
	const formatter = new ClangFormat().with_style(style);
	try {
		if (from < 1) {
			throw Error("start line should be at least 1");
		}
		if (from > to) {
			throw Error("start line should not exceed end line");
		}

		return formatter.format_line(content, from, to, filename);
	} finally {
		formatter[Symbol.dispose]();
	}
}

export function format_byte_range(content, offset, length, filename = "<stdin>", style = "LLVM") {
	const formatter = new ClangFormat().with_style(style);
	try {
		return formatter.format_range(content, offset, length, filename);
	} finally {
		formatter[Symbol.dispose]();
	}
}
