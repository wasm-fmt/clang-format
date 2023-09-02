import { expect, test } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import init, { format } from "../npm/clang-format.js";

await init();

async function* walk(dir: string): AsyncGenerator<string> {
    for await (const d of await fs.readdir(dir)) {
        const entry = path.join(dir, d);
        const stat = await fs.stat(entry);

        if (stat.isDirectory()) {
            yield* walk(entry);
        }

        if (stat.isFile()) {
            yield entry;
        }
    }
}

const test_root = Bun.fileURLToPath(new URL("../test_data", import.meta.url));

for await (const input_path of walk(test_root)) {
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

    const test_name = path.relative(test_root, input_path);
    const [input, expected] = await Promise.all([
        Bun.file(input_path).text(),
        Bun.file(input_path + ".snap").text(),
    ]);

    test(test_name, () => {
        const actual = format(input, input_path);
        expect(actual).toBe(expected);
    });
}
