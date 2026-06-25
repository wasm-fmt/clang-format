cmake_minimum_required(VERSION 3.24.0)

include("${CMAKE_CURRENT_LIST_DIR}/LLVMSource.cmake")

clang_format_populate_llvm_source(llvm_project_SOURCE_DIR)
message(STATUS "Prepared LLVM source: ${llvm_project_SOURCE_DIR}")
