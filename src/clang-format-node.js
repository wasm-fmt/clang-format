import fs from "node:fs/promises";
import initAsync from "./clang-format.js";

const wasm = new URL("./clang-format.wasm", import.meta.url);

export default function (init = fs.readFile(wasm)) {
    return initAsync(init);
}

export * from "./clang-format.js";
