#!/usr/bin/env node --test
import assert from "node:assert/strict";
import { glob, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { format } from "../pkg/clang-format-node.js";

const test_root = fileURLToPath(import.meta.resolve("../test_data"));

for await (const case_name of glob("**/*.{c,cc,java,cs,js,ts,m,mm,proto}", { cwd: test_root })) {
	if (case_name.startsWith(".")) {
		test.skip(case_name, () => {});
		continue;
	}

	const full_path = path.join(test_root, case_name);
	const snap_path = full_path + ".snap";

	const [input, expected] = await Promise.all([readFile(full_path, "utf-8"), readFile(snap_path, "utf-8")]);

	test(case_name, () => {
		const actual = format(input, full_path);
		assert.equal(actual, expected);
	});
}
