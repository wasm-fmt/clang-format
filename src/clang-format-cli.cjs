if (process.platform === "win32") {
    require("./win32/clang-format-cli.cjs");
} else {
    require("./posix/clang-format-cli.cjs");
}
