export default async function init(wasm_url) {
    let resolve;
    const result = new Promise((r) => {
        resolve = r;
    });
    const Module = {
        onRuntimeInitialized() {
            format_with_style = this.format_with_style;
            version = this.version;
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
    var _dirname = typeof __dirname !== "undefined" ? __dirname : undefined;

    if (ENVIRONMENT_IS_NODE) {
        _require ||= await import("module").then((m) =>
            m.createRequire(import.meta.url)
        );

        _dirname ||= new URL(".", import.meta["url"]).pathname;
    }

    load(Module, _require, _dirname);

    return result;
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

function load(Module, require, __dirname) {
    /* MAIN_CODE */
}
