import initAsync from "./clang-format.js";
import wasm from "./clang-format.wasm?url";

export default function (input = wasm) {
    return initAsync(input);
}

export * from "./clang-format.js";
