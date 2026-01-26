#!/usr/bin/env bun test
import { Glob } from "bun";
import { expect, test } from "bun:test";

import init, { format } from "../pkg/clang-format-web";

await init();

const test_root = Bun.fileURLToPath(import.meta.resolve("../test_data"));

for await (const case_name of new Glob("**/*.{c,cc,java,cs,js,ts,m,mm,proto}").scan({ cwd: test_root, dot: true })) {
	if (case_name.startsWith(".")) {
		test.skip(case_name, () => {});
		continue;
	}

	const full_path = `${test_root}/${case_name}`;
	const snap_path = full_path + ".snap";

	const [input, expected] = await Promise.all([Bun.file(full_path).text(), Bun.file(snap_path).text()]);

	test(case_name, () => {
		const actual = format(input, full_path);
		expect(actual).toBe(expected);
	});
}
