set -Eeuo pipefail

cd $(dirname $0)/..
project_root=$(pwd)

rm -rf npm
mkdir -p npm build
cd build

emcmake cmake -G Ninja \
    -DCMAKE_C_COMPILER=$(which clang) \
    -DCMAKE_CXX_COMPILER=$(which clang++) \
    ..
ninja clang-format-wasm

cd $project_root

sed 's/output.instance.exports/(output.instance||output).exports/' build/clang-format-wasm.js >build/clang-format.js
cp build/clang-format-wasm.wasm npm/clang-format.wasm
npm exec terser -- src/template.js build/clang-format.js --config-file .terser.json --output npm/clang-format.js

cp src/clang-format.d.ts src/vite.js npm
cp package.json LICENSE README.md .npmignore npm
