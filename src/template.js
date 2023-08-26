var wasmExports;

async function load(module) {
    switch (typeof module) {
        case "undefined":
            module = "clang-format.wasm";
        case "string":
            module = new URL(module, import.meta.url);
    }

    if (module instanceof URL || module instanceof Request) {
        if (typeof __webpack_require__ !== "function" && module.protocol === "file:") {
            const fs = await import("node:fs/promises");
            module = await fs.readFile(module);
        } else {
            module = await fetch(module);
        }
    }

    if (module instanceof Response) {
        if ("compileStreaming" in WebAssembly) {
            try {
                return await WebAssembly.compileStreaming(module);
            } catch (e) {
                if (module.headers.get("Content-Type") != "application/wasm") {
                    console.warn(
                        "`WebAssembly.compileStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n",
                        e,
                    );
                } else {
                    throw e;
                }
            }
        }

        return module.arrayBuffer();
    }

    return module;
}

export default async function init(wasm_url) {
    const module = await load(wasm_url);
    const result = await Module({ wasm: module });

    version = result.version;
    format_with_style = result.format_with_style;
}

function format_with_style() {
    throw Error("uninit");
}

export function version() {
    throw Error("uninit");
}

export function format(content, filename = "<stdin>", style = "LLVM") {
    const result = format_with_style(content, filename, style);
    if (result[0] === "\0") {
        throw Error(result.slice(1));
    }
    return result;
}
