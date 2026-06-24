#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "$0")/.."
project_root=$(pwd)

is_under_path() {
    local path=$1
    local root

    shift
    for root in "$@"; do
        [[ -n "$root" ]] || continue
        case "$path" in
            "$root" | "$root"/*) return 0 ;;
        esac
    done

    return 1
}

find_emsdk_path() {
    local candidate emcmake_bin

    candidate="${EMSDK:-}"
    if [[ -n "$candidate" && -f "$candidate/emsdk_env.sh" ]]; then
        candidate=$(cd "$candidate" && pwd)
        printf '%s\n' "$candidate"
        return 0
    fi

    emcmake_bin=$(command -v emcmake || true)
    [[ -n "$emcmake_bin" ]] || return 1

    candidate=$(cd "$(dirname "$emcmake_bin")/../.." && pwd)
    if [[ -f "$candidate/emsdk_env.sh" ]]; then
        printf '%s\n' "$candidate"
        return 0
    fi

    return 1
}

find_host_tool() {
    local tool=$1
    local candidate dir
    local path_entries

    IFS=: read -r -a path_entries <<<"$PATH"
    for dir in "${path_entries[@]}"; do
        [[ -n "$dir" ]] || continue
        candidate="$dir/$tool"
        [[ -x "$candidate" && ! -d "$candidate" ]] || continue
        if is_under_path "$candidate" "${EMSDK_PATH:-}" "${WASI_SDK_PATH:-}"; then
            continue
        fi

        printf '%s\n' "$candidate"
        return 0
    done

    return 1
}

if [[ -z "${WASI_SDK_PATH:-}" ]]; then
    echo "WASI_SDK_PATH must point to a wasi-sdk installation." >&2
    exit 1
fi

wasi_toolchain="$WASI_SDK_PATH/share/cmake/wasi-sdk-p1.cmake"
if [[ ! -f "$wasi_toolchain" ]]; then
    echo "WASI_SDK_PATH does not contain share/cmake/wasi-sdk-p1.cmake: $WASI_SDK_PATH" >&2
    exit 1
fi

rm -rf pkg
if [[ -d build-wasi/CMakeFiles ]] &&
    grep -R -- '--target=wasm32-wasi ' build-wasi/CMakeFiles build-wasi/build.ninja >/dev/null 2>&1; then
    rm -rf build-wasi
fi
mkdir -p pkg build build-wasi build-native-tools

EMSDK_PATH=$(find_emsdk_path || true)
HOST_CC=${CC_FOR_BUILD:-}
HOST_CXX=${CXX_FOR_BUILD:-}
if [[ -z "$HOST_CC" ]] && ! HOST_CC=$(find_host_tool clang); then
    echo "Could not find host clang outside emsdk/wasi-sdk. Set CC_FOR_BUILD." >&2
    exit 1
fi
if [[ -z "$HOST_CXX" ]] && ! HOST_CXX=$(find_host_tool clang++); then
    echo "Could not find host clang++ outside emsdk/wasi-sdk. Set CXX_FOR_BUILD." >&2
    exit 1
fi

emcmake cmake -S . -B build -G Ninja \
    -DCLANG_FORMAT_BUILD_ESM=ON \
    -DCLANG_FORMAT_BUILD_CLI=OFF
cmake --build build --target clang-format-esm

llvm_source_dir="$project_root/build/_deps/llvm_project-src"
native_tools_dir="$project_root/build-native-tools"

cmake -S "$llvm_source_dir/llvm" -B "$native_tools_dir" -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_C_COMPILER="$HOST_CC" \
    -DCMAKE_CXX_COMPILER="$HOST_CXX" \
    -DLLVM_ENABLE_PROJECTS=clang \
    -DLLVM_TARGETS_TO_BUILD= \
    -DLLVM_INCLUDE_TESTS=OFF \
    -DLLVM_INCLUDE_BENCHMARKS=OFF \
    -DLLVM_INCLUDE_EXAMPLES=OFF \
    -DLLVM_ENABLE_BINDINGS=OFF \
    -DLLVM_ENABLE_ZLIB=OFF \
    -DLLVM_ENABLE_ZSTD=OFF \
    -DLLVM_ENABLE_TERMINFO=OFF
cmake --build "$native_tools_dir" --target llvm-tblgen clang-tblgen

cmake -S . -B build-wasi -G Ninja \
    -DCMAKE_TOOLCHAIN_FILE="$wasi_toolchain" \
    -DCMAKE_C_COMPILER_TARGET=wasm32-wasip1 \
    -DCMAKE_CXX_COMPILER_TARGET=wasm32-wasip1 \
    -DCMAKE_ASM_COMPILER_TARGET=wasm32-wasip1 \
    -DLLVM_NATIVE_TOOL_DIR="$native_tools_dir/bin" \
    -DLLVM_TABLEGEN="$native_tools_dir/bin/llvm-tblgen" \
    -DCLANG_TABLEGEN="$native_tools_dir/bin/clang-tblgen" \
    -DLLVM_BUILD_TOOLS=OFF \
    -DCLANG_BUILD_TOOLS=OFF \
    -DLLVM_BUILD_UTILS=OFF \
    -DLLVM_INCLUDE_BENCHMARKS=OFF \
    -DLLVM_INCLUDE_EXAMPLES=OFF \
    -DLLVM_INCLUDE_TESTS=OFF \
    -DLLVM_ENABLE_BACKTRACES=OFF \
    -DLLVM_ENABLE_CRASH_OVERRIDES=OFF \
    -DLLVM_ENABLE_THREADS=OFF \
    -DLLVM_ENABLE_ZLIB=OFF \
    -DLLVM_ENABLE_ZSTD=OFF \
    -DCLANG_FORMAT_BUILD_ESM=OFF \
    -DCLANG_FORMAT_BUILD_CLI=ON
cmake --build build-wasi --target clang-format-cli

if [[ ! -z "${WASM_OPT:-}" ]]; then
    wasm-opt --enable-bulk-memory --enable-nontrapping-float-to-int -Os build/clang-format-esm.wasm -o build/clang-format-esm-Os.wasm
    wasm-opt --enable-bulk-memory --enable-nontrapping-float-to-int -Oz build/clang-format-esm.wasm -o build/clang-format-esm-Oz.wasm
fi

SMALLEST_WASM=$(ls -Sr build/clang-format-e*.wasm | head -n 1)

cp "$SMALLEST_WASM" pkg/clang-format.wasm
node scripts/esm_patch.mjs build/clang-format-esm.js pkg/clang-format.js

cp -LR ./extra/. ./pkg/
cp ./build-wasi/clang-format-cli.wasm ./pkg/
cp ./package.json ./README.md ./LICENSE ./jsr.jsonc ./pkg/
node ./pkg/clang-format-cli.cjs --style=file:./scripts/.clang-format -i ./pkg/*.{js,cjs,ts}

# copy git-clang-format and clang-format-diff.py
cp ./build/_deps/llvm_project-src/clang/tools/clang-format/git-clang-format ./pkg/
cp ./build/_deps/llvm_project-src/clang/tools/clang-format/clang-format-diff.py ./pkg/

ls -lh ./pkg
