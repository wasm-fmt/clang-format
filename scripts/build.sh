cd $(dirname $0)/..
project_root=$(pwd)

rm -rf npm
mkdir npm

cp src/lib.cc third_party/llvm-project/clang/tools/clang-format/ClangFormat.cpp
cd third_party/llvm-project
rm -rf build
mkdir build
cd build

EXTRA_COMPILER_FLAGS="-Os -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=0"

EXTRA_EXE_LINKER_FLAGS="-lembind \
                        -fno-rtti \
                        -sMINIMAL_RUNTIME \
                        -sNO_DYNAMIC_EXECUTION \
                        -sNO_FILESYSTEM \
                        -sMODULARIZE \
                        -sENVIRONMENT=web \
                        --pre-js=$project_root/src/pre.js"

emcmake cmake -G Ninja -DCMAKE_BUILD_TYPE=MinSizeRel \
    -DLLVM_ENABLE_PROJECTS=clang \
    -DCMAKE_C_COMPILER=$(which clang) \
    -DCMAKE_CXX_COMPILER=$(which clang++) \
    -DCMAKE_C_FLAGS="${EXTRA_COMPILER_FLAGS}" \
    -DCMAKE_CXX_FLAGS="${EXTRA_COMPILER_FLAGS}" \
    -DCMAKE_EXE_LINKER_FLAGS="${EXTRA_EXE_LINKER_FLAGS}" \
    ../llvm
ninja clang-format

sed 's/output.instance.exports/(output.instance||output).exports/' bin/clang-format.js >bin/clang-format-mod.js
cp bin/clang-format.wasm $project_root/npm
npm exec terser -- $project_root/src/template.js bin/clang-format-mod.js --config-file $project_root/.terser.json --output $project_root/npm/clang-format.js

cd $project_root
cp src/clang-format.d.ts src/vite.js npm
cp package.json LICENSE README.md .npmignore npm
