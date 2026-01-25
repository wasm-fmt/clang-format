export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export default function init(input?: InitInput): Promise<void>;

/**
 * The style to use for formatting.
 * Supported style values are:
 *  - `LLVM` - A style complying with the LLVM coding standards.
 *  - `Google` - A style complying with Google's C++ style guide.
 *  - `Chromium` - A style complying with Chromium's style guide.
 *  - `Mozilla` - A style complying with Mozilla's style guide.
 *  - `WebKit` - A style complying with WebKit's style guide.
 *  - `Microsoft` - A style complying with Microsoft's style guide.
 *  - `GNU` - A style complying with the GNU coding standards.
 *  - A string starting with `{`, for example: `{BasedOnStyle: Chromium, IndentWidth: 4, ...}`.
 *  - A string which represents `.clang-format` content.
 *
 */
export type Style = "LLVM" | "Google" | "Chromium" | "Mozilla" | "WebKit" | "Microsoft" | "GNU" | (string & {});

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
 * Formats given content using specified style.
 *
 * @param {string} content - The content to format.
 * @param {Filename} filename - The filename to use for determining the language.
 * @param {Style} style - The style to use for formatting.
 *   Supported style values are:
 *   - `LLVM` - A style complying with the LLVM coding standards.
 *   - `Google` - A style complying with Google's C++ style guide.
 *   - `Chromium` - A style complying with Chromium's style guide.
 *   - `Mozilla` - A style complying with Mozilla's style guide.
 *   - `WebKit` - A style complying with WebKit's style guide.
 *   - `Microsoft` - A style complying with Microsoft's style guide.
 *   - `GNU` - A style complying with the GNU coding standards.
 *   - A string starting with `{`, for example: `{BasedOnStyle: Chromium, IndentWidth: 4, ...}`.
 *   - A string which represents `.clang-format` content.
 *
 * @returns {string} The formatted content.
 * @throws {Error}
 *
 * @see {@link https://clang.llvm.org/docs/ClangFormatStyleOptions.html}
 */
export declare function format(content: string, filename?: Filename, style?: Style): string;

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
 * @param {number} fromLine - The starting line number (1-based).
 * @param {number} toLine - The ending line number (1-based).
 * @param {Filename} filename - The filename to use for determining the language.
 * @param {Style} style - The style to use for formatting.
 *   Supported style values are:
 *   - `LLVM` - A style complying with the LLVM coding standards.
 *   - `Google` - A style complying with Google's C++ style guide.
 *   - `Chromium` - A style complying with Chromium's style guide.
 *   - `Mozilla` - A style complying with Mozilla's style guide.
 *   - `WebKit` - A style complying with WebKit's style guide.
 *   - `Microsoft` - A style complying with Microsoft's style guide.
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
	fromLine: number,
	toLine: number,
	filename?: Filename,
	style?: Style,
): string;

/**
 * Formats the specified range of bytes in the given content using the specified style.
 *
 * @param {string} content - The content to format.
 * @param {number} offset - The byte offset where formatting should start.
 * @param {number} length - The number of bytes to format.
 * @param {Filename} filename - The filename to use for determining the language.
 * @param {Style} style - The style to use for formatting.
 *   Supported style values are:
 *   - `LLVM` - A style complying with the LLVM coding standards.
 *   - `Google` - A style complying with Google's C++ style guide.
 *   - `Chromium` - A style complying with Chromium's style guide.
 *   - `Mozilla` - A style complying with Mozilla's style guide.
 *   - `WebKit` - A style complying with WebKit's style guide.
 *   - `Microsoft` - A style complying with Microsoft's style guide.
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
	offset: number,
	length: number,
	filename?: Filename,
	style?: Style,
): string;

/**
 * Gets the clang-format version.
 *
 * @returns The version string.
 * @throws {Error} If the WASM module has not been initialized.
 */
export declare function version(): string;

/**
 * A class for formatting code using clang-format.
 *
 * This class provides a fluent API for configuring and applying code formatting.
 * It wraps the underlying WebAssembly implementation and manages memory automatically.
 *
 * @example
 * ```typescript
 * const formatter = new ClangFormat();
 * const formatted = formatter
 *     .with_style('Google')
 *     .format(code, 'main.c');
 * formatter[Symbol.dispose](); // Clean up memory
 * ```
 */
export declare class ClangFormat {
	/**
	 * Creates a new ClangFormat instance.
	 *
	 * @throws {Error} If the WASM module has not been initialized.
	 */
	constructor();

	/**
	 * Sets the style to use for formatting.
	 *
	 * @param style - The style to use for formatting.
	 * @returns This instance for method chaining.
	 */
	with_style(style: Style): this;

	/**
	 * Sets the fallback style to use when no style is specified.
	 *
	 * @param style - The fallback style to use.
	 * @returns This instance for method chaining.
	 */
	with_fallback_style(style: Style): this;

	/**
	 * Formats the given content.
	 *
	 * @param content - The content to format.
	 * @param filename - The filename to use for determining the language. Defaults to "<stdin>".
	 * @returns The formatted content.
	 * @throws {Error} If formatting fails.
	 */
	format(content: string, filename?: Filename): string;

	/**
	 * Formats the specified range of bytes in the given content.
	 *
	 * @param content - The content to format.
	 * @param offset - The byte offset where formatting should start.
	 * @param length - The number of bytes to format.
	 * @param filename - The filename to use for determining the language. Defaults to "<stdin>".
	 * @returns The formatted content.
	 * @throws {Error} If formatting fails.
	 */
	format_range(content: string, offset: number, length: number, filename?: Filename): string;

	/**
	 * Formats the specified range of lines in the given content.
	 *
	 * @param content - The content to format.
	 * @param from_line - The starting line number (1-based).
	 * @param to_line - The ending line number (1-based).
	 * @param filename - The filename to use for determining the language. Defaults to "<stdin>".
	 * @returns The formatted content.
	 * @throws {Error} If formatting fails.
	 */
	format_line(content: string, from_line: number, to_line: number, filename?: Filename): string;

	/**
	 * Gets the clang-format version.
	 *
	 * @returns The version string.
	 * @throws {Error} If the WASM module has not been initialized.
	 */
	static version(): string;

	/**
	 * Dumps the configuration for the given style.
	 *
	 * @param options - Configuration options.
	 * @param options.style - The style to dump configuration for. Defaults to "file".
	 * @param options.filename - The filename to use for determining the language. Defaults to "<stdin>".
	 * @param options.code - The code to analyze for configuration. Defaults to "".
	 * @returns The configuration as a YAML string.
	 * @throws {Error} If dumping configuration fails.
	 */
	static dump_config(options?: { style?: Style; filename?: Filename; code?: string }): string;

	/**
	 * Disposes of the underlying WebAssembly resources.
	 *
	 * This method is called automatically when using the `using` statement (ES2022+).
	 * It can also be called manually to free memory.
	 */
	[Symbol.dispose](): void;
}
