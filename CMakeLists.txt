cmake_minimum_required(VERSION 3.24.0)

message(STATUS "Using toolchain file: ${CMAKE_TOOLCHAIN_FILE}")

include(FetchContent)

set(LLVM_ENABLE_PROJECTS clang CACHE STRING "LLVM projects to build")

add_definitions(-D__WASM__)

set(LLVM_INCLUDE_UTILS OFF CACHE BOOL "Include LLVM utils")
set(LLVM_INCLUDE_EXAMPLES OFF CACHE BOOL "Include LLVM examples")
set(LLVM_INCLUDE_TESTS OFF CACHE BOOL "Include LLVM tests")
set(LLVM_INCLUDE_BENCHMARKS OFF CACHE BOOL "Include LLVM benchmarks")

set(NO_RTTI "-fno-rtti" CACHE STRING "Disable RTTI")
add_definitions(${NO_RTTI})

if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE "MinSizeRel")
endif()

set(LLVM_VERSION "20.1.8")

FetchContent_Declare(llvm_project
    URL "https://github.com/llvm/llvm-project/releases/download/llvmorg-${LLVM_VERSION}/llvm-project-${LLVM_VERSION}.src.tar.xz"
    URL_HASH SHA256=6898f963c8e938981e6c4a302e83ec5beb4630147c7311183cf61069af16333d
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

add_custom_target(clang-format-wasm)
add_dependencies(clang-format-wasm clang-format-esm clang-format-cli)

add_executable(clang-format-esm src/lib.cc src/binding.cc)
target_include_directories(clang-format-esm PRIVATE ${LLVM_INCLUDE_DIRS})
target_compile_features(clang-format-esm PRIVATE cxx_std_17)
target_compile_options(clang-format-esm PRIVATE
    -Os
    -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=0
)

target_link_libraries(clang-format-esm PRIVATE
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
    "-s MINIMAL_RUNTIME_STREAMING_WASM_COMPILATION=1"
)

add_executable(clang-format-cli
    src/cli.cc
    src/CustomFileSystem.cc
)
target_include_directories(clang-format-cli PRIVATE ${LLVM_INCLUDE_DIRS})
target_compile_features(clang-format-cli PRIVATE cxx_std_17)
target_compile_options(clang-format-cli PRIVATE
    -Os
    -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=0
)

target_link_libraries(clang-format-cli PRIVATE
    ${LLVM_LIBRARIES}
    "-fno-rtti"
    "-lnodefs.js"
    "--pre-js ${CMAKE_CURRENT_SOURCE_DIR}/src/cli-pre.js"
    "-s DYNAMIC_EXECUTION=0"
    "-s ENVIRONMENT=node"
    "-s NODERAWFS=1"
    "-s ALLOW_MEMORY_GROWTH=1"
)
