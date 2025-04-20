current_dir=$(pwd)
tmp_dir=$(mktemp -d)

cd $tmp_dir

git init

cp $current_dir/build/_deps/llvm_project-src/clang/tools/clang-format/ClangFormat.cpp ./cli.cc

git add -f .
git commit -m "init"

cp $current_dir/src/cli.cc ./cli.cc

git add -f .
git diff \
    --cached \
    --no-color \
    --ignore-space-at-eol \
    --no-ext-diff \
    --src-prefix=a/src/ \
    --dst-prefix=b/src/ \
    >$current_dir/scripts/cli.patch || true

rm -rf $tmp_dir


