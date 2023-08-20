export default async function init(wasm_url) {
    let resolve;
    const result = new Promise((r) => {
        resolve = r;
    });
    const Module = {
        onRuntimeInitialized() {
            format_with_style = this.format_with_style;
            resolve();
        },
        noInitialRun: true,
        locateFile: wasm_url ? () => wasm_url : undefined,
    };

    const ENVIRONMENT_IS_NODE =
        typeof process == "object" &&
        typeof process.versions == "object" &&
        typeof process.versions.node == "string";

    var _require = typeof require !== "undefined" ? require : undefined;
    var __dirname = typeof __dirname !== "undefined" ? __dirname : undefined;

    if (ENVIRONMENT_IS_NODE) {
        _require ||= await import("module").then((m) =>
            m.createRequire(import.meta.url)
        );

        __dirname ||= await import("url").then((m) =>
            m.fileURLToPath(new URL(".", import.meta.url))
        );
    }

    load(Module, _require, __dirname);

    return result;
}

function format_with_style() {
    throw Error("uninit");
}

export function format(content, filename = "<stdin>", style = "LLVM") {
    const result = format_with_style(content, filename, style);
    if (result === "\0") {
        throw Error("format failed");
    }
    return result;
}

function load(Module, require, __dirname) {
    /* MAIN_CODE */
}
