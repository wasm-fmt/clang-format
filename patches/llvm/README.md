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

## `0002-disable-jobserver-on-wasi-llvm-22.1.8.patch`

Local WASI build fix for LLVM `22.1.8`. `llvm/lib/Support/Jobserver.cpp` is
compiled into `LLVMSupport`, but its Unix implementation uses file descriptor
APIs such as `dup()` that are not available in wasi-libc. WASI builds use the
existing dummy Jobserver implementation instead. `clang-format` does not depend
on make jobserver integration.

## `0003-wasi-disable-unsupported-unix-process-apis-llvm-22.1.8.patch`

Local WASI build fix for LLVM `22.1.8`. Some Unix process helpers in
`LLVMSupport` use `rlimit` and terminal `ioctl()` APIs that are not available in
the WASI sysroot. WASI builds use no-op/default behavior for those helpers.

## `0004-wasi-default-program-stack-size-llvm-22.1.8.patch`

Local WASI build fix for LLVM `22.1.8`. `ProgramStack.cpp` queries
`RLIMIT_STACK` on Unix, which the WASI sysroot does not provide. WASI builds use
LLVM's existing default stack size instead.

## `0005-wasi-skip-mapped-file-willneed-llvm-22.1.8.patch`

Local WASI build fix for LLVM `22.1.8`. The WASI sysroot declares
`posix_madvise()` in its emulated `sys/mman.h`, but wasi-sdk 33 does not provide
the symbol at link time. WASI builds treat `mapped_file_region::willNeedImpl()`
as a no-op, matching the existing `dontNeedImpl()` handling.

## `0006-clang-format-custom-filesystem-llvm-22.1.8.patch`

Local clang-format CLI patch for LLVM `22.1.8`. The CLI passes style lookup and
`.clang-format-ignore` path handling through the package's `CustomFileSystem`,
so the WASI build can select POSIX or Windows path rules from the Node wrapper's
`PLATFORM` environment value without maintaining a copied `ClangFormat.cpp`.
