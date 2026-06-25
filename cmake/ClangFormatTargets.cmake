include_guard(GLOBAL)

add_custom_target(clang-format-wasm)

if(CLANG_FORMAT_BUILD_ESM)
    add_executable(clang-format-esm src/lib.cc src/binding.cc)
    add_dependencies(clang-format-wasm clang-format-esm)
    target_include_directories(clang-format-esm PRIVATE ${CLANG_FORMAT_LLVM_INCLUDE_DIRS})
    target_compile_features(clang-format-esm PRIVATE cxx_std_17)
    target_compile_options(clang-format-esm PRIVATE
        -Os
        -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=0
    )

    target_link_libraries(clang-format-esm PRIVATE
        ${CLANG_FORMAT_LLVM_LIBRARIES}
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
        src/wasi-cwd.c
    )
    add_dependencies(clang-format-wasm clang-format-cli)
    set_target_properties(clang-format-cli PROPERTIES SUFFIX ".wasm")
    target_include_directories(clang-format-cli PRIVATE ${CLANG_FORMAT_LLVM_INCLUDE_DIRS})
    target_compile_features(clang-format-cli PRIVATE cxx_std_17)
    target_compile_options(clang-format-cli PRIVATE -Os)
    target_link_libraries(clang-format-cli PRIVATE
        ${CLANG_FORMAT_LLVM_LIBRARIES}
        "-fno-rtti"
    )
endif()
