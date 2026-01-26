/* @ts-self-types="./clang-format.d.ts" */
// prettier-ignore
import source wasmModule from "./clang-format.wasm";
import { createModule } from "./clang-format.js";
import { set_wasm } from "./clang-format-binding.js";

const wasm = createModule({ wasm: wasmModule });
set_wasm(wasm);

export {
	ClangFormat,
	dump_config,
	format_byte_range,
	format_line_range,
	format,
	version,
} from "./clang-format-binding.js";
