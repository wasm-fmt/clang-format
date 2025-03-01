# ESM WebAssembly build configuration
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
