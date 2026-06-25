cmake_minimum_required(VERSION 3.24.0)

project(clang-format-wasm LANGUAGES C CXX)

message(STATUS "Using toolchain file: ${CMAKE_TOOLCHAIN_FILE}")

list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")

include(ClangFormatOptions)
include(ClangFormatWasi)
include(LLVMProject)
include(ClangFormatTargets)
