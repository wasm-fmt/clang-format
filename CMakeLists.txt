cmake_minimum_required(VERSION 3.24.0)

message(STATUS "Using toolchain file: ${CMAKE_TOOLCHAIN_FILE}")

include(FetchContent)

set(LLVM_ENABLE_PROJECTS clang CACHE STRING "")

if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE "MinSizeRel")
endif()

set(LLVM_VERSION "16.0.6")

FetchContent_Declare(llvm_project
    URL "https://github.com/llvm/llvm-project/releases/download/llvmorg-${LLVM_VERSION}/llvm-project-${LLVM_VERSION}.src.tar.xz"
    URL_HASH SHA256=ce5e71081d17ce9e86d7cbcfa28c4b04b9300f8fb7e78422b1feb6bc52c3028e
    TLS_VERIFY TRUE
    DOWNLOAD_EXTRACT_TIMESTAMP TRUE
)

FetchContent_MakeAvailable(llvm_project)

add_subdirectory(${llvm_project_SOURCE_DIR}/llvm)

set(LLVM_INCLUDE_DIRS
    ${LLVM_SOURCE_DIR}/include
    ${LLVM_BINARY_DIR}/include
    ${LLVM_EXTERNAL_CLANG_SOURCE_DIR}/include
    ${LLVM_BINARY_DIR}/tools/clang/include
)

set(LLVM_LIBRARIES
    clangBasic
    clangFormat
    clangRewrite
    clangToolingCore
)

project(clang-format-wasm)
add_executable(clang-format-wasm src/lib.cc)

target_include_directories(clang-format-wasm PRIVATE ${LLVM_INCLUDE_DIRS})
target_compile_features(clang-format-wasm PRIVATE cxx_std_17)
target_compile_options(clang-format-wasm PRIVATE
    -Os
    -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=0
)

target_link_libraries(clang-format-wasm PRIVATE
    ${LLVM_LIBRARIES}
    "-lembind"
    "-fno-rtti"
    "-flto"
    "-s MINIMAL_RUNTIME=1"
    "-s DYNAMIC_EXECUTION=0"
    "-s FILESYSTEM=0"
    "-s MODULARIZE=1"
    "-s ENVIRONMENT=web"
    "-s IMPORTED_MEMORY=1"
    "-s ALLOW_MEMORY_GROWTH=1"
    "-s MINIMAL_RUNTIME_STREAMING_WASM_COMPILATION=1"
)
