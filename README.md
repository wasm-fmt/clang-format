# Install

```bash
npm install @wasm-fmt/clang-format
```

# Usage

```JavaScript
import init, { format } from '@wasm-fmt/clang-format';

await init();

const source = `
#include <iostream>
using namespace std;
auto main() -> int{
std::cout << "Hello World!" << std::endl;
return 0;}
`;

const formatted = format(
    source,
    "main.cc",
    JSON.stringify({
        BasedOnStyle: "Chromium",
        IndentWidth: 4,
        ColumnLimit: 80,
    })
);

console.log(formatted);
```

# Build from source

1. Install [LLVM](https://llvm.org/docs/GettingStarted.html) and [Clang](https://clang.llvm.org/get_started.html) (version 18 or later).
2. Install [CMake](https://cmake.org/download/) (version 3.27 or later).
3. Install [Ninja](https://ninja-build.org/) (version 1.11 or later).
4. Clone this repository.
5. Run scrips/build.sh.
