/* @ts-self-types="./clang-format-web.d.ts" */

import wasm from "./clang-format.wasm?url";
import initAsync from "./clang-format-web.js";

export default function (input = wasm) {
	return initAsync(input);
}

export * from "./clang-format-web.js";
