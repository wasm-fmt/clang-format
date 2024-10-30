import { Glob } from "bun";
import { expect, test } from "bun:test";
import { chdir } from "node:process";
import { fileURLToPath } from "node:url";

import init, { format } from "../pkg";

await init();

const test_root = fileURLToPath(import.meta.resolve("../test_data"));
chdir(test_root);

const glob = new Glob("**/*.{c,cc,java,cs,js,ts,m,mm,proto}");

for await (const input_path of glob.scan()) {
    const [input, expected] = await Promise.all([
        Bun.file(input_path).text(),
        Bun.file(input_path + ".snap").text(),
    ]);

    test(input_path, () => {
        const actual = format(input, input_path);
        expect(actual).toBe(expected);
    });
}
