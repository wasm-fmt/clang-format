#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "$0")/.."
project_root=$(pwd)
llvm_source_base="$project_root/build-llvm-source"
llvm_source_dir="$llvm_source_base/llvm_project-src"
llvm_source_build_dir="$llvm_source_base/llvm_project-build"
llvm_source_subbuild_dir="$llvm_source_base/llvm_project-subbuild"
native_tools_dir="$project_root/build-native-tools"

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

find_emcmake() {
    if [[ -n "${EMSDK_PATH:-}" && -x "$EMSDK_PATH/upstream/emscripten/emcmake" ]]; then
        printf '%s\n' "$EMSDK_PATH/upstream/emscripten/emcmake"
        return 0
    fi

    command -v emcmake
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

cmake_cache_value() {
    local cache=$1
    local key=$2

    [[ -f "$cache" ]] || return 0
    awk -F= -v key="$key" 'index($1, key ":") == 1 { print substr($0, index($0, "=") + 1); exit }' "$cache"
}

cmake_cache_path_outside() {
    local cache=$1
    local key=$2
    local root=$3
    local value

    value=$(cmake_cache_value "$cache" "$key")
    [[ -n "$value" ]] || return 1

    ! is_under_path "$value" "$root"
}

cmake_cache_path_not_equal() {
    local cache=$1
    local key=$2
    local expected=$3
    local value

    value=$(cmake_cache_value "$cache" "$key")
    [[ -n "$value" && "$value" != "$expected" ]]
}

fail_stale_cache() {
    local dir=$1
    local reason=$2

    echo "Stale CMake cache in $dir: $reason" >&2
    echo "Remove it and rebuild: rm -rf $dir" >&2
    exit 1
}

find_wasi_sdk_path() {
    local candidate prefixed_clang

    candidate="${WASI_SDK_PATH:-}"
    if [[ -n "$candidate" && -f "$candidate/share/cmake/wasi-sdk-p1.cmake" ]]; then
        candidate=$(cd "$candidate" && pwd)
        printf '%s\n' "$candidate"
        return 0
    fi

    prefixed_clang=$(command -v wasm32-wasip1-clang || true)
    [[ -n "$prefixed_clang" ]] || return 1

    candidate=$(cd "$(dirname "$prefixed_clang")/.." && pwd)
    if [[ -f "$candidate/share/cmake/wasi-sdk-p1.cmake" ]]; then
        printf '%s\n' "$candidate"
        return 0
    fi

    return 1
}

EMSDK_PATH=""
EMSDK_PATH=$(find_emsdk_path || true)
if ! EMCMAKE=$(find_emcmake); then
    echo "Emscripten is not active; emcmake was not found." >&2
    echo "Activate emsdk before running scripts/build.sh." >&2
    exit 1
fi

if ! WASI_SDK_PATH=$(find_wasi_sdk_path); then
    echo "WASI_SDK_PATH must point to a wasi-sdk installation." >&2
    echo "Set WASI_SDK_PATH, or put wasm32-wasip1-clang on PATH." >&2
    exit 1
fi
export WASI_SDK_PATH

wasi_toolchain="$WASI_SDK_PATH/share/cmake/wasi-sdk-p1.cmake"
if [[ ! -f "$wasi_toolchain" ]]; then
    echo "WASI_SDK_PATH does not contain share/cmake/wasi-sdk-p1.cmake: $WASI_SDK_PATH" >&2
    exit 1
fi

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

if [[ -n "$EMSDK_PATH" && -f build/CMakeCache.txt ]]; then
    for key in \
        CMAKE_TOOLCHAIN_FILE \
        CMAKE_ASM_COMPILER \
        CMAKE_C_COMPILER \
        CMAKE_CXX_COMPILER \
        CMAKE_CROSSCOMPILING_EMULATOR \
        CMAKE_INSTALL_PREFIX; do
        if cmake_cache_path_outside build/CMakeCache.txt "$key" "$EMSDK_PATH"; then
            fail_stale_cache build "$key points outside current emsdk"
        fi
    done
fi
if [[ -f build/CMakeCache.txt ]]; then
    value=$(cmake_cache_value build/CMakeCache.txt CLANG_FORMAT_LLVM_SOURCE_DIR)
    if [[ "$value" != "$llvm_source_dir" ]]; then
        fail_stale_cache build "CLANG_FORMAT_LLVM_SOURCE_DIR points at a different LLVM source directory"
    fi
fi

if [[ -f build-native-tools/CMakeCache.txt ]]; then
    if cmake_cache_path_not_equal build-native-tools/CMakeCache.txt CMAKE_HOME_DIRECTORY "$llvm_source_dir/llvm"; then
        fail_stale_cache build-native-tools "native tools point at a different LLVM source directory"
    fi

    for key in CMAKE_C_COMPILER CMAKE_CXX_COMPILER CMAKE_ASM_COMPILER; do
        value=$(cmake_cache_value build-native-tools/CMakeCache.txt "$key")
        [[ -n "$value" ]] || continue
        if is_under_path "$value" "${EMSDK_PATH:-}" "${WASI_SDK_PATH:-}"; then
            fail_stale_cache build-native-tools "$key points at emsdk or wasi-sdk"
        fi
    done
fi

if [[ -d build-wasi/CMakeFiles ]] &&
    grep -R -- '--target=wasm32-wasi ' build-wasi/CMakeFiles build-wasi/build.ninja >/dev/null 2>&1; then
    fail_stale_cache build-wasi "legacy wasm32-wasi target was cached"
fi

if [[ -f build-wasi/CMakeCache.txt ]]; then
    for key in \
        CMAKE_TOOLCHAIN_FILE \
        CMAKE_C_COMPILER \
        CMAKE_CXX_COMPILER \
        CMAKE_ASM_COMPILER \
        CMAKE_AR \
        CMAKE_RANLIB; do
        if cmake_cache_path_outside build-wasi/CMakeCache.txt "$key" "$WASI_SDK_PATH"; then
            fail_stale_cache build-wasi "$key points outside current wasi-sdk"
        fi
    done
fi
if [[ -f build-wasi/CMakeCache.txt ]]; then
    value=$(cmake_cache_value build-wasi/CMakeCache.txt CLANG_FORMAT_LLVM_SOURCE_DIR)
    if [[ "$value" != "$llvm_source_dir" ]]; then
        fail_stale_cache build-wasi "CLANG_FORMAT_LLVM_SOURCE_DIR points at a different LLVM source directory"
    fi
fi
mkdir -p "$llvm_source_base"

cmake \
    -DCLANG_FORMAT_LLVM_SOURCE_DIR="$llvm_source_dir" \
    -DCLANG_FORMAT_LLVM_BINARY_DIR="$llvm_source_build_dir" \
    -DCLANG_FORMAT_LLVM_SUBBUILD_DIR="$llvm_source_subbuild_dir" \
    -P cmake/PrepareLLVMSource.cmake

cmake -S "$llvm_source_dir/llvm" -B "$native_tools_dir" -G Ninja \
    -C "$project_root/cmake/NativeToolsCache.cmake" \
    -DCMAKE_C_COMPILER="$HOST_CC" \
    -DCMAKE_CXX_COMPILER="$HOST_CXX"
cmake --build "$native_tools_dir" --target llvm-tblgen clang-tblgen

rm -f build/clang-format-esm-Os.wasm build/clang-format-esm-Oz.wasm

(
    if [[ ! -x "$EMCMAKE" ]]; then
        echo "Emscripten is not active; emcmake was not found." >&2
        exit 1
    fi

    "$EMCMAKE" cmake --preset clang-format-esm
    cmake --build --preset clang-format-esm
)

cmake --preset clang-format-wasi
cmake --build --preset clang-format-wasi

if [[ -n "${WASM_OPT:-}" ]]; then
    if ! WASM_OPT_BIN=$(command -v wasm-opt); then
        echo "WASM_OPT=1 requires wasm-opt." >&2
        echo "Install Binaryen or activate emsdk before running scripts/build.sh." >&2
        exit 1
    fi

    "$WASM_OPT_BIN" \
        --enable-bulk-memory \
        --enable-nontrapping-float-to-int \
        -Os build/clang-format-esm.wasm \
        -o build/clang-format-esm-Os.wasm
    "$WASM_OPT_BIN" \
        --enable-bulk-memory \
        --enable-nontrapping-float-to-int \
        -Oz build/clang-format-esm.wasm \
        -o build/clang-format-esm-Oz.wasm
fi

bash scripts/package.sh "$llvm_source_dir"
