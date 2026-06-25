include_guard(GLOBAL)

include(FetchContent)

set(CLANG_FORMAT_LLVM_VERSION "22.1.8")
set(CLANG_FORMAT_LLVM_PROJECT_SHA256 "922f1817a0df7b1489272d18134ee0087a8b068828f87ac63b9861b1a9965888")
set(CLANG_FORMAT_LLVM_SOURCE_DIR "" CACHE PATH "Existing llvm-project source directory")

function(clang_format_validate_llvm_source source_dir)
    if(NOT IS_DIRECTORY "${source_dir}/llvm" OR NOT IS_DIRECTORY "${source_dir}/clang")
        message(FATAL_ERROR "not an llvm-project source directory: ${source_dir}")
    endif()
endfunction()

function(clang_format_apply_llvm_patches source_dir)
    get_filename_component(repo_root "${CMAKE_CURRENT_FUNCTION_LIST_DIR}/.." ABSOLUTE)
    set(patch_script "${repo_root}/scripts/apply_llvm_patches.sh")

    if(CMAKE_SCRIPT_MODE_FILE)
        file(GLOB patch_files "${repo_root}/patches/llvm/*.patch")
    else()
        file(GLOB patch_files CONFIGURE_DEPENDS "${repo_root}/patches/llvm/*.patch")
        set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS
            "${patch_script}"
            ${patch_files}
        )
    endif()

    if(patch_files)
        execute_process(
            COMMAND bash "${patch_script}" "${source_dir}"
            WORKING_DIRECTORY "${repo_root}"
            RESULT_VARIABLE patch_result
        )
        if(NOT patch_result EQUAL 0)
            message(FATAL_ERROR "Failed to apply LLVM patches")
        endif()
    endif()
endfunction()

function(clang_format_fetch_llvm_source out_var)
    if(CLANG_FORMAT_LLVM_SOURCE_DIR)
        get_filename_component(source_dir "${CLANG_FORMAT_LLVM_SOURCE_DIR}" ABSOLUTE)
    else()
        FetchContent_Declare(llvm_project
            URL "https://github.com/llvm/llvm-project/releases/download/llvmorg-${CLANG_FORMAT_LLVM_VERSION}/llvm-project-${CLANG_FORMAT_LLVM_VERSION}.src.tar.xz"
            URL_HASH SHA256=${CLANG_FORMAT_LLVM_PROJECT_SHA256}
            TLS_VERIFY TRUE
            DOWNLOAD_EXTRACT_TIMESTAMP TRUE
        )

        FetchContent_MakeAvailable(llvm_project)
        FetchContent_GetProperties(llvm_project)
        set(source_dir "${llvm_project_SOURCE_DIR}")
    endif()

    clang_format_validate_llvm_source("${source_dir}")
    clang_format_apply_llvm_patches("${source_dir}")
    set(${out_var} "${source_dir}" PARENT_SCOPE)
endfunction()

function(clang_format_populate_llvm_source out_var)
    if(NOT CLANG_FORMAT_LLVM_SOURCE_DIR)
        message(FATAL_ERROR "CLANG_FORMAT_LLVM_SOURCE_DIR is required")
    endif()

    get_filename_component(source_dir "${CLANG_FORMAT_LLVM_SOURCE_DIR}" ABSOLUTE)
    if(CLANG_FORMAT_LLVM_BINARY_DIR)
        get_filename_component(binary_dir "${CLANG_FORMAT_LLVM_BINARY_DIR}" ABSOLUTE)
    else()
        set(binary_dir "${source_dir}-build")
    endif()
    if(CLANG_FORMAT_LLVM_SUBBUILD_DIR)
        get_filename_component(subbuild_dir "${CLANG_FORMAT_LLVM_SUBBUILD_DIR}" ABSOLUTE)
    else()
        set(subbuild_dir "${source_dir}-subbuild")
    endif()

    if(NOT IS_DIRECTORY "${source_dir}/llvm" OR NOT IS_DIRECTORY "${source_dir}/clang")
        FetchContent_Populate(llvm_project
            URL "https://github.com/llvm/llvm-project/releases/download/llvmorg-${CLANG_FORMAT_LLVM_VERSION}/llvm-project-${CLANG_FORMAT_LLVM_VERSION}.src.tar.xz"
            URL_HASH SHA256=${CLANG_FORMAT_LLVM_PROJECT_SHA256}
            TLS_VERIFY TRUE
            DOWNLOAD_EXTRACT_TIMESTAMP TRUE
            SUBBUILD_DIR "${subbuild_dir}"
            SOURCE_DIR "${source_dir}"
            BINARY_DIR "${binary_dir}"
        )
    else()
        set(llvm_project_SOURCE_DIR "${source_dir}")
    endif()

    clang_format_validate_llvm_source("${llvm_project_SOURCE_DIR}")
    clang_format_apply_llvm_patches("${llvm_project_SOURCE_DIR}")
    set(${out_var} "${llvm_project_SOURCE_DIR}" PARENT_SCOPE)
endfunction()
