const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const stateFile = path.join(__dirname, "..", ".vscode", "dev-target.json");
const installRoot = path.join(
	process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"),
	"Programs",
	"Microsoft VS Code"
);

function getBuiltinExtensionsDirectory(root = installRoot) {
	const launcherPath = path.join(root, "bin", "code.cmd");
	const launcher = fs.readFileSync(launcherPath, "utf8");
	const appPath = launcher.match(/%~dp0\.\.\\([^"\r\n]*?\\resources\\app)\\out\\cli\.js/i);
	if (!appPath) {
		throw new Error(`Unable to resolve the active VS Code installation from ${launcherPath}`);
	}

	const extensionsDirectory = path.join(root, appPath[1], "extensions");
	if (!fs.existsSync(extensionsDirectory)) {
		throw new Error(`VS Code built-in extensions directory does not exist: ${extensionsDirectory}`);
	}
	return extensionsDirectory;
}

const targets = {
	user: {
		label: "user extensions",
		directory: name => path.join(os.homedir(), ".vscode", "extensions", `${name}-local`)
	},
	builtin: {
		label: "VS Code built-in extensions",
		directory: name => path.join(getBuiltinExtensionsDirectory(), `${name}-local`)
	}
};

function getTarget() {
	try {
		const { target } = JSON.parse(fs.readFileSync(stateFile, "utf8"));
		if (targets[target]) return target;
	} catch {}
	return "user";
}

function setTarget(target) {
	fs.mkdirSync(path.dirname(stateFile), { recursive: true });
	fs.writeFileSync(stateFile, `${JSON.stringify({ target }, null, 2)}\n`);
}

function getDestination(name) {
	return targets[getTarget()].directory(name);
}

module.exports = { targets, getTarget, setTarget, getDestination, getBuiltinExtensionsDirectory };

if (require.main === module) {
	const next = getTarget() === "user" ? "builtin" : "user";
	setTarget(next);
	console.log(`Dev environment: ${targets[next].label}`);
}
