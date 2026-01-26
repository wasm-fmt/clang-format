#!/usr/bin/env node
import fs from "fs";

const [input_path, output_path] = process.argv.slice(2);

let input = fs.readFileSync(input_path, "utf8");

input = input.replace(
	`var Module=typeof Module!="undefined"?Module:{};var ENVIRONMENT_IS_SHELL=true;`,
	`export function createModule(Module) {
    const ENVIRONMENT_IS_SHELL=false;
    readBinary = () => Module.wasm;
`,
);
input = input.replace(
	";module=new WebAssembly.Module(binary);",
	`;module = binary;if(!(module instanceof WebAssembly.Module)) module=new WebAssembly.Module(module);`,
);
input += `
    return Module;
}`;

fs.writeFileSync(output_path, input, "utf8");
