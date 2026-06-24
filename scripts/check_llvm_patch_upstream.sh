#!/usr/bin/env bash
set -euo pipefail

repo="llvm/llvm-project"
pr_number="92677"
pinned_head="44c7dadc811107e59e1e47c270230354c4fe7db6"
patch_file="patches/llvm/0001-pr-92677-wasi-posix-llvm-22.1.8.patch"

if ! command -v gh >/dev/null 2>&1; then
    echo "gh is required to check LLVM PR #$pr_number" >&2
    exit 2
fi

if [[ ! -f "$patch_file" ]]; then
    echo "missing patch file: $patch_file" >&2
    exit 2
fi

pr_data=$(gh pr view "$pr_number" --repo "$repo" \
    --json state,headRefOid,updatedAt,mergeable,url,title \
    --jq '[.state, .headRefOid, .updatedAt, .mergeable, .url, .title] | @tsv')

IFS=$'\t' read -r state head_oid updated_at mergeable url title <<<"$pr_data"

if [[ "$state" == "MERGED" ]]; then
    echo "LLVM PR #$pr_number has merged: $url" >&2
    echo "Review whether this backport can be removed after updating the LLVM source version." >&2
    exit 1
fi

if [[ "$head_oid" != "$pinned_head" ]]; then
    echo "LLVM PR #$pr_number head changed." >&2
    echo "Pinned:  $pinned_head" >&2
    echo "Current: $head_oid" >&2
    echo "Review the upstream PR and refresh $patch_file if the changes are still needed." >&2
    exit 1
fi

patch_sha=$(shasum -a 256 "$patch_file" | awk '{print $1}')

echo "LLVM PR #$pr_number is still pinned to $pinned_head"
echo "State: $state, mergeable: $mergeable, updated: $updated_at"
echo "Title: $title"
echo "URL: $url"
echo "Local patch sha256: $patch_sha"
