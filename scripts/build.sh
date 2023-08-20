cd $(dirname $0)/..
project_root=$(pwd)

rm -rf npm
mkdir npm

cp src/lib.cc third_party/llvm-project/clang/tools/clang-format/ClangFormat.cpp
cd third_party/llvm-project
rm -rf build
mkdir build
cd build
emcmake cmake -E env CXXFLAGS="-Os -lembind -fno-rtti -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=0" cmake -G Ninja -DCMAKE_BUILD_TYPE=MinSizeRel -DLLVM_ENABLE_PROJECTS=clang ../llvm
ninja clang-format

$project_root/scripts/gen-clang-format.js $PWD/bin/clang-format.js $project_root/src/template.js $project_root/npm/clang-format.js
cp bin/clang-format.wasm $project_root/npm

cd $project_root
cp src/clang-format.d.ts src/vite.js npm
cp package.json LICENSE README.md .npmignore npm
