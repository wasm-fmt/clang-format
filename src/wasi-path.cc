#include "wasi-path.h"

#include "llvm/ADT/SmallString.h"
#include "llvm/ADT/StringRef.h"
#include "llvm/Support/Path.h"
#include <cerrno>
#include <cstddef>
#include <cstdlib>
#include <cstring>

#if defined(_WIN32) && !defined(__wasi__)
#include <direct.h>
#define getcwd _getcwd
#else
#include <unistd.h>
#endif

#if defined(__wasi__)
#include <wasi/libc-find-relpath.h>
#endif

using namespace llvm;

namespace {

constexpr sys::path::Style WindowsStyle = sys::path::Style::windows_slash;

bool isWin32() {
  const char *Platform = std::getenv("PLATFORM");
  return Platform != nullptr && std::strcmp(Platform, "win32") == 0;
}

char *copyString(StringRef Path) {
  char *Result = static_cast<char *>(std::malloc(Path.size() + 1));
  if (Result == nullptr) {
    errno = ENOMEM;
    return nullptr;
  }

  std::memcpy(Result, Path.data(), Path.size());
  Result[Path.size()] = '\0';
  return Result;
}

bool isDriveRootName(StringRef RootName) {
  return RootName.size() == 2 && RootName[1] == ':';
}

StringRef rootName(StringRef Path) {
  return sys::path::root_name(Path, WindowsStyle);
}

bool hasDriveRootName(StringRef Path) {
  return isDriveRootName(rootName(Path));
}

bool hasWasiDrivePrefix(StringRef Path) {
  if (!Path.starts_with('/'))
    return false;

  StringRef GuestPath = Path.drop_front();
  StringRef RootName = rootName(GuestPath);
  if (!isDriveRootName(RootName))
    return false;

  // Guest drive roots are /C:/; stripped paths must stay drive-absolute C:/.
  return GuestPath.size() > RootName.size() &&
         sys::path::is_separator(GuestPath[RootName.size()], WindowsStyle);
}

bool hasInvalidWasiDrivePrefix(StringRef Path) {
  if (!Path.starts_with('/'))
    return false;

  StringRef GuestPath = Path.drop_front();
  StringRef RootName = rootName(GuestPath);
  if (!isDriveRootName(RootName))
    return false;

  return GuestPath.size() == RootName.size() ||
         !sys::path::is_separator(GuestPath[RootName.size()], WindowsStyle);
}

void uppercaseDriveLetter(SmallVectorImpl<char> &Path) {
  StringRef RootName = rootName(StringRef(Path.data(), Path.size()));
  if (!isDriveRootName(RootName))
    return;

  if (Path[0] >= 'a' && Path[0] <= 'z')
    Path[0] = static_cast<char>(Path[0] - 'a' + 'A');
}

SmallString<256> toWindowsSlashPath(StringRef Path) {
  if (hasWasiDrivePrefix(Path))
    Path = Path.drop_front();

  SmallString<256> Result(Path);
  sys::path::native(Result, WindowsStyle);
  uppercaseDriveLetter(Result);
  return Result;
}

bool isDriveAbsolute(StringRef Path) {
  return hasDriveRootName(Path) &&
         sys::path::has_root_directory(Path, WindowsStyle);
}

bool getCurrentDirectory(SmallString<256> &Result) {
  size_t Length = 128;

  for (;;) {
    char *Buffer = static_cast<char *>(std::malloc(Length));
    if (Buffer == nullptr) {
      errno = ENOMEM;
      return false;
    }

    if (getcwd(Buffer, Length) != nullptr) {
      if (hasInvalidWasiDrivePrefix(Buffer)) {
        std::free(Buffer);
        errno = EINVAL;
        return false;
      }
      Result = toWindowsSlashPath(Buffer);
      std::free(Buffer);
      return true;
    }

    int SavedErrno = errno;
    std::free(Buffer);

    if (SavedErrno != ERANGE) {
      errno = SavedErrno;
      return false;
    }

    if (Length > static_cast<size_t>(-1) / 2) {
      errno = ENOMEM;
      return false;
    }
    Length *= 2;
  }
}

bool makeWindowsAbsolutePath(StringRef Path, SmallString<256> &Result) {
  bool RootDirectory = sys::path::has_root_directory(Path, WindowsStyle);
  bool RootName = sys::path::has_root_name(Path, WindowsStyle);

  if (RootName && RootDirectory) {
    Result = Path;
    uppercaseDriveLetter(Result);
    return true;
  }

  SmallString<256> CurrentDir;
  if (!getCurrentDirectory(CurrentDir))
    return false;

  if (!RootName && !RootDirectory) {
    Result = CurrentDir;
    sys::path::append(Result, WindowsStyle, Path);
    return true;
  }

  if (!RootName && RootDirectory) {
    StringRef CurrentRootName = rootName(CurrentDir);
    if (!isDriveRootName(CurrentRootName)) {
      errno = ENOENT;
      return false;
    }

    Result = CurrentRootName;
    sys::path::append(Result, WindowsStyle, Path);
    uppercaseDriveLetter(Result);
    return true;
  }

  StringRef PathRootName = rootName(Path);
  StringRef CurrentRootDirectory = "/";
  StringRef CurrentRelativePath;
  if (isDriveAbsolute(CurrentDir)) {
    CurrentRootDirectory =
        sys::path::root_directory(CurrentDir, WindowsStyle);
    CurrentRelativePath = sys::path::relative_path(CurrentDir, WindowsStyle);
  }

  Result.clear();
  sys::path::append(Result, WindowsStyle, PathRootName, CurrentRootDirectory,
                    CurrentRelativePath,
                    sys::path::relative_path(Path, WindowsStyle));
  uppercaseDriveLetter(Result);
  return true;
}

char *prefixWasiRoot(StringRef Path) {
  char *Result = static_cast<char *>(std::malloc(Path.size() + 2));
  if (Result == nullptr) {
    errno = ENOMEM;
    return nullptr;
  }

  Result[0] = '/';
  std::memcpy(Result + 1, Path.data(), Path.size());
  Result[Path.size() + 1] = '\0';
  return Result;
}

} // namespace

extern "C" char *clang_format_wasi_path(const char *Path) {
  if (Path == nullptr) {
    errno = EINVAL;
    return nullptr;
  }

  if (!isWin32())
    return copyString(Path);

  if (hasInvalidWasiDrivePrefix(Path)) {
    errno = EINVAL;
    return nullptr;
  }

  SmallString<256> WindowsPath = toWindowsSlashPath(Path);
  StringRef WindowsPathRef(WindowsPath.data(), WindowsPath.size());

  bool RootDirectory =
      sys::path::has_root_directory(WindowsPathRef, WindowsStyle);
  bool DriveRootName = hasDriveRootName(WindowsPathRef);

  if (DriveRootName && RootDirectory)
    return prefixWasiRoot(WindowsPathRef);

  if (DriveRootName || (!sys::path::has_root_name(WindowsPathRef, WindowsStyle) &&
                        RootDirectory)) {
    SmallString<256> AbsolutePath;
    if (!makeWindowsAbsolutePath(WindowsPathRef, AbsolutePath))
      return nullptr;

    return prefixWasiRoot(StringRef(AbsolutePath.data(), AbsolutePath.size()));
  }

  return copyString(WindowsPathRef);
}

#if defined(__wasi__)
extern "C" int __real___wasilibc_find_relpath(const char *Path,
                                              const char **AbsPrefix,
                                              char **RelativePath,
                                              size_t RelativePathLen);

extern "C" int __wrap___wasilibc_find_relpath(const char *Path,
                                              const char **AbsPrefix,
                                              char **RelativePath,
                                              size_t RelativePathLen) {
  if (!isWin32()) {
    return __real___wasilibc_find_relpath(Path, AbsPrefix, RelativePath,
                                          RelativePathLen);
  }

  char *TranslatedPath = clang_format_wasi_path(Path);
  if (TranslatedPath == nullptr)
    return -1;

  int FD = __real___wasilibc_find_relpath(
      TranslatedPath, AbsPrefix, RelativePath, RelativePathLen);
  std::free(TranslatedPath);
  return FD;
}

extern "C" int __real___wasilibc_find_relpath_alloc(
    const char *Path, const char **AbsPrefix, char **RelativePath,
    size_t *RelativePathLen, int CanRealloc);

extern "C" int __wrap___wasilibc_find_relpath_alloc(
    const char *Path, const char **AbsPrefix, char **RelativePath,
    size_t *RelativePathLen, int CanRealloc) {
  if (!isWin32()) {
    return __real___wasilibc_find_relpath_alloc(
        Path, AbsPrefix, RelativePath, RelativePathLen, CanRealloc);
  }

  char *TranslatedPath = clang_format_wasi_path(Path);
  if (TranslatedPath == nullptr)
    return -1;

  int FD = __real___wasilibc_find_relpath_alloc(
      TranslatedPath, AbsPrefix, RelativePath, RelativePathLen, CanRealloc);
  std::free(TranslatedPath);
  return FD;
}
#endif
