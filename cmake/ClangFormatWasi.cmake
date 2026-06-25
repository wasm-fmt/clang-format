include_guard(GLOBAL)

if(NOT CMAKE_SYSTEM_NAME STREQUAL "WASI")
    return()
endif()

set(CLANG_FORMAT_WASI_EMULATED_DEFINITIONS
    _WASI_EMULATED_GETPID
    _WASI_EMULATED_MMAN
    _WASI_EMULATED_PROCESS_CLOCKS
    _WASI_EMULATED_SIGNAL
)

set(CLANG_FORMAT_WASI_EMULATED_LIBRARIES
    wasi-emulated-getpid
    wasi-emulated-mman
    wasi-emulated-process-clocks
    wasi-emulated-signal
)

add_compile_options($<$<COMPILE_LANGUAGE:CXX>:-fno-exceptions>)
add_compile_definitions(${CLANG_FORMAT_WASI_EMULATED_DEFINITIONS})

# LLVM's configure checks need these definitions and libraries before the
# fetched LLVM project is added.
foreach(definition IN LISTS CLANG_FORMAT_WASI_EMULATED_DEFINITIONS)
    list(APPEND CMAKE_REQUIRED_DEFINITIONS "-D${definition}")
endforeach()

list(APPEND CMAKE_REQUIRED_LIBRARIES ${CLANG_FORMAT_WASI_EMULATED_LIBRARIES})
link_libraries(${CLANG_FORMAT_WASI_EMULATED_LIBRARIES})
