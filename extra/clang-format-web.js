/* @ts-self-types="./clang-format-web.d.ts" */
let wasm;
import { createModule } from "./clang-format.js";
import { set_wasm } from "./clang-format-binding.js";

async function load(input) {
	if (typeof Response === "function" && input instanceof Response) {
		if (typeof WebAssembly.compileStreaming === "function") {
			try {
				return await WebAssembly.compileStreaming(input);
			} catch (e) {
				const validResponse = input.ok && expectedResponseType(input.type);

				if (validResponse && input.headers.get("Content-Type") !== "application/wasm") {
					console.warn(
						"`WebAssembly.compileStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n",
						e,
					);
				} else {
					throw e;
				}
			}
		}

		const bytes = await input.arrayBuffer();
		return await WebAssembly.compile(bytes);
	} else {
		return await WebAssembly.compile(input);
	}

	function expectedResponseType(type) {
		switch (type) {
			case "basic":
			case "cors":
			case "default":
				return true;
		}
		return false;
	}
}

export function initSync(module_or_buffer) {
	if (wasm !== void 0) return wasm;

	if (!(module_or_buffer instanceof WebAssembly.Module)) {
		module_or_buffer = new WebAssembly.Module(module_or_buffer);
	}

	return (wasm = finalize_init(module_or_buffer));
}

export default async function initAsync(init_input) {
	if (wasm !== void 0) return wasm;

	if (init_input === void 0) {
		init_input = new URL("clang-format.wasm", import.meta.url);
	}

	if (
		typeof init_input === "string" ||
		(typeof Request === "function" && init_input instanceof Request) ||
		(typeof URL === "function" && init_input instanceof URL)
	) {
		init_input = fetch(init_input);
	}

	const module = await load(await init_input);

	return (wasm = finalize_init(module));
}

function finalize_init(module) {
	wasm = createModule({ wasm: module });
	set_wasm(wasm);

	return wasm;
}

export {
	ClangFormat,
	dump_config,
	format_byte_range,
	format_line_range,
	format,
	version,
} from "./clang-format-binding.js";
