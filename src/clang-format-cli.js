#! /usr/bin/env node
import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import init, {
    format,
    format_byte_range,
    format_line_range,
    set_fallback_style,
    version,
} from "./clang-format-node.js";

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

let fileNames = positionals;
if (values.files) {
    const ExternalFileOfFiles = await readFile(values.files, {
        encoding: "utf-8",
    });
    fileNames = fileNames.concat(
        ExternalFileOfFiles.split("\n").filter(Boolean),
    );
}

if (fileNames.length === 0) {
    fileNames = ["-"];
}

if (values["fallback-style"]) {
    set_fallback_style(values["fallback-style"]);
}

if (
    fileNames.length !== 1 &&
    (!empty(values.offset) || !empty(values.length) || !empty(values.lines))
) {
    console.error(
        "error: -offset, -length and -lines can only be used for single file",
    );
    process.exit(1);
}

if (!empty(values.lines) && (!empty(values.offset) || !empty(values.length))) {
    console.error("error: cannot use -lines with -offset/-length");
    process.exit(1);
}

if (!empty(values.lines)) {
    const [file] = fileNames;
    const content = await get_file_or_stdin(file);

    const range = [];
    for (const line of values.lines) {
        const [form_line_text, to_line_text] = line.split(":");
        const [from_line, to_line] = [
            Number.parseInt(form_line_text, 10),
            Number.parseInt(to_line_text, 10),
        ];
        if (!Number.isFinite(from_line) || !Number.isFinite(to_line)) {
            console.error("error: invalid <start line>:<end line> pair");
            process.exit(1);
        }
        range.push([from_line, to_line]);
    }

    const formatted = format_line_range(content, range, file, values.style);

    if (values.inplace) {
        if (content !== formatted) {
            await writeFile(file, formatted, { encoding: "utf-8" });
        }
    } else {
        console.log(formatted);
    }
    process.exit(0);
}

if (values.offset.length !== values.length.length) {
    console.error("error: number of -offset and -length arguments must match");
    process.exit(1);
}

if (!empty(values.offset)) {
    const [file] = fileNames;
    const content = await get_file_or_stdin(file);

    const range = [];
    for (let i = 0; i < values.offset.length; ++i) {
        const offset = Number.parseInt(values.offset[i], 10);
        const length = Number.parseInt(values.length[i], 10);
        if (!Number.isFinite(offset) || !Number.isFinite(length)) {
            console.error("error: invalid <offset>:<length> pair");
            process.exit(1);
        }
        range.push([offset, length]);
    }

    const formatted = format_byte_range(content, range, file, values.style);

    if (values.inplace) {
        if (content !== formatted) {
            await writeFile(file, formatted, { encoding: "utf-8" });
        }
    } else {
        console.log(formatted);
    }

    process.exit(0);
}

for (const file of fileNames) {
    const content = await get_file_or_stdin(file);
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

function empty(array) {
    return array.length === 0;
}

async function get_file_or_stdin(fileName) {
    if (fileName === "-") {
        if (values.inplace) {
            console.error("error: cannot use -i when reading from stdin");
            process.exit(1);
        }
        return readFileSync(0, { encoding: "utf-8" });
    }
    return await readFile(fileName, { encoding: "utf-8" });
}
