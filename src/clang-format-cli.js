#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
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
            default: [],
        },
        lines: {
            type: "string",
            multiple: true,
            default: [],
        },
        offset: {
            type: "string",
            multiple: true,
            default: [],
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
        verbose: {
            type: "boolean",
        },
    },
});

for (const token of tokens) {
    switch (token.name) {
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
    const external_file_of_files = await readFile(values.files, {
        encoding: "utf-8",
    });
    fileNames = fileNames.concat(
        external_file_of_files.split("\n").filter(Boolean),
    );
}

if (fileNames.length === 0) {
    fileNames = ["-"];
}

if (values["fallback-style"]) {
    set_fallback_style(values["fallback-style"]);
}

let style = values.style || "file";

if (style.startsWith("file:")) {
    const file = values.style.slice(5);
    style = await readFile(file, { encoding: "utf-8" });
}

function get_style(filename) {
    if (style === "file") {
        return load_style(filename);
    }

    return style;
}

const loaded_style = ["file"];
const style_map = new Map();

function load_style(filename) {
    if (filename === "-") {
        filename = ".";
    }
    let parent_path = path.resolve(filename, "..");
    let config_path = path.join(parent_path, ".clang-format");

    if (style_map.has(config_path)) {
        const index = style_map.get(config_path);
        return loaded_style[index];
    }

    const stack = [config_path];
    while (true) {
        if (style_map.has(config_path)) {
            const index = style_map.get(config_path);
            stack.forEach((s) => {
                style_map.set(s, index);
            });
            return loaded_style[index];
        }

        stack.push(config_path);
        if (existsSync(config_path)) {
            const style = readFileSync(config_path, { encoding: "utf-8" });
            const index = loaded_style.push(style) - 1;
            stack.forEach((s) => {
                style_map.set(s, index);
            });
            return style;
        }

        let new_parent_path = path.resolve(parent_path, "..");
        if (new_parent_path === parent_path) {
            stack.forEach((s) => {
                style_map.set(s, 0);
            });
            return loaded_style[0];
        }
        parent_path = new_parent_path;
        config_path = path.join(parent_path, ".clang-format");
    }
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

    const formatted = format_line_range(content, range, file, get_style(file));

    if (values.inplace) {
        if (content !== formatted) {
            await writeFile(file, formatted, { encoding: "utf-8" });
        }
    } else {
        console.log(formatted);
    }
    process.exit(0);
}

format_range: {
    const range = [];

    fill_range: {
        if (values.offset.length === 1 && values.length.length === 0) {
            const offset = expect_number(values.offset[0], "offset");
            range.push([offset]);
            break fill_range;
        }

        if (values.offset.length !== values.length.length) {
            console.error(
                "error: number of -offset and -length arguments must match",
            );
            process.exit(1);
        }

        for (let i = 0; i < values.offset.length; ++i) {
            const offset = expect_number(values.offset[i], "offset");
            const length = expect_number(values.length[i], "length");
            range.push([offset, length]);
        }

        function expect_number(value, name) {
            const num = Number.parseInt(value, 10);
            if (!Number.isFinite(num)) {
                console.error(`error: invalid ${name}`);
                process.exit(1);
            }
            return num;
        }
    }

    if (empty(range)) {
        break format_range;
    }

    const [file] = fileNames;
    const content = await get_file_or_stdin(file);

    const formatted = format_byte_range(content, range, file, get_style(file));

    if (values.inplace) {
        if (content !== formatted) {
            await writeFile(file, formatted, { encoding: "utf-8" });
        }
    } else {
        console.log(formatted);
    }

    process.exit(0);
}

for (const [file_no, file] of fileNames.entries()) {
    if (values.verbose) {
        console.error(
            `Formatting [${file_no + 1}/${fileNames.length}] ${file}`,
        );
    }
    const content = await get_file_or_stdin(file);
    const formatted = format(content, file, get_style(file));
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
