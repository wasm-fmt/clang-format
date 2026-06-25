[![Test](https://github.com/wasm-fmt/clang-format/actions/workflows/test.yml/badge.svg)](https://github.com/wasm-fmt/clang-format/actions/workflows/test.yml)

# Install

[![npm](https://img.shields.io/npm/v/@wasm-fmt/clang-format?color=f34b7d)](https://www.npmjs.com/package/@wasm-fmt/clang-format)

```bash
npm install @wasm-fmt/clang-format
```

[![jsr.io](https://jsr.io/badges/@fmt/clang-format?color=f34b7d)](https://jsr.io/@fmt/clang-format)

```bash
npx jsr add @fmt/clang-format
```

# Usage

## CLI

This repository contains 3 executable files, namely `clang-format`, `git-clang-format` and `clang-format-diff`.
For more information, please refer to https://clang.llvm.org/docs/ClangFormat.html

## Node.js / Deno / Bun / Bundler

```javascript
import { format } from "@wasm-fmt/clang-format";

const source = `
#include <iostream>
using namespace std;
auto main() -> int{
std::cout << "Hello World!" << std::endl;
return 0;}
`;

// JSON representation of Clang-Format Style Options
const config = JSON.stringify({
	BasedOnStyle: "Chromium",
	IndentWidth: 4,
	ColumnLimit: 80,
});

// or YAML representation of Clang-Format Style Options which is used in `.clang-format` file
const config2 = `---
BasedOnStyle: Chromium
IndentWidth: 4
ColumnLimit: 80

...
`;

// or the preset name
const config3 = "Chromium";

const formatted = format(source, "main.cc", config);

console.log(formatted);
```

The third argument of `format` is a Clang-Format Style Options, which can be one of the following:

1. A preset: LLVM, GNU, Google, Chromium, Microsoft, Mozilla, WebKit.
2. A YAML/JSON string representing the style options.
3. the string content of a `.clang-format` file.

See [Clang-Format Style Options](https://clang.llvm.org/docs/ClangFormatStyleOptions.html) for more information.

## Web

For web environments, you need to initialize WASM module manually:

```javascript
import init, { format } from "@wasm-fmt/clang-format/web";

await init();

const source = `
#include <iostream>
using namespace std;
auto main() -> int{
std::cout << "Hello World!" << std::endl;
return 0;}
`;

const formatted = format(source, "main.cc", "Chromium");
console.log(formatted);
```

### Vite

```JavaScript
import init, { format } from "@wasm-fmt/clang-format/vite";

await init();
// ...
```

## Entry Points

- `.` - Auto-detects environment (Node.js uses node, Webpack uses bundler, default is ESM)
- `./node` - Node.js environment (no init required)
- `./esm` - ESM environments like Deno (no init required)
- `./bundler` - Bundlers like Webpack (no init required)
- `./web` - Web browsers (requires manual init)
- `./vite` - Vite bundler (requires manual init)

# How does it work?

[Clang-Format] is a tool to format C/C++/Java/JavaScript/TypeScript/Objective-C/Protobuf/C# code.

This package is a WebAssembly build of Clang-Format, with a JavaScript wrapper.

[Clang-Format]: https://clang.llvm.org/docs/ClangFormat.html

# Build from source

1. Install [LLVM](https://llvm.org/docs/GettingStarted.html) and [Clang](https://clang.llvm.org/get_started.html) (version 18 or later).
2. Install [mise](https://mise.jdx.dev/).
3. Clone this repository.
4. Run `mise install`.
5. Run `mise run build`.

For example:

```sh
mise install
mise run build
```

Set `WASM_OPT=1` when you want the build to run `wasm-tools strip` and
Binaryen `wasm-opt` on the Emscripten module and the WASI CLI module:

```sh
WASM_OPT=1 mise run build
```

`mise.toml` manages Node.js, CMake, Ninja, Deno, Bun, Wasmtime, `wasm-tools`,
and `wasi-sdk` 33. On macOS and Linux, `mise.unix.toml` also installs
Emscripten 4.0.23 through the `mise-emsdk` asdf plugin. On Windows, prepare and
activate Emscripten manually before running the build. If you do not use mise,
install and activate Emscripten manually, install `wasi-sdk` manually, and
either set `WASI_SDK_PATH` to the directory containing
`share/cmake/wasi-sdk-p1.cmake` or put `wasm32-wasip1-clang` on `PATH`. Install
`wasm-tools` too when using `WASM_OPT=1`. The build script consumes the prepared
environment; it does not invoke mise itself.

The build prepares the patched LLVM source once in `build-llvm-source/`, then
builds native `llvm-tblgen` and `clang-tblgen` helpers in
`build-native-tools/` before configuring the Emscripten and WASI builds.

If you switch Emscripten or wasi-sdk installations, remove the affected CMake
build directory (`build/`, `build-wasi/`, or `build-native-tools/`) before
rebuilding. Remove `build-llvm-source/` when you need to refresh the shared
LLVM source cache.
