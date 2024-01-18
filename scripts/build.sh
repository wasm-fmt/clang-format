set -Eeo pipefail

cd $(dirname $0)/..
project_root=$(pwd)

rm -rf npm
mkdir -p npm build
cd build

export CC=$(which clang)
export CXX=$(which clang++)

emcmake cmake -G Ninja ..
ninja clang-format-wasm

cd $project_root

sed 's/output.instance.exports/(output.instance||output).exports/' build/clang-format-wasm.js >build/clang-format.js

if [[ ! -z "${WASM_OPT}" ]]; then
    wasm-opt -Os build/clang-format-wasm.wasm -o build/clang-format-Os.wasm
    wasm-opt -Oz build/clang-format-wasm.wasm -o build/clang-format-Oz.wasm
fi

SMALLEST_WASM=$(ls -Sr build/*.wasm | head -1)

cp $SMALLEST_WASM npm/clang-format.wasm
npm exec terser -- src/template.js build/clang-format.js --config-file .terser.json --output npm/clang-format.js

cp src/clang-format.d.ts src/clang-format-*.js npm
cp package.json LICENSE README.md .npmignore npm
