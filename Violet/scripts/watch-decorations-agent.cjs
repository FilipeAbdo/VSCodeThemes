const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

function watchDecorationStyles({ files, run, onError, interval = 250, debounce = 750 }) {
	let stopped = false;
	let running = false;
	let timer;
	const snapshots = new Map();
	const pending = new Set();
	function read(file) {
		const styles = JSON.parse(fs.readFileSync(file, "utf8")).decorationStyles;
		if (!styles || typeof styles !== "object" || Array.isArray(styles)) {
			throw new Error(`Missing or invalid decorationStyles in ${file}`);
		}
		return JSON.stringify(styles);
	}
	for (const file of files) snapshots.set(file, read(file));

	async function launch() {
		if (stopped || running) return;
		running = true;
		const changedFiles = Array.from(pending);
		pending.clear();
		try {
			await run(changedFiles);
		} catch (error) {
			onError(error);
		} finally {
			// A maintenance build updates both watched outputs itself.
			for (const file of files) {
				try {
					snapshots.set(file, read(file));
				} catch (error) {
					onError(error);
				}
			}
			running = false;
		}
	}
	const listeners = files.map(file => {
		const listener = () => {
			if (stopped || running) return;
			try {
				const value = read(file);
				if (value === snapshots.get(file)) return;
				snapshots.set(file, value);
				pending.add(file);
				clearTimeout(timer);
				timer = setTimeout(launch, debounce);
			} catch (error) {
				clearTimeout(timer);
				onError(error);
			}
		};
		fs.watchFile(file, { interval }, listener);
		return { file, listener };
	});
	return {
		dispose() {
			stopped = true;
			clearTimeout(timer);
			for (const { file, listener } of listeners) fs.unwatchFile(file, listener);
		}
	};
}

function executeCopilot(args, cwd) {
	return new Promise((resolve, reject) => {
		const command = process.platform === "win32" ? "powershell.exe" : "copilot";
		const commandArgs = process.platform === "win32"
			? ["-NoProfile", "-Command", `& copilot ${args.map(arg => `'${arg.replaceAll("'", "''")}'`).join(" ")}; exit $LASTEXITCODE`]
			: args;
		const child = spawn(command, commandArgs, { cwd, stdio: "inherit" });
		child.once("error", reject);
		child.once("exit", (code, signal) => {
			if (code === 0) resolve();
			else reject(new Error(`Copilot CLI failed (${signal || code}). Install/authenticate the standalone CLI and check its permissions.`));
		});
	});
}

async function main() {
	const root = path.join(__dirname, "..");
	await executeCopilot(["--version"], root);
	const files = [
		path.join(root, "themes", "VS Code Violet Theme-color-theme.json"),
		path.join(root, ".vscode", "development", "themes", "VS Code Violet Theme-color-theme.json")
	];
	const watcher = watchDecorationStyles({
		files,
		async run(changedFiles) {
			console.log("Running Violet Decorations agent. Avoid editing decoration styles until it finishes.");
			await executeCopilot([
				"--agent=violet-decorations",
				"-p", `Saved decorationStyles sections in: ${changedFiles.map(file => path.relative(root, file)).join(", ")}. Treat these saved sections as the requested changes, not stale unsaved copies. Inspect their source, preserve intentional parameter changes, wire them end-to-end, run focused tests, and rebuild development outputs. Follow the Violet Decorations agent instructions. Report ambiguous requirements rather than guessing.`,
				"--allow-tool=write",
				"--allow-tool=shell(node --test*)",
				"--allow-tool=shell(node scripts/build-theme.cjs*)"
			], root);
			console.log("Violet Decorations agent finished. Review its changes and test results.");
		},
		onError(error) {
			console.error("Violet decoration agent:", error.message);
		}
	});
	console.log("Watching decorationStyles in release and development theme JSON. AI runs may use paid requests. Press Ctrl+C to stop.");
	for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => {
		watcher.dispose();
	});
}

if (require.main === module) main().catch(error => {
	console.error(error.message);
	process.exitCode = 1;
});

module.exports = { watchDecorationStyles };
