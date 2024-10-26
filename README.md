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

This repository contains two executable files, namely clang-format and git-clang-format.
For more information, please refer to https://clang.llvm.org/docs/ClangFormat.html

## API

```JavaScript
import init, { format } from "@wasm-fmt/clang-format";

await init();

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

const formatted = format(
    source,
    "main.cc",
    config,
);

console.log(formatted);
```

The third argument of `format` is a Clang-Format Style Options, which can be one of the following:

1. A preset: LLVM, GNU, Google, Chromium, Microsoft, Mozilla, WebKit.
2. A YAML/JSON string representing the style options.
3. the string content of a `.clang-format` file.

See [Clang-Format Style Options](https://clang.llvm.org/docs/ClangFormatStyleOptions.html) for more information.

# Build from source

1. Install [LLVM](https://llvm.org/docs/GettingStarted.html) and [Clang](https://clang.llvm.org/get_started.html) (version 18 or later).
2. Install [CMake](https://cmake.org/download/) (version 3.27 or later).
3. Install [Ninja](https://ninja-build.org/) (version 1.11 or later).
4. Clone this repository.
5. Run scripts/build.sh.
