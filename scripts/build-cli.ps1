# Set strict error handling
$ErrorActionPreference = "Stop"

# Navigate to project root directory
Set-Location $PSScriptRoot\..
$projectRoot = Get-Location

# Create necessary directories
New-Item -Path "pkg\win32", "build" -ItemType Directory -Force

# Navigate to build directory
Set-Location build

# Set environment variables
$env:CC = (Get-Command clang -ErrorAction SilentlyContinue).Path
$env:CXX = (Get-Command clang++ -ErrorAction SilentlyContinue).Path
$env:BUILD_TARGET = "cli"

# Run cmake and ninja
emcmake cmake -G Ninja ..
ninja clang-format-wasm

# Return to project root
Set-Location $projectRoot

# Add shebang and create output file
"#!/usr/bin/env node" | Set-Content -Path "$projectRoot\pkg\win32\clang-format-cli.cjs" -NoNewline
Get-Content -Path "$projectRoot\build\clang-format-cli.js" | Add-Content -Path "$projectRoot\pkg\win32\clang-format-cli.cjs"

# Copy wasm file
Copy-Item -Path "$projectRoot\build\clang-format-cli.wasm" -Destination "$projectRoot\pkg\win32\"

# Copy git-clang-format and clang-format-diff.py
Copy-Item -Path "$projectRoot\build\_deps\llvm_project-src\clang\tools\clang-format\git-clang-format" -Destination "$projectRoot\pkg\"
Copy-Item -Path "$projectRoot\build\_deps\llvm_project-src\clang\tools\clang-format\clang-format-diff.py" -Destination "$projectRoot\pkg\"
