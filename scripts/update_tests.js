#!/usr/bin/env node
import { glob, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { format } from "../pkg/clang-format-node.js";

const test_root = fileURLToPath(import.meta.resolve("../test_data"));

for await (const case_name of glob("**/*.{c,cc,java,cs,js,ts,m,mm,proto}", { cwd: test_root })) {
	if (case_name.startsWith(".")) {
		continue;
	}

	const full_path = path.join(test_root, case_name);
	const snap_path = full_path + ".snap";

	const input = await readFile(full_path, "utf-8");
	const formatted = format(input, full_path);

	await writeFile(snap_path, formatted, "utf-8");
	console.log(`Updated: ${snap_path}`);
}

console.log("All snapshot files have been updated.");
