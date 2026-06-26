#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
// @ts-check
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { argv, cwd, env, platform } = require("node:process");
const { WASI } = require("node:wasi");

function main() {
	const wasi = new WASI({
		version: "preview1",
		args: argv.slice(1),
		env: {
			...env,
			PLATFORM: platform,
			// Keep PWD in host-native syntax; WASI-side layers translate it.
			PWD: cwd(),
		},
		preopens: preopens(),
		returnOnExit: true,
	});

	const file = fs.readFileSync(path.join(__dirname, "clang-format-cli.wasm"));
	const module = new WebAssembly.Module(file);
	const instance = new WebAssembly.Instance(
		module,
		/** @type {WebAssembly.Imports} */ (wasi.getImportObject()),
	);

	return wasi.start(instance);
}

process.exitCode = main();

function preopens() {
	if (platform === "win32") {
		return win32Preopens();
	}

	return {
		"/": "/",
	};
}

function win32Preopens() {
	/**
	 * @type {Record<string, string>}
	 */
	const preopens = {};

	for (let code = 65; code <= 90; code++) {
		const letter = String.fromCharCode(code);
		const hostRoot = `${letter}:\\`;

		try {
			const real = fs.realpathSync.native(hostRoot);
			if (fs.statSync(real).isDirectory()) {
				preopens[`/${letter}:/`] = real;
			}
		} catch {}
	}

	return preopens;
}
