#! /usr/bin/env node
import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import init, { format, version } from "./clang-format-node.js";

await init();

const help = `OVERVIEW: A tool to format C/C++/Java/JavaScript/JSON/Objective-C/Protobuf/C# code.

If no arguments are specified, it formats the code from standard input
and writes the result to the standard output.
If <file>s are given, it reformats the files. If -i is specified
together with <file>s, the files are edited in-place. Otherwise, the
result is written to the standard output.

USAGE: clang-format [options] [@<file>] [<file> ...]`;

const { values, positionals, tokens } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    tokens: true,
    options: {
        "assume-filename": {
            type: "string",
        },
        "fallback-style": {
            type: "string",
        },
        files: {
            type: "string",
        },
        inplace: {
            type: "boolean",
            short: "i",
        },
        length: {
            type: "string",
            multiple: true,
        },
        lines: {
            type: "string",
            multiple: true,
        },
        offset: {
            type: "string",
            multiple: true,
        },
        style: {
            type: "string",
        },
        help: {
            type: "boolean",
        },
        version: {
            type: "boolean",
        },
    },
});

for (const token of tokens) {
    switch (token.type) {
        case "help": {
            console.log(help);
            process.exit(0);
        }
        case "version": {
            console.log(version());
            process.exit(0);
        }
    }
}

let files = positionals;
if (values.files) {
    const ExternalFileOfFiles = await readFile(values.files, {
        encoding: "utf-8",
    });
    files = files.concat(ExternalFileOfFiles.split("\n").filter(Boolean));
}

if (files.length === 0) {
    files = ["-"];
}

// TODO: handle lines, offset and length
for (const file of files) {
    if (file === "-" && values.inplace) {
        console.error("error: cannot use -i when reading from stdin.");
        process.exit(1);
    }

    const content = await getFileOrSTDIN(file);
    // TODO: search .clang-format on disk if values.style is not set
    const formatted = format(content, file, values.style);
    if (values.inplace) {
        if (content !== formatted) {
            await writeFile(file, formatted, { encoding: "utf-8" });
        }
    } else {
        console.log(formatted);
    }
}

async function getFileOrSTDIN(fileName) {
    if (fileName === "-") {
        return readFileSync(0, { encoding: "utf-8" });
    }
    return await readFile(fileName, { encoding: "utf-8" });
}
