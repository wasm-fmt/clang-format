#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 1 ]]; then
    echo "Usage: scripts/package.sh <llvm-project-source-dir>" >&2
    exit 1
fi

cd "$(dirname "$0")/.."
shopt -s nullglob

llvm_source_dir=$1
cli_wasm=build-wasi/clang-format-cli.wasm
stripped_cli_wasm=build-wasi/clang-format-cli-stripped.wasm

if [[ ! -f "$cli_wasm" ]]; then
    echo "WASI CLI wasm not found: $cli_wasm" >&2
    exit 1
fi

if ! command -v wasm-tools >/dev/null 2>&1; then
    echo "wasm-tools is required to strip the WASI CLI wasm." >&2
    echo "Run 'mise install', or install wasm-tools manually." >&2
    exit 1
fi

if [[ -z "${WASM_OPT:-}" ]]; then
    rm -f build/clang-format-esm-Os.wasm build/clang-format-esm-Oz.wasm
fi
wasm_candidates=(build/clang-format-e*.wasm)

if [[ ${#wasm_candidates[@]} -eq 0 ]]; then
    echo "Emscripten wasm artifact not found under build/." >&2
    exit 1
fi
smallest_wasm=$(ls -Sr "${wasm_candidates[@]}" | head -n 1)

wasm-tools strip "$cli_wasm" -o "$stripped_cli_wasm"

rm -rf pkg
mkdir -p pkg

cp "$smallest_wasm" pkg/clang-format.wasm
rm -f build/clang-format-esm-Os.wasm build/clang-format-esm-Oz.wasm
node scripts/esm_patch.mjs build/clang-format-esm.js pkg/clang-format.js

cp -LR ./extra/. ./pkg/
cp "$stripped_cli_wasm" ./pkg/clang-format-cli.wasm
cp ./package.json ./README.md ./LICENSE ./jsr.jsonc ./pkg/
node ./pkg/clang-format-cli.cjs --style=file:./scripts/.clang-format -i ./pkg/*.{js,cjs,ts}

cp "$llvm_source_dir/clang/tools/clang-format/git-clang-format" ./pkg/
cp "$llvm_source_dir/clang/tools/clang-format/clang-format-diff.py" ./pkg/

ls -lh ./pkg
