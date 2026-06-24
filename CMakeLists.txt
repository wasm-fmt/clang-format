cmake_minimum_required(VERSION 3.24.0)

project(clang-format-wasm LANGUAGES C CXX)

message(STATUS "Using toolchain file: ${CMAKE_TOOLCHAIN_FILE}")

include(FetchContent)

set(CLANG_FORMAT_BUILD_ESM_DEFAULT OFF)
set(CLANG_FORMAT_BUILD_CLI_DEFAULT OFF)

if(CMAKE_SYSTEM_NAME STREQUAL "Emscripten")
    set(CLANG_FORMAT_BUILD_ESM_DEFAULT ON)
elseif(CMAKE_SYSTEM_NAME STREQUAL "WASI")
    set(CLANG_FORMAT_BUILD_CLI_DEFAULT ON)
endif()

option(CLANG_FORMAT_BUILD_ESM "Build the Emscripten JavaScript API target" ${CLANG_FORMAT_BUILD_ESM_DEFAULT})
option(CLANG_FORMAT_BUILD_CLI "Build the WASI clang-format CLI target" ${CLANG_FORMAT_BUILD_CLI_DEFAULT})

if(CLANG_FORMAT_BUILD_ESM AND NOT CMAKE_SYSTEM_NAME STREQUAL "Emscripten")
    message(FATAL_ERROR "CLANG_FORMAT_BUILD_ESM requires the Emscripten toolchain")
endif()

if(CLANG_FORMAT_BUILD_CLI AND NOT CMAKE_SYSTEM_NAME STREQUAL "WASI")
    message(FATAL_ERROR "CLANG_FORMAT_BUILD_CLI requires the WASI toolchain")
endif()

if(CMAKE_SYSTEM_NAME STREQUAL "WASI")
    add_compile_options($<$<COMPILE_LANGUAGE:CXX>:-fno-exceptions>)
    add_compile_definitions(
        _WASI_EMULATED_GETPID
        _WASI_EMULATED_MMAN
        _WASI_EMULATED_PROCESS_CLOCKS
        _WASI_EMULATED_SIGNAL
    )
    list(APPEND CMAKE_REQUIRED_DEFINITIONS
        -D_WASI_EMULATED_GETPID
        -D_WASI_EMULATED_MMAN
        -D_WASI_EMULATED_PROCESS_CLOCKS
        -D_WASI_EMULATED_SIGNAL
    )
    list(APPEND CMAKE_REQUIRED_LIBRARIES
        wasi-emulated-getpid
        wasi-emulated-mman
        wasi-emulated-process-clocks
        wasi-emulated-signal
    )
    link_libraries(
        wasi-emulated-getpid
        wasi-emulated-mman
        wasi-emulated-process-clocks
        wasi-emulated-signal
    )
endif()

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

# Compile options
add_definitions(-D__WASM__)
add_definitions(-fno-rtti)

if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE "MinSizeRel")
endif()

set(LLVM_VERSION "22.1.8")
set(LLVM_PATCH_SCRIPT "${CMAKE_CURRENT_SOURCE_DIR}/scripts/apply_llvm_patches.sh")
file(GLOB LLVM_PATCH_FILES CONFIGURE_DEPENDS
    "${CMAKE_CURRENT_SOURCE_DIR}/patches/llvm/*.patch"
)
set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS
    ${LLVM_PATCH_SCRIPT}
    ${LLVM_PATCH_FILES}
)

FetchContent_Declare(llvm_project
    URL "https://github.com/llvm/llvm-project/releases/download/llvmorg-${LLVM_VERSION}/llvm-project-${LLVM_VERSION}.src.tar.xz"
    URL_HASH SHA256=922f1817a0df7b1489272d18134ee0087a8b068828f87ac63b9861b1a9965888
    TLS_VERIFY TRUE
    DOWNLOAD_EXTRACT_TIMESTAMP TRUE
)

FetchContent_MakeAvailable(llvm_project)
FetchContent_GetProperties(llvm_project)

if(LLVM_PATCH_FILES)
    execute_process(
        COMMAND bash "${LLVM_PATCH_SCRIPT}" "${llvm_project_SOURCE_DIR}"
        WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
        RESULT_VARIABLE LLVM_PATCH_RESULT
    )
    if(NOT LLVM_PATCH_RESULT EQUAL 0)
        message(FATAL_ERROR "Failed to apply LLVM patches")
    endif()
endif()

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

add_custom_target(clang-format-wasm)

if(CLANG_FORMAT_BUILD_ESM)
    add_executable(clang-format-esm src/lib.cc src/binding.cc)
    add_dependencies(clang-format-wasm clang-format-esm)
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
        "-s ALLOW_MEMORY_GROWTH=1"
        "-s ASSERTIONS=0"
        "-s DYNAMIC_EXECUTION=0"
        "-s ENVIRONMENT=shell"
        "-s FILESYSTEM=0"
        "-s WASM_ASYNC_COMPILATION=0"
    )
endif()

if(CLANG_FORMAT_BUILD_CLI)
    add_executable(clang-format-cli
        "${llvm_project_SOURCE_DIR}/clang/tools/clang-format/ClangFormat.cpp"
    )
    add_dependencies(clang-format-wasm clang-format-cli)
    set_target_properties(clang-format-cli PROPERTIES SUFFIX ".wasm")
    target_include_directories(clang-format-cli PRIVATE ${LLVM_INCLUDE_DIRS})
    target_compile_features(clang-format-cli PRIVATE cxx_std_17)
    target_compile_options(clang-format-cli PRIVATE -Os)
    target_link_libraries(clang-format-cli PRIVATE
        ${LLVM_LIBRARIES}
        "-fno-rtti"
    )
endif()
