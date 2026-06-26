#ifndef CUSTOM_FILE_SYSTEM_H
#define CUSTOM_FILE_SYSTEM_H

#include "llvm/ADT/IntrusiveRefCntPtr.h"
#include "llvm/ADT/SmallString.h"
#include "llvm/ADT/SmallVector.h"
#include "llvm/Support/ErrorOr.h"
#include "llvm/Support/Path.h"
#include "llvm/Support/VirtualFileSystem.h"

namespace llvm {
namespace vfs {

sys::path::Style getPathStyle();
std::error_code make_absolute(SmallVectorImpl<char> &path);

class CustomFileSystem : public ProxyFileSystem {
public:
  CustomFileSystem(IntrusiveRefCntPtr<FileSystem> FS);

  std::error_code makeAbsolute(SmallVectorImpl<char> &Path) const override;
};

} // namespace vfs
} // namespace llvm

#endif // CUSTOM_FILE_SYSTEM_H
