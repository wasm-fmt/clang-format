#include "CustomFileSystem.h"
#include "llvm/Support/Path.h"
#include <cstdlib>
#include <cstring>
#include <system_error>

using namespace llvm;
using namespace llvm::vfs;

namespace {

void normalizePath(SmallVectorImpl<char> &path) {
  auto Style = getPathStyle();
  if (sys::path::is_style_windows(Style))
    sys::path::native(path, Style);
}

std::error_code current_path(SmallVectorImpl<char> &result) {
  result.clear();

  const char *pwd = ::getenv("PWD");
  if (!pwd)
    return {};

  // PWD is host-native. clang-format path logic needs C:/... on Windows.
  result.append(pwd, pwd + strlen(pwd));
  normalizePath(result);
  return {};
}

} // namespace

namespace llvm {
namespace vfs {

sys::path::Style getPathStyle() {
  static const sys::path::Style Style = [] {
    const char *Platform = ::getenv("PLATFORM");
    return Platform != nullptr && ::strcmp(Platform, "win32") == 0
               ? sys::path::Style::windows_slash
               : sys::path::Style::posix;
  }();
  return Style;
}

void make_absolute(const Twine &current_directory,
                   SmallVectorImpl<char> &path) {
  StringRef p(path.data(), path.size());

  auto pathStyle = getPathStyle();

  bool rootDirectory = sys::path::has_root_directory(p, pathStyle);
  bool rootName = sys::path::has_root_name(p, pathStyle);

  // Already absolute.
  if ((rootName || is_style_posix(pathStyle)) && rootDirectory)
    return;

  // All of the following conditions will need the current directory.
  SmallString<128> current_dir;
  current_directory.toVector(current_dir);

  // Relative path. Prepend the current directory.
  if (!rootName && !rootDirectory) {
    // Append path to the current directory.
    sys::path::append(current_dir, pathStyle, p);
    // Set path to the result.
    path.swap(current_dir);
    return;
  }

  if (!rootName && rootDirectory) {
    StringRef cdrn = sys::path::root_name(current_dir, pathStyle);
    SmallString<128> curDirRootName(cdrn.begin(), cdrn.end());
    sys::path::append(curDirRootName, pathStyle, p);
    // Set path to the result.
    path.swap(curDirRootName);
    return;
  }

  if (rootName && !rootDirectory) {
    StringRef pRootName = sys::path::root_name(p, pathStyle);
    StringRef bRootDirectory =
        sys::path::root_directory(current_dir, pathStyle);
    StringRef bRelativePath = sys::path::relative_path(current_dir, pathStyle);
    StringRef pRelativePath = sys::path::relative_path(p, pathStyle);

    SmallString<128> res;
    sys::path::append(res, pathStyle, pRootName, bRootDirectory, bRelativePath,
                      pRelativePath);
    path.swap(res);
    return;
  }

  llvm_unreachable("All rootName and rootDirectory combinations should have "
                   "occurred above!");
}

std::error_code make_absolute(SmallVectorImpl<char> &path) {
  normalizePath(path);

  if (sys::path::is_absolute(path, getPathStyle()))
    return {};

  SmallString<128> current_dir;
  if (std::error_code ec = current_path(current_dir))
    return ec;

  make_absolute(current_dir, path);
  return {};
}

CustomFileSystem::CustomFileSystem(IntrusiveRefCntPtr<FileSystem> FS)
    : ProxyFileSystem(std::move(FS)) {}

std::error_code
CustomFileSystem::makeAbsolute(SmallVectorImpl<char> &Path) const {
  return make_absolute(Path);
}

} // namespace vfs
} // namespace llvm
