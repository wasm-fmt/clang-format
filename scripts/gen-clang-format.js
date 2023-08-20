#!/usr/bin/env node

import fs from "node:fs";

let [content, template, output] = process.argv.slice(2);

content = fs.readFileSync(content, "utf-8");
template = fs.readFileSync(template, "utf-8");

const result = template.replace(/\/\*\s*MAIN_CODE\s*\*\//, content);

fs.writeFileSync(output, result, { encoding: "utf-8" });
