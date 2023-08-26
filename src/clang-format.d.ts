export type InitInput =
    | RequestInfo
    | URL
    | Response
    | BufferSource
    | WebAssembly.Module;

export default function init(wasm_url?: InitInput): Promise<void>;

export type Style =
    | "LLVM"
    | "Google"
    | "Chromium"
    | "Mozilla"
    | "WebKit"
    | "Microsoft"
    | "GNU"
    | (string & {});

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
 * @param content The content to format
 * @param filename The filename to use for determining the language
 * @param style The style to use for formatting
 * @see https://clang.llvm.org/docs/ClangFormatStyleOptions.html
 */
export declare function format(
    content: string,
    filename?: Filename,
    style?: Style
): void;

export declare function version(): string;
