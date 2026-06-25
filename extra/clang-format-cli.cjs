#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const DRIVE_ROOT_PREFIX = "/__wasi_drive_";
const UNC_ROOT_PREFIX = "/__wasi_unc";

function main() {
	try {
		return run();
	} catch (error) {
		console.error(error?.stack || error);
		return 1;
	}
}

function run(argv = process.argv.slice(2), options = {}) {
	const platform = options.platform || process.platform;
	if (isWindowsPlatform(platform)) {
		return runWindows(argv, { ...options, platform });
	}
	return runPosix(argv, { ...options, platform });
}

function createRunConfig(argv, options = {}) {
	const platform = options.platform || process.platform;
	if (isWindowsPlatform(platform)) {
		return createWindowsRunConfig(argv, { ...options, platform });
	}
	return createPosixRunConfig(argv, options);
}

function runPosix(argv, options = {}) {
	return runWasi(createPosixRunConfig(argv, options), options);
}

function createPosixRunConfig(argv, options = {}) {
	return {
		argv,
		cleanupPaths: [],
		preopens: { "/": "/" },
		pwd: options.cwd || process.cwd(),
	};
}

function runWindows(argv, options = {}) {
	return runWasi(createWindowsRunConfig(argv, options), options);
}

function runWasi(config, options = {}) {
	const env = options.env || process.env;
	const wasi = createWasi(
		["clang-format", ...config.argv],
		{ ...env, PWD: config.pwd },
		config.preopens,
	);

	try {
		const wasmPath =
			options.wasmPath || path.join(__dirname, "clang-format-cli.wasm");
		const wasm = fs.readFileSync(wasmPath);
		const module = new WebAssembly.Module(wasm);
		const instance = new WebAssembly.Instance(
			module,
			wasi.getImportObject(),
		);
		return wasi.start(instance) || 0;
	} finally {
		for (const cleanupPath of config.cleanupPaths) {
			fs.rmSync(cleanupPath, { force: true, recursive: true });
		}
	}
}

function createWasi(args, env, preopens) {
	const emitWarning = process.emitWarning;
	process.emitWarning = function (warning, ...rest) {
		const message =
			typeof warning === "string" ? warning : warning?.message;
		const type = typeof rest[0] === "string" ? rest[0] : warning?.name;
		if (
			type === "ExperimentalWarning" &&
			message?.includes("WASI is an experimental feature")
		) {
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

function isWindowsPlatform(platform) {
	return platform === "win32";
}

function createWindowsRunConfig(argv, options = {}) {
	return translateWindowsArgv(argv, options);
}

function createWindowsTranslateState(options = {}) {
	const hostCwd = path.win32.resolve(options.cwd || process.cwd());
	const hostRoot = path.win32.parse(hostCwd).root;
	const state = {
		cleanupPaths: [],
		hostCwd,
		preopens: { ".": hostCwd },
		pwd: hostCwd,
		translateFileLists: options.translateFileLists !== false,
	};

	addWindowsRootPreopen(state, hostRoot);
	state.pwd = toWindowsGuestPath(state.hostCwd, state);
	return state;
}

function translateWindowsArgv(argv, options = {}) {
	const state = createWindowsTranslateState(options);
	const translated = [];
	let positionalOnly = false;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];

		if (positionalOnly) {
			translated.push(toWindowsGuestPath(arg, state));
			continue;
		}

		if (arg === "--") {
			positionalOnly = true;
			translated.push(arg);
			continue;
		}

		const style = optionValue(arg, ["--style", "-style"]);
		if (style?.kind === "joined") {
			translated.push(
				`${style.name}=${translateWindowsStyleValue(style.value, state)}`,
			);
			continue;
		}
		if (style?.kind === "separate" && i + 1 < argv.length) {
			translated.push(arg, translateWindowsStyleValue(argv[++i], state));
			continue;
		}

		const assumeFilename = optionValue(arg, [
			"--assume-filename",
			"-assume-filename",
		]);
		if (assumeFilename?.kind === "joined") {
			translated.push(
				`${assumeFilename.name}=${toWindowsGuestPath(
					assumeFilename.value,
					state,
				)}`,
			);
			continue;
		}
		if (assumeFilename?.kind === "separate" && i + 1 < argv.length) {
			translated.push(arg, toWindowsGuestPath(argv[++i], state));
			continue;
		}

		const files = optionValue(arg, ["--files", "-files"]);
		if (files?.kind === "joined") {
			translated.push(
				`${files.name}=${translateWindowsFilesValue(files.value, state)}`,
			);
			continue;
		}
		if (files?.kind === "separate" && i + 1 < argv.length) {
			translated.push(arg, translateWindowsFilesValue(argv[++i], state));
			continue;
		}

		if (arg.startsWith("@") && arg.length > 1) {
			translated.push(`@${toWindowsGuestPath(arg.slice(1), state)}`);
			continue;
		}

		if (arg.startsWith("-")) {
			translated.push(arg);
			continue;
		}

		translated.push(toWindowsGuestPath(arg, state));
	}

	return {
		argv: translated,
		cleanupPaths: state.cleanupPaths,
		preopens: state.preopens,
		pwd: state.pwd,
	};
}

function translateWindowsStyleValue(value, state) {
	const filePrefix = "file:";
	if (value.startsWith(filePrefix) && value.length > filePrefix.length) {
		return `${filePrefix}${toWindowsGuestPath(
			value.slice(filePrefix.length),
			state,
		)}`;
	}
	return value;
}

function translateWindowsFilesValue(value, state) {
	if (!state.translateFileLists || value === "" || value === "-") {
		return toWindowsGuestPath(value, state);
	}

	const hostPath = toWindowsHostPath(value, state);
	try {
		const content = fs.readFileSync(hostPath, "utf8");
		const tempDir = fs.mkdtempSync(
			path.join(os.tmpdir(), "clang-format-wasi-"),
		);
		const tempFile = path.join(tempDir, "files.txt");
		fs.writeFileSync(
			tempFile,
			translateWindowsFileListContent(content, state),
		);
		state.cleanupPaths.push(tempDir);
		return toWindowsGuestPath(tempFile, state);
	} catch {
		return toWindowsGuestPath(value, state);
	}
}

function translateWindowsFileListContent(content, state) {
	return content
		.split(/\r?\n/)
		.map((line) => (line.trim() ? toWindowsGuestPath(line, state) : line))
		.join("\n");
}

function toWindowsGuestPath(value, state) {
	if (value === "" || value === "-") {
		return value;
	}

	const hostPath = path.win32.resolve(state.hostCwd, value);
	const root = path.win32.parse(hostPath).root;
	const rest = path.win32.relative(root, hostPath);

	return guestJoin(addWindowsRootPreopen(state, root), rest);
}

function toWindowsHostPath(value, state) {
	return path.win32.resolve(state.hostCwd, value);
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

function addWindowsRootPreopen(state, root) {
	const guestRoot = windowsRootGuestPath(root);
	state.preopens[guestRoot] = windowsRootHostPath(root);
	return guestRoot;
}

function windowsRootGuestPath(root) {
	const drive = driveFromRoot(root);
	if (drive) {
		return driveGuestRoot(drive);
	}
	const components = windowsRootComponents(root).map(guestComponent);
	return `${UNC_ROOT_PREFIX}/${components.join("/")}`;
}

function windowsRootHostPath(root) {
	const drive = driveFromRoot(root);
	return drive ? driveHostRoot(drive) : root;
}

function windowsRootComponents(root) {
	return root
		.replace(/[\\/]+$/, "")
		.split(/[\\/]+/)
		.filter(Boolean);
}

function driveFromRoot(root) {
	return /^[A-Za-z]:[\\/]?$/.test(root) ? root[0] : null;
}

function driveGuestRoot(drive) {
	return `${DRIVE_ROOT_PREFIX}${drive.toLowerCase()}`;
}

function driveHostRoot(drive) {
	return `${drive.toUpperCase()}:\\`;
}

function guestJoin(root, rest) {
	const normalizedRest = rest.replace(/\\/g, "/").replace(/^\/+/, "");
	return normalizedRest ? `${root}/${normalizedRest}` : root;
}

function guestComponent(value) {
	return value.replace(/[^A-Za-z0-9._-]/g, "_") || "_";
}

if (require.main === module) {
	process.exitCode = main();
} else {
	module.exports = {
		createRunConfig,
		createWindowsRunConfig,
		createWindowsTranslateState,
		toWindowsGuestPath,
		translateWindowsArgv,
		translateWindowsFileListContent,
	};
}
