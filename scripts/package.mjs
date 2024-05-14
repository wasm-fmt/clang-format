#!/usr/bin/env node
import process from "node:process";
import path from "node:path";
import fs from "node:fs";

const pkg_path = path.resolve(process.cwd(), process.argv[2]);
const pkg_text = fs.readFileSync(pkg_path, { encoding: "utf-8" });
const pkg_json = JSON.parse(pkg_text);

// JSR

const jsr_path = path.resolve(pkg_path, "..", "pkg", "jsr.jsonc");
pkg_json.name = "@fmt/clang-fmt";
pkg_json.exports = "./clang-format.js";
pkg_json.publish = {
    include: [
        "clang-format.js",
        "clang-format.d.ts",
        "clang-format.wasm",
        "jsr.jsonc",
        "LICENSE",
        "README.md",
    ],
};
fs.writeFileSync(jsr_path, JSON.stringify(pkg_json, null, 4));
