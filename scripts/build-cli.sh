set -Eeo pipefail

cd $(dirname $0)/..
project_root=$(pwd)

mkdir -p pkg/posix build
cd build

export CC=$(which clang)
export CXX=$(which clang++)
export BUILD_TARGET=cli

emcmake cmake -G Ninja ..
ninja clang-format-wasm

cd $project_root

# add shebang
echo '#!/usr/bin/env node' | cat - ./build/clang-format-cli.js >./pkg/posix/clang-format-cli.cjs
cp ./build/clang-format-cli.wasm ./pkg/posix/

# copy git-clang-format and clang-format-diff.py
cp ./build/_deps/llvm_project-src/clang/tools/clang-format/git-clang-format ./pkg/
cp ./build/_deps/llvm_project-src/clang/tools/clang-format/clang-format-diff.py ./pkg/
