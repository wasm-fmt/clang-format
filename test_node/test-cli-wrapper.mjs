import assert from "node:assert/strict";
import {createRequire} from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
    createRunConfig,
    translateWindowsArgv,
    translateWindowsFileListContent,
} = require("../extra/clang-format-cli.cjs");

test("Windows absolute file args map to guest POSIX drive paths", () => {
    const result = translateWindowsArgv(["C:\\repo\\src\\a.cc"], {
        cwd: "C:\\repo",
        platform: "win32",
        translateFileLists: false,
    });

    assert.deepEqual(result.argv, ["/__wasi_drive_c/repo/src/a.cc"]);
    assert.equal(result.pwd, "/__wasi_drive_c/repo");
    assert.equal(result.preopens["."], "C:\\repo");
    assert.equal(result.preopens["/__wasi_drive_c"], "C:\\");
});

test("Windows relative file args map through the current drive preopen", () => {
    const result = translateWindowsArgv(
        ["src\\a.cc", "\\rooted\\b.cc", "--", "-literal\\name.cc"],
        {
            cwd: "C:\\repo",
            platform: "win32",
            translateFileLists: false,
        },
    );

    assert.deepEqual(result.argv, [
        "/__wasi_drive_c/repo/src/a.cc",
        "/__wasi_drive_c/rooted/b.cc",
        "--",
        "/__wasi_drive_c/repo/-literal/name.cc",
    ]);
});

test("Windows UNC file args get their own guest preopen", () => {
    const result = translateWindowsArgv(["\\\\server\\share\\dir\\a.cc"], {
        cwd: "C:\\repo",
        platform: "win32",
        translateFileLists: false,
    });

    assert.deepEqual(result.argv, ["/__wasi_unc/server/share/dir/a.cc"]);
    assert.equal(result.preopens["/__wasi_unc/server/share"], "\\\\server\\share\\");
});

test("Windows style, assume-filename, and files options translate path values", () => {
    const result = translateWindowsArgv(
        [
            "--style=file:C:\\repo\\.clang-format",
            "--assume-filename",
            "C:\\repo\\src\\stdin.cc",
            "--files=C:\\repo\\files.txt",
        ],
        {
            cwd: "C:\\repo",
            platform: "win32",
            translateFileLists: false,
        },
    );

    assert.deepEqual(result.argv, [
        "--style=file:/__wasi_drive_c/repo/.clang-format",
        "--assume-filename",
        "/__wasi_drive_c/repo/src/stdin.cc",
        "--files=/__wasi_drive_c/repo/files.txt",
    ]);
});

test("Windows file list content is converted to guest paths", () => {
    const result = translateWindowsArgv([], {
        cwd: "C:\\repo",
        platform: "win32",
        translateFileLists: false,
    });

    assert.equal(
        translateWindowsFileListContent("C:\\repo\\a.cc\nrelative\\b.cc\n\n", {
            hostCwd: "C:\\repo",
            preopens: result.preopens,
        }),
        "/__wasi_drive_c/repo/a.cc\n/__wasi_drive_c/repo/relative/b.cc\n\n",
    );
});

test("POSIX run config is a thin WASI startup", () => {
    const argv = [
        "--style=file:../.clang-format",
        "src/a.cc",
        "--files=files.txt",
        "@args.txt",
    ];
    const result = createRunConfig(
        argv,
        {
            cwd: "/repo/sub",
            platform: "linux",
        },
    );

    assert.deepEqual(result.argv, argv);
    assert.deepEqual(result.cleanupPaths, []);
    assert.deepEqual(result.preopens, { "/": "/" });
    assert.equal(result.pwd, "/repo/sub");
});
