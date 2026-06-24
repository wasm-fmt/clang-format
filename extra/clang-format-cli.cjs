#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const DRIVE_ROOT_PREFIX = "/__wasi_drive_";
const UNC_ROOT_PREFIX = "/__wasi_unc";

function isWindowsPlatform(platform) { return platform === "win32"; }

function guestComponent(value) { return value.replace(/[^A-Za-z0-9._-]/g, "_") || "_"; }

function guestJoin(root, rest) {
    const normalizedRest = rest.replace(/\\/g, "/").replace(/^\/+/, "");
    return normalizedRest ? `${root}/${normalizedRest}` : root;
}

function driveGuestRoot(drive) { return `${DRIVE_ROOT_PREFIX}${drive.toLowerCase()}`; }

function driveHostRoot(drive) { return `${drive.toUpperCase()}:\\`; }

function currentDrive(cwd) {
    const match = /^([A-Za-z]):/.exec(cwd);
    return match ? match[1] : "C";
}

function addDrivePreopen(state, drive) {
    const guestRoot = driveGuestRoot(drive);
    state.preopens[guestRoot] = driveHostRoot(drive);
    return guestRoot;
}

function addUncPreopen(state, server, share) {
    const guestRoot = `${UNC_ROOT_PREFIX}/${guestComponent(server)}/${guestComponent(share)}`;
    state.preopens[guestRoot] = `\\\\${server}\\${share}\\`;
    return guestRoot;
}

function createTranslateState(options = {}) {
    const platform = options.platform || process.platform;
    const isWindows = isWindowsPlatform(platform);
    const hostCwd = options.cwd || process.cwd();
    const state = {
        cleanupPaths: [],
        hostCwd,
        isWindows,
        platform,
        preopens: {},
        pwd: hostCwd,
        translateFileLists: options.translateFileLists !== false,
    };

    if (isWindows) {
        state.hostCwd = path.win32.resolve(hostCwd);
        state.preopens["."] = state.hostCwd;
        addDrivePreopen(state, currentDrive(state.hostCwd));
        state.pwd = toGuestPath(state.hostCwd, state);
    } else {
        state.preopens["."] = hostCwd;
        state.preopens["/"] = "/";
    }

    return state;
}

function toGuestPath(value, state) {
    if (value === "" || value === "-") {
        return value;
    }

    if (!state.isWindows) {
        return path.posix.isAbsolute(value) ? value : path.posix.resolve(state.hostCwd, value);
    }

    const uncMatch = /^[\\/]{2}([^\\/]+)[\\/]+([^\\/]+)([\\/]?.*)$/.exec(value);
    if (uncMatch) {
        const guestRoot = addUncPreopen(state, uncMatch[1], uncMatch[2]);
        return guestJoin(guestRoot, uncMatch[3] || "");
    }

    const driveMatch = /^([A-Za-z]):[\\/]*(.*)$/.exec(value);
    if (driveMatch && /^[A-Za-z]:[\\/]/.test(value)) {
        const guestRoot = addDrivePreopen(state, driveMatch[1]);
        return guestJoin(guestRoot, driveMatch[2]);
    }

    if (/^[\\/]/.test(value)) {
        const guestRoot = addDrivePreopen(state, currentDrive(state.hostCwd));
        return guestJoin(guestRoot, value);
    }

    return toGuestPath(path.win32.resolve(state.hostCwd, value), state);
}

function toHostPath(value, state) {
    if (state.isWindows) {
        if (/^[\\/]{2}[^\\/]+[\\/]+[^\\/]+/.test(value)) {
            return value;
        }
        if (/^[A-Za-z]:[\\/]/.test(value)) {
            return value;
        }
        if (/^[\\/]/.test(value)) {
            return `${currentDrive(state.hostCwd)}:${value}`;
        }
        return path.win32.resolve(state.hostCwd, value);
    }

    return path.posix.isAbsolute(value) ? value : path.posix.resolve(state.hostCwd, value);
}

function translateStyleValue(value, state) {
    const filePrefix = "file:";
    if (value.startsWith(filePrefix) && value.length > filePrefix.length) {
        return `${filePrefix}${toGuestPath(value.slice(filePrefix.length), state)}`;
    }
    return value;
}

function translateFileListContent(content, state) {
    return content.split(/\r?\n/).map((line) => (line.trim() ? toGuestPath(line, state) : line)).join("\n");
}

function translateFilesValue(value, state) {
    if (!state.translateFileLists || value === "" || value === "-") {
        return toGuestPath(value, state);
    }

    const hostPath = toHostPath(value, state);
    try {
        const content = fs.readFileSync(hostPath, "utf8");
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "clang-format-wasi-"));
        const tempFile = path.join(tempDir, "files.txt");
        fs.writeFileSync(tempFile, translateFileListContent(content, state));
        state.cleanupPaths.push(tempDir);
        return toGuestPath(tempFile, state);
    } catch {
        return toGuestPath(value, state);
    }
}

function optionValue(arg, names) {
    for (const name of names) {
        if (arg === name) {
            return { kind: "separate", name };
        }
        if (arg.startsWith(`${name}=`)) {
            return { kind: "joined", name, value: arg.slice(name.length + 1) };
        }
    }
    return null;
}

function translateArgv(argv, options = {}) {
    const state = createTranslateState(options);
    const translated = [];
    let positionalOnly = false;

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];

        if (positionalOnly) {
            translated.push(toGuestPath(arg, state));
            continue;
        }

        if (arg === "--") {
            positionalOnly = true;
            translated.push(arg);
            continue;
        }

        const style = optionValue(arg, ["--style", "-style"]);
        if (style?.kind === "joined") {
            translated.push(`${style.name}=${translateStyleValue(style.value, state)}`);
            continue;
        }
        if (style?.kind === "separate" && i + 1 < argv.length) {
            translated.push(arg, translateStyleValue(argv[++i], state));
            continue;
        }

        const assumeFilename = optionValue(arg, [
            "--assume-filename",
            "-assume-filename",
        ]);
        if (assumeFilename?.kind === "joined") {
            translated.push(
                `${assumeFilename.name}=${toGuestPath(assumeFilename.value, state)}`,
            );
            continue;
        }
        if (assumeFilename?.kind === "separate" && i + 1 < argv.length) {
            translated.push(arg, toGuestPath(argv[++i], state));
            continue;
        }

        const files = optionValue(arg, ["--files", "-files"]);
        if (files?.kind === "joined") {
            translated.push(`${files.name}=${translateFilesValue(files.value, state)}`);
            continue;
        }
        if (files?.kind === "separate" && i + 1 < argv.length) {
            translated.push(arg, translateFilesValue(argv[++i], state));
            continue;
        }

        if (arg.startsWith("@") && arg.length > 1) {
            translated.push(`@${toGuestPath(arg.slice(1), state)}`);
            continue;
        }

        if (arg.startsWith("-")) {
            translated.push(arg);
            continue;
        }

        translated.push(toGuestPath(arg, state));
    }

    return {
        argv: translated,
        cleanupPaths: state.cleanupPaths,
        preopens: state.preopens,
        pwd: state.pwd,
    };
}

function createWasi(args, env, preopens) {
    const emitWarning = process.emitWarning;
    process.emitWarning = function(warning, ...rest) {
        const message = typeof warning === "string" ? warning : warning?.message;
        const type = typeof rest[0] === "string" ? rest[0] : warning?.name;
        if (type === "ExperimentalWarning" && message?.includes("WASI is an experimental feature")) {
            return;
        }
        return emitWarning.call(this, warning, ...rest);
    };

    try {
        const { WASI } = require("node:wasi");
        return new WASI({
            args,
            env,
            preopens,
            returnOnExit: true,
            version: "preview1",
        });
    } finally {
        process.emitWarning = emitWarning;
    }
}

function run(argv = process.argv.slice(2)) {
    const translated = translateArgv(argv, {
        cwd: process.cwd(),
        platform: process.platform,
        translateFileLists: true,
    });
    const wasi = createWasi(
        ["clang-format", ...translated.argv],
        {...process.env, PWD: translated.pwd },
        translated.preopens,
    );

    try {
        const wasmPath = path.join(__dirname, "clang-format-cli.wasm");
        const wasm = fs.readFileSync(wasmPath);
        const module = new WebAssembly.Module(wasm);
        const instance = new WebAssembly.Instance(module, wasi.getImportObject());
        return wasi.start(instance) || 0;
    } finally {
        for (const cleanupPath of translated.cleanupPaths) {
            fs.rmSync(cleanupPath, { force: true, recursive: true });
        }
    }
}

if (require.main === module) {
    try {
        process.exitCode = run();
    } catch (error) {
        console.error(error?.stack || error);
        process.exitCode = 1;
    }
} else {
    module.exports = {
        createTranslateState,
        toGuestPath,
        translateArgv,
        translateFileListContent,
    };
}
