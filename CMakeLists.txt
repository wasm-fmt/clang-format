cmake_minimum_required(VERSION 3.20.0)

project(clang-format-wasm)

set(LLVM_ENABLE_PROJECTS clang CACHE STRING "")

if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE "MinSizeRel")
endif()

add_subdirectory(third_party/llvm-project/llvm)

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
    "-s MINIMAL_RUNTIME=1"
    "-s DYNAMIC_EXECUTION=0"
    "-s FILESYSTEM=0"
    "-s MODULARIZE=1"
    "-s ENVIRONMENT=web"
    "-s IMPORTED_MEMORY=1"
    "-s ALLOW_MEMORY_GROWTH=1"
    "--pre-js=${PROJECT_SOURCE_DIR}/src/pre.js"
)
