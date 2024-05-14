import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import init, { format } from "../pkg/clang-format-node.js";

await init();

const test_root = fileURLToPath(new URL("../test_data", import.meta.url));

for await (const dirent of await fs.opendir(test_root, { recursive: true })) {
    if (!dirent.isFile()) {
        continue;
    }

    const input_path = path.join(dirent.path, dirent.name);
    const ext = path.extname(input_path);

    switch (ext) {
        case ".c":
        case ".cc":
        case ".java":
        case ".cs":
        case ".js":
        case ".ts":
        case ".m":
        case ".mm":
        case ".proto":
            break;

        default:
            continue;
    }

    const expect_path = input_path + ".snap";

    const [input, expected] = await Promise.all([
        fs.readFile(input_path, "utf-8"),
        fs.readFile(expect_path, "utf-8"),
    ]);

    const test_name = path.relative(test_root, input_path);

    test(test_name, () => {
        const actual = format(input, dirent.name);
        assert.equal(actual, expected);
    });
}
