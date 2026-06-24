import assert from "node:assert/strict";
import {createRequire} from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { translateArgv, translateFileListContent } = require(
    "../extra/clang-format-cli.cjs",
);

test("Windows absolute file args map to guest POSIX drive paths", () => {
    const result = translateArgv(["C:\\repo\\src\\a.cc"], {
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
    const result = translateArgv(["src\\a.cc", "--", "-literal\\name.cc"], {
        cwd: "C:\\repo",
        platform: "win32",
        translateFileLists: false,
    });

    assert.deepEqual(result.argv, [
        "/__wasi_drive_c/repo/src/a.cc",
        "--",
        "/__wasi_drive_c/repo/-literal/name.cc",
    ]);
});

test("Windows style, assume-filename, and files options translate path values", () => {
    const result = translateArgv(
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
    const result = translateArgv([], {
        cwd: "C:\\repo",
        platform: "win32",
        translateFileLists: false,
    });

    assert.equal(
        translateFileListContent("C:\\repo\\a.cc\nrelative\\b.cc\n\n", {
            isWindows: true,
            hostCwd: "C:\\repo",
            preopens: result.preopens,
        }),
        "/__wasi_drive_c/repo/a.cc\n/__wasi_drive_c/repo/relative/b.cc\n\n",
    );
});

test("POSIX relative paths become absolute guest paths", () => {
    const result = translateArgv(
        ["--style=file:.clang-format", "src/a.cc", "--files=files.txt"],
        {
            cwd: "/repo",
            platform: "linux",
            translateFileLists: false,
        },
    );

    assert.deepEqual(result.argv, [
        "--style=file:/repo/.clang-format",
        "/repo/src/a.cc",
        "--files=/repo/files.txt",
    ]);
    assert.equal(result.preopens["."], "/repo");
    assert.equal(result.preopens["/"], "/");
    assert.equal(result.pwd, "/repo");
});
