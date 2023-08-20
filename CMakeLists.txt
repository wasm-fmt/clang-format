cmake_minimum_required(VERSION 3.20.0)

project("clang-format-wasm")

if(NOT DEFINED ENV{LLVM_HOME})
    message(FATAL_ERROR "$LLVM_HOME is not defined")
else()
    message(STATUS "$LLVM_HOME found: $ENV{LLVM_HOME}")
    set(LLVM_HOME $ENV{LLVM_HOME} CACHE PATH "Root of LLVM installation")
    set(LLVM_INC ${LLVM_HOME}/include)
    set(LLVM_LIB ${LLVM_HOME}/lib)
    set(LLVM_BIN ${LLVM_HOME}/bin)
    set(LLVM_CMAKE ${LLVM_LIB}/cmake/llvm)

    list(APPEND CMAKE_PREFIX_PATH "${LLVM_LIB}/cmake/llvm/")
    list(APPEND CMAKE_PREFIX_PATH "${LLVM_LIB}/cmake/clang/")

    find_package(LLVM REQUIRED CONFIG)
    find_package(Clang REQUIRED CONFIG)

    set(CMAKE_CXX_STANDARD 17 CACHE STRING "")

    add_definitions(-D__STDC_LIMIT_MACROS -D__STDC_CONSTANT_MACROS)

    include_directories(SYSTEM "${LLVM_INCLUDE_DIRS};${CLANG_INCLUDE_DIRS}")

    link_directories(${LLVM_LIBRARY_DIRS})

    add_executable(clang-format-wasm src/lib.cc)
    set_target_properties(clang-format-wasm PROPERTIES COMPILE_FLAGS "-fno-rtti")

    add_definitions(${LLVM_CXXFLAGS})
    target_compile_options(clang-format-wasm PUBLIC "-fPIC")

    target_link_libraries(clang-format-wasm
        clangBasic
        clangFormat
        clangRewrite
        clangToolingCore
    )

    target_link_libraries(clang-format-wasm
        "$<$<PLATFORM_ID:Darwin>:-undefined dynamic_lookup>")
endif()