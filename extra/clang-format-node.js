/* @ts-self-types="./clang-format.d.ts" */
import { readFileSync } from "node:fs";
import { set_wasm } from "./clang-format-binding.js";
import { createModule } from "./clang-format.js";

const wasmUrl = new URL("clang-format.wasm", import.meta.url);
const wasmBytes = readFileSync(wasmUrl);

const wasm = createModule({ wasm: wasmBytes });
set_wasm(wasm);

export {
	ClangFormat,
	dump_config,
	format,
	format_byte_range,
	format_line_range,
	version,
} from "./clang-format-binding.js";
