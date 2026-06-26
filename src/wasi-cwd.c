#if defined(__wasi__)
#include "wasi-path.h"

#include <stdlib.h>
#include <unistd.h>

__attribute__((constructor)) static void clang_format_wasi_init_cwd(void) {
  const char *pwd = getenv("PWD");
  if (pwd == NULL || pwd[0] == '\0')
    return;

  // PWD is host-native. chdir needs a path in WASI guest syntax.
  char *translated = clang_format_wasi_path(pwd);
  if (translated == NULL)
    return;

  (void)chdir(translated);
  free(translated);
}
#endif
