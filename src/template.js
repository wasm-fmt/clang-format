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
    assert_init = () => {};
}

function assert_init() {
    throw new Error("uninit");
}

export function version() {
    assert_init();
}

function unwrap(result) {
    const { error, content } = result;
    if (error) {
        throw Error(content);
    }
    return content;
}

export function format(content, filename = "<stdin>", style = "LLVM") {
    assert_init();
    const result = wasm.format(content, filename, style);
    return unwrap(result);
}

export function format_line_range(
    content,
    range,
    filename = "<stdin>",
    style = "LLVM",
) {
    assert_init();
    const rangeList = new wasm.RangeList();
    for (const [fromLine, toLine] of range) {
        if (fromLine < 1) {
            throw Error("start line should be at least 1");
        }
        if (fromLine > toLine) {
            throw Error("start line should not exceed end line");
        }
        rangeList.push_back(fromLine);
        rangeList.push_back(toLine);
    }

    const result = wasm.format_line(content, filename, style, rangeList);
    rangeList.delete();
    return unwrap(result);
}

export function format_byte_range(
    content,
    range,
    filename = "<stdin>",
    style = "LLVM",
) {
    assert_init();
    const rangeList = new wasm.RangeList();
    for (const [offset, length] of range) {
        if (offset < 0) {
            throw Error("start offset should be at least 0");
        }
        if (length < 0) {
            throw Error("length should be at least 0");
        }
        rangeList.push_back(offset);
        rangeList.push_back(length);
    }

    const result = wasm.format_byte(content, filename, style, rangeList);
    rangeList.delete();
    return unwrap(result);
}

export {
    format_byte_range as formatByteRange,
    format_line_range as formatLineRange,
};
