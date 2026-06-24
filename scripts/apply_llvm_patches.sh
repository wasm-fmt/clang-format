#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
    echo "usage: $0 <llvm-project-source-dir>" >&2
    exit 2
fi

llvm_source_dir=$1
repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
patch_dir="$repo_root/patches/llvm"
stamp_file="$llvm_source_dir/.clang-format-wasm-patches.sha256"

if [[ ! -d "$llvm_source_dir/llvm" || ! -d "$llvm_source_dir/clang" ]]; then
    echo "not an llvm-project source directory: $llvm_source_dir" >&2
    exit 2
fi
llvm_source_dir=$(cd "$llvm_source_dir" && pwd)
llvm_source_parent=$(cd "$llvm_source_dir/.." && pwd)

if ! command -v git >/dev/null 2>&1; then
    echo "git is required to apply LLVM patches" >&2
    exit 2
fi
git_apply=(env GIT_CEILING_DIRECTORIES="$llvm_source_parent" git -C "$llvm_source_dir" apply -p1)

shopt -s nullglob
patches=("$patch_dir"/*.patch)

patch_manifest=""
if [[ ${#patches[@]} -gt 0 ]]; then
    patch_manifest=$(
        for patch_file in "${patches[@]}"; do
            patch_name=$(basename "$patch_file")
            patch_sha=$(shasum -a 256 "$patch_file" | awk '{print $1}')
            printf '%s  %s\n' "$patch_sha" "$patch_name"
        done
    )
fi

if [[ -f "$stamp_file" ]]; then
    stamped_manifest=$(cat "$stamp_file")
    if [[ "$stamped_manifest" != "$patch_manifest" ]]; then
        echo "LLVM patch set changed for source directory: $llvm_source_dir" >&2
        echo "Remove the cached source tree and rebuild, or provide a clean CLANG_FORMAT_LLVM_SOURCE_DIR." >&2
        echo "Expected patch stamp: $stamp_file" >&2
        exit 1
    fi
fi

if [[ ${#patches[@]} -eq 0 ]]; then
    exit 0
fi

for patch_file in "${patches[@]}"; do
    patch_name=$(basename "$patch_file")

    if "${git_apply[@]}" --check "$patch_file" >/dev/null 2>&1; then
        "${git_apply[@]}" "$patch_file"
        echo "Applied LLVM patch: $patch_name"
    elif "${git_apply[@]}" --reverse --check "$patch_file" >/dev/null 2>&1; then
        echo "LLVM patch already applied: $patch_name"
    else
        echo "Failed to apply LLVM patch: $patch_name" >&2
        echo "Forward check output:" >&2
        "${git_apply[@]}" --check "$patch_file" >&2 || true
        echo "Reverse check output:" >&2
        "${git_apply[@]}" --reverse --check "$patch_file" >&2 || true
        echo "The fetched LLVM source may be dirty, the LLVM version may have changed, or the patch needs refresh." >&2
        exit 1
    fi
done

printf '%s\n' "$patch_manifest" >"$stamp_file"
