# CLI WebAssembly build configuration
add_executable(clang-format-cli
    ${llvm_project_SOURCE_DIR}/clang/tools/clang-format/ClangFormat.cpp
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
    "-s DYNAMIC_EXECUTION=0"
    "-s ENVIRONMENT=node"
    "-s NODERAWFS=1"
    "-s ALLOW_MEMORY_GROWTH=1"
)
