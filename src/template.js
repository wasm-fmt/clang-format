async function load(module) {
    if (typeof Response === "function" && module instanceof Response) {
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

let wasm;
export default async function initAsync(input) {
    if (wasm !== undefined) {
        return wasm;
    }

    if (typeof input === "undefined") {
        input = new URL("clang-format.wasm", import.meta.url);
    }

    if (
        typeof input === "string" ||
        (typeof Request === "function" && input instanceof Request) ||
        (typeof URL === "function" && input instanceof URL)
    ) {
        input = fetch(input);
    }

    wasm = await load(await input).then((wasm) => Module({ wasm }));
    version = wasm.version;
    format_with_style = wasm.format_with_style;
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
