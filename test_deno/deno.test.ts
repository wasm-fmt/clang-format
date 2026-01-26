#!/usr/bin/env deno test --allow-read --parallel
import { assertEquals } from "jsr:@std/assert";
import { expandGlob } from "jsr:@std/fs";
import { fromFileUrl, relative } from "jsr:@std/path";

import { format } from "../pkg/clang-format-esm.js";

const test_root = fromFileUrl(import.meta.resolve("../test_data"));

for await (const { path: input_path } of expandGlob("**/*.{c,cc,java,cs,js,ts,m,mm,proto}", {
	root: test_root,
})) {
	const case_name = relative(test_root, input_path);
	if (case_name.startsWith(".")) {
		Deno.test.ignore(case_name, () => {});
		continue;
	}

	const snap_path = input_path + ".snap";
	const [input, expected] = await Promise.all([Deno.readTextFile(input_path), Deno.readTextFile(snap_path)]);

	Deno.test(case_name, () => {
		const actual = format(input, input_path) as unknown as string;
		assertEquals(actual, expected);
	});
}
