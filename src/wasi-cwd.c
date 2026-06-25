#if defined(__wasi__)
#include <stdlib.h>
#include <unistd.h>

__attribute__((constructor)) static void clang_format_wasi_init_cwd(void) {
  const char *pwd = getenv("PWD");
  if (pwd != NULL && pwd[0] != '\0')
    (void)chdir(pwd);
}
#endif
