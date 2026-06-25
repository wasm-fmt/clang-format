#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 1 ]]; then
    echo "Usage: scripts/package.sh <llvm-project-source-dir>" >&2
    exit 1
fi

cd "$(dirname "$0")/.."
shopt -s nullglob

llvm_source_dir=$1
esm_wasm=build/clang-format-esm.wasm
cli_wasm=build-wasi/clang-format-cli.wasm
packaged_esm_wasm=$esm_wasm
packaged_cli_wasm=$cli_wasm
optimized_esm_wasm=build/clang-format-esm-opt.wasm
optimized_cli_wasm=build-wasi/clang-format-cli-opt.wasm
wasm_opt_bin=

optimize_wasm() {
    local input=$1
    local output=$2
    local stripped_wasm=${output%.wasm}-stripped.wasm

    wasm-tools strip "$input" -o "$stripped_wasm"
    "$wasm_opt_bin" \
        --enable-bulk-memory \
        --enable-nontrapping-float-to-int \
        -Oz "$stripped_wasm" \
        -o "$output"
    rm -f "$stripped_wasm"
}

if [[ ! -f "$esm_wasm" ]]; then
    echo "Emscripten wasm artifact not found: $esm_wasm" >&2
    exit 1
fi

if [[ ! -f "$cli_wasm" ]]; then
    echo "WASI CLI wasm not found: $cli_wasm" >&2
    exit 1
fi

rm -f \
    build/clang-format-esm-Os.wasm \
    build/clang-format-esm-Oz.wasm \
    "$optimized_esm_wasm" \
    "$optimized_cli_wasm"

if [[ -n "${WASM_OPT:-}" ]]; then
    if ! command -v wasm-tools >/dev/null 2>&1; then
        echo "WASM_OPT=1 requires wasm-tools." >&2
        echo "Run 'mise install', or install wasm-tools manually." >&2
        exit 1
    fi
    if ! wasm_opt_bin=$(command -v wasm-opt); then
        echo "WASM_OPT=1 requires wasm-opt." >&2
        echo "Run 'mise install', or activate emsdk before running scripts/package.sh." >&2
        exit 1
    fi

    optimize_wasm "$esm_wasm" "$optimized_esm_wasm"
    optimize_wasm "$cli_wasm" "$optimized_cli_wasm"
    packaged_esm_wasm=$optimized_esm_wasm
    packaged_cli_wasm=$optimized_cli_wasm
fi

rm -rf pkg
mkdir -p pkg

cp "$packaged_esm_wasm" pkg/clang-format.wasm
node scripts/esm_patch.mjs build/clang-format-esm.js pkg/clang-format.js

cp -LR ./extra/. ./pkg/
cp "$packaged_cli_wasm" ./pkg/clang-format-cli.wasm
cp ./package.json ./README.md ./LICENSE ./jsr.jsonc ./pkg/
node ./pkg/clang-format-cli.cjs --style=file:./scripts/.clang-format -i ./pkg/*.{js,cjs,ts}

cp "$llvm_source_dir/clang/tools/clang-format/git-clang-format" ./pkg/
cp "$llvm_source_dir/clang/tools/clang-format/clang-format-diff.py" ./pkg/

ls -lh ./pkg
