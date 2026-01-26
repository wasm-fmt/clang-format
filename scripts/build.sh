set -Eeo pipefail

cd $(dirname $0)/..
project_root=$(pwd)

rm -rf pkg
mkdir -p pkg build
cd build

export CC=$(which clang)
export CXX=$(which clang++)

emcmake cmake -G Ninja ..
ninja clang-format-wasm

cd $project_root

if [[ ! -z "${WASM_OPT}" ]]; then
    wasm-opt --enable-bulk-memory --enable-nontrapping-float-to-int -Os build/clang-format-esm.wasm -o build/clang-format-esm-Os.wasm
    wasm-opt --enable-bulk-memory --enable-nontrapping-float-to-int -Oz build/clang-format-esm.wasm -o build/clang-format-esm-Oz.wasm
fi

SMALLEST_WASM=$(ls -Sr build/clang-format-e*.wasm | head -1)

cp $SMALLEST_WASM pkg/clang-format.wasm
node scripts/esm_patch.mjs build/clang-format-esm.js pkg/clang-format.js

# add shebang
echo '#!/usr/bin/env node' | cat - ./build/clang-format-cli.js >./pkg/clang-format-cli.cjs
cp ./build/clang-format-cli.wasm ./pkg/

cp -LR ./extra/. ./pkg/
node ./pkg/clang-format-cli.cjs --style=file:./scripts/.clang-format -i ./pkg/*.{js,cjs,ts}

# copy git-clang-format and clang-format-diff.py
cp ./build/_deps/llvm_project-src/clang/tools/clang-format/git-clang-format ./pkg/
cp ./build/_deps/llvm_project-src/clang/tools/clang-format/clang-format-diff.py ./pkg/

ls -lh ./pkg
