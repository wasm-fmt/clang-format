include_guard(GLOBAL)

include(LLVMSource)

# LLVM build targets
set(LLVM_TARGETS_TO_BUILD "" CACHE STRING "LLVM target architectures")
set(LLVM_ENABLE_PROJECTS clang CACHE STRING "LLVM projects to build")

# LLVM feature toggles
set(LLVM_ENABLE_BACKTRACES OFF CACHE BOOL "Backtrace support")
set(LLVM_ENABLE_CRASH_OVERRIDES OFF CACHE BOOL "Crash overrides")
set(LLVM_ENABLE_TERMINFO OFF CACHE BOOL "Terminfo support")
set(LLVM_ENABLE_THREADS OFF CACHE BOOL "Thread support")
set(LLVM_ENABLE_ZLIB OFF CACHE BOOL "Zlib compression")
set(LLVM_ENABLE_ZSTD OFF CACHE BOOL "Zstd compression")

# Skip compiler version check - Emscripten uses its own libc++
set(LLVM_COMPILER_CHECKED ON CACHE BOOL "Skip compiler version check")

# LLVM build contents
set(LLVM_INCLUDE_BENCHMARKS OFF CACHE BOOL "Include benchmarks")
set(LLVM_INCLUDE_EXAMPLES OFF CACHE BOOL "Include examples")
set(LLVM_INCLUDE_TESTS OFF CACHE BOOL "Include tests")
set(LLVM_INCLUDE_UTILS OFF CACHE BOOL "Include utils")
set(LLVM_BUILD_TOOLS OFF CACHE BOOL "Build LLVM tools")
set(LLVM_BUILD_UTILS OFF CACHE BOOL "Build LLVM utilities")

# Clang feature toggles
set(CLANG_BUILD_TOOLS OFF CACHE BOOL "Build Clang tools")
set(CLANG_ENABLE_OBJC_REWRITER OFF CACHE BOOL "Objective-C rewriter")
set(CLANG_ENABLE_STATIC_ANALYZER OFF CACHE BOOL "Static analyzer")

clang_format_fetch_llvm_source(llvm_project_SOURCE_DIR)
add_subdirectory("${llvm_project_SOURCE_DIR}/llvm" "${CMAKE_BINARY_DIR}/llvm")

set(CLANG_FORMAT_LLVM_INCLUDE_DIRS
    ${LLVM_SOURCE_DIR}/include
    ${LLVM_BINARY_DIR}/include
    ${LLVM_EXTERNAL_CLANG_SOURCE_DIR}/include
    ${LLVM_BINARY_DIR}/tools/clang/include
)

set(CLANG_FORMAT_LLVM_LIBRARIES
    clangBasic
    clangFormat
    clangRewrite
    clangToolingCore
)
