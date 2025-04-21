export type InitInput =
	| RequestInfo
	| URL
	| Response
	| BufferSource
	| WebAssembly.Module;

export default function init(input?: InitInput): Promise<void>;

/**
 * The style to use for formatting.
 * Supported style values are:
 *  - `LLVM` - A style complying with the LLVM coding standards.
 *  - `Google` - A style complying with Google’s C++ style guide.
 *  - `Chromium` - A style complying with Chromium’s style guide.
 *  - `Mozilla` - A style complying with Mozilla’s style guide.
 *  - `WebKit` - A style complying with WebKit’s style guide.
 *  - `Microsoft` - A style complying with Microsoft’s style guide.
 *  - `GNU` - A style complying with the GNU coding standards.
 *  - A string starting with `{`, for example: `{BasedOnStyle: Chromium, IndentWidth: 4, ...}`.
 *  - A string which represents `.clang-format` content.
 *
 */
export type Style =
	| "LLVM"
	| "Google"
	| "Chromium"
	| "Mozilla"
	| "WebKit"
	| "Microsoft"
	| "GNU"
	| (string & {});

/**
 * The filename to use for determining the language.
 */
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
 *   - A string which represents `.clang-format` content.
 *
 * @returns {string} The formatted content.
 * @throws {Error}
 *
 * @see {@link https://clang.llvm.org/docs/ClangFormatStyleOptions.html}
 */
export declare function format(
	content: string,
	filename?: Filename,
	style?: Style,
): string;

/**
 * Both the startLine and endLine are 1-based.
 */
export type LineRange = [startLine: number, endLine: number];

/**
 * Both the offset and length are measured in bytes.
 */
export type ByteRange = [offset: number, length: number];

/**
 * Formats the specified range of lines in the given content using the specified style.
 *
 * @param {string} content - The content to format.
 * @param {LineRange[]} range - Array<[startLine, endLine]> - The range of lines to format.
 * Both startLine and endLine are 1-based.
 * Multiple ranges can be formatted by specifying several lines arguments.
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
 *   - A string which represents `.clang-format` content.
 *
 * @returns {string} The formatted content.
 * @throws {Error}
 *
 * @see {@link https://clang.llvm.org/docs/ClangFormatStyleOptions.html}
 */
export declare function format_line_range(
	content: string,
	range: ByteRange[] | [[offset: number]],
	filename?: Filename,
	style?: Style,
): string;

/**
 * @deprecated Use `format_line_range` instead.
 */
export declare function formatLineRange(
	content: string,
	range: ByteRange[] | [[offset: number]],
	filename?: Filename,
	style?: Style,
): string;

/**
 * Formats the specified range of bytes in the given content using the specified style.
 *
 * @param {string} content - The content to format.
 * @param {ByteRange[]} range - Array<[offset, length]> - The range of bytes to format.
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
 *   - A string which represents `.clang-format` content.
 *
 * @returns {string} The formatted content.
 * @throws {Error}
 *
 * @see {@link https://clang.llvm.org/docs/ClangFormatStyleOptions.html}
 */
export declare function format_byte_range(
	content: string,
	range: LineRange[],
	filename?: Filename,
	style?: Style,
): string;

/**
 * @deprecated Use `format_byte_range` instead.
 */
export declare function formatByteRange(
	content: string,
	range: LineRange[],
	filename?: Filename,
	style?: Style,
): string;

export declare function version(): string;

export declare function set_fallback_style(style: Style): void;
