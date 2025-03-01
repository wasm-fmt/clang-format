cmake_minimum_required(VERSION 3.24.0)

message(STATUS "Using toolchain file: ${CMAKE_TOOLCHAIN_FILE}")
message(STATUS "Building on platform: ${CMAKE_SYSTEM_NAME}")

include(FetchContent)

set(LLVM_ENABLE_PROJECTS clang CACHE STRING "LLVM projects to build")

set(LLVM_INCLUDE_UTILS OFF CACHE BOOL "Include LLVM utils")
set(LLVM_INCLUDE_EXAMPLES OFF CACHE BOOL "Include LLVM examples")
set(LLVM_INCLUDE_TESTS OFF CACHE BOOL "Include LLVM tests")
set(LLVM_INCLUDE_BENCHMARKS OFF CACHE BOOL "Include LLVM benchmarks")

set(NO_RTTI "-fno-rtti" CACHE STRING "Disable RTTI")
add_definitions(${NO_RTTI})

if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE "MinSizeRel")
endif()

set(LLVM_VERSION "19.1.7")

FetchContent_Declare(llvm_project
    URL "https://github.com/llvm/llvm-project/releases/download/llvmorg-${LLVM_VERSION}/llvm-project-${LLVM_VERSION}.src.tar.xz"
    URL_HASH SHA256=82401fea7b79d0078043f7598b835284d6650a75b93e64b6f761ea7b63097501
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

# Define build targets based on platform
if(CMAKE_SYSTEM_NAME STREQUAL "Emscripten")
    add_custom_target(clang-format-wasm)
    
    if(DEFINED ENV{BUILD_TARGET})
        if($ENV{BUILD_TARGET} STREQUAL "lib")
            message(STATUS "Building Lib target")
            include(${CMAKE_CURRENT_SOURCE_DIR}/cmake/clang-format-esm.cmake)
            add_dependencies(clang-format-wasm clang-format-esm)
        elseif($ENV{BUILD_TARGET} STREQUAL "cli")
            message(STATUS "Building CLI target")
            include(${CMAKE_CURRENT_SOURCE_DIR}/cmake/clang-format-cli.cmake)
            add_dependencies(clang-format-wasm clang-format-cli)
        else()
            message(STATUS "Building all targets")
            include(${CMAKE_CURRENT_SOURCE_DIR}/cmake/clang-format-esm.cmake)
            include(${CMAKE_CURRENT_SOURCE_DIR}/cmake/clang-format-cli.cmake)
            add_dependencies(clang-format-wasm clang-format-esm clang-format-cli)
        endif()
    else()
        message(STATUS "Building all targets")
        include(${CMAKE_CURRENT_SOURCE_DIR}/cmake/clang-format-esm.cmake)
        include(${CMAKE_CURRENT_SOURCE_DIR}/cmake/clang-format-cli.cmake)
        add_dependencies(clang-format-wasm clang-format-esm clang-format-cli)
    endif()
else()
    message(FATAL_ERROR "Unsupported platform: ${CMAKE_SYSTEM_NAME}. This project requires Emscripten.")
endif()
