#ifndef WASI_PATH_H
#define WASI_PATH_H

#ifdef __cplusplus
extern "C" {
#endif

// Converts host-native path syntax to WASI guest syntax. POSIX paths are
// already guest paths; Windows drive paths become /C:/src/file.cc.
// The caller owns the returned string.
char *clang_format_wasi_path(const char *path);

#ifdef __cplusplus
}
#endif

#endif // WASI_PATH_H
