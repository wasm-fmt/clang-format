import init from "./clang-format.js";
import wasm from "./clang-format.wasm?url";

export default function vite_init(wasm_url = wasm) {
    return init(wasm_url);
}

export * from "./clang-format.js";
