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
    wasm-opt -Os build/clang-format-wasm.wasm -o build/clang-format-Os.wasm
    wasm-opt -Oz build/clang-format-wasm.wasm -o build/clang-format-Oz.wasm
fi

SMALLEST_WASM=$(ls -Sr build/*.wasm | head -1)

cp $SMALLEST_WASM pkg/clang-format.wasm
npm exec terser -- src/template.js build/clang-format-wasm.js --config-file .terser.json --output pkg/clang-format.js

cp src/clang-format.d.ts src/clang-format-*.js pkg
cp package.json LICENSE README.md .npmignore pkg
cp ./build/_deps/llvm_project-src/clang/tools/clang-format/git-clang-format ./pkg/git-clang-format

./scripts/package.mjs ./package.json
