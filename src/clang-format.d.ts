export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export default function init(input?: InitInput): Promise<void>;

export type Style = "LLVM" | "Google" | "Chromium" | "Mozilla" | "WebKit" | "Microsoft" | "GNU" | (string & {});

export type Filename =
    | "main.c"
    | "main.cc"
    | "main.cxx"
    | "main.cpp"
    | "main.java"
    | "main.js"
    | "main.mjs"
    | "main.ts"
    | "main.json"
    | "main.m"
    | "main.mm"
    | "main.proto"
    | "main.cs"
    | (string & {});

/**
 * Formats the given content using the specified style.
 *
 * @param {string} content - The content to format.
 * @param {Filename} filename - The filename to use for determining the language.
 * @param {Style} style - The style to use for formatting.
 *   Supported style values are:
 *   - `LLVM` - A style complying with the LLVM coding standards.
 *   - `Google` - A style complying with Google’s C++ style guide.
 *   - `Chromium` - A style complying with Chromium’s style guide.
 *   - `Mozilla` - A style complying with Mozilla’s style guide.
 *   - `WebKit` - A style complying with WebKit’s style guide.
 *   - `Microsoft` - A style complying with Microsoft’s style guide.
 *   - `GNU` - A style complying with the GNU coding standards.
 *   - A string starting with `{`, for example: `{BasedOnStyle: Chromium, IndentWidth: 4, ...}`.
 *   - A string starting with `---`, which represents `.clang-format` content.
 *
 * @returns {string} The formatted content.
 *
 * @see {@link https://clang.llvm.org/docs/ClangFormatStyleOptions.html}
 */
export declare function format(content: string, filename?: Filename, style?: Style): string;

export declare function version(): string;
