# LLVM Patches

Patches in this directory are applied to the fetched `llvm-project` source before
LLVM is added to the CMake build. Keep these patches pinned and reviewed; do not
fetch live pull request diffs during the build.

## `0001-pr-92677-wasi-posix-llvm-22.1.8.patch`

Backport of <https://github.com/llvm/llvm-project/pull/92677> for the pinned
LLVM `22.1.8` source tarball.

- PR title: `Conditionalize use of POSIX features missing on WASI/WebAssembly`
- Pinned PR head: `44c7dadc811107e59e1e47c270230354c4fe7db6`
- Upstream PR patch sha256 at pin time:
  `2e8bd4fb439314f301e402261f91813079c45fd758f8208816538e9be0c84307`
- Target LLVM tarball sha256:
  `922f1817a0df7b1489272d18134ee0087a8b068828f87ac63b9861b1a9965888`

The raw upstream PR patch does not apply cleanly to LLVM `22.1.8`, so the patch
file here is the reviewed backport against the current pinned source.

To check whether the upstream PR moved:

```sh
npm run check:llvm-patches
```

If the PR head changed, review the upstream diff, refresh this backport against
the currently pinned LLVM source, then rebuild and run the tests. If the PR has
merged and the pinned LLVM source is updated to a version containing it, remove
this patch and the pin metadata.
