const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.join(__dirname, "..");
const manifest = require("../package.json");
const destination = path.join(os.homedir(), ".vscode", "extensions", `${manifest.name}-local`);
const installedManifestPath = path.join(destination, "package.json");
const release = process.argv.includes("--release");

if (fs.existsSync(destination)) {
	if (!fs.existsSync(installedManifestPath)) {
		throw new Error(`Refusing to overwrite an unrecognized extension directory: ${destination}`);
	}
	const installedManifest = JSON.parse(fs.readFileSync(installedManifestPath, "utf8"));
	if (installedManifest.name !== manifest.name || installedManifest.publisher !== manifest.publisher) {
		throw new Error(`Refusing to overwrite a different extension: ${destination}`);
	}
}

async function installLocal() {
	await require("./build-theme.cjs");

	const files = [
		"package.json",
		manifest.main,
		manifest.icon,
		"images/icon.svg",
		"themes/decoration-styles.json",
		...manifest.contributes.themes.map(theme => theme.path),
		"README.md",
		"DEVELOPMENT.md",
		"palette.html",
		"images/palette.png",
		"CHANGELOG.md"
	];

	for (const file of files) {
		const sourcePath = path.resolve(root, file);
		const targetPath = path.resolve(destination, file);
		if (!sourcePath.startsWith(`${root}${path.sep}`) || !targetPath.startsWith(`${destination}${path.sep}`)) {
			throw new Error(`Extension file must be inside the extension directory: ${file}`);
		}
		fs.mkdirSync(path.dirname(targetPath), { recursive: true });
		fs.copyFileSync(sourcePath, targetPath);
	}

	if (!release) require("./build-development.cjs")(root, destination);
	console.log(`Installed ${release ? "release" : "development"} ${manifest.displayName} to ${destination}`);
	console.log("Run Developer: Reload Window, then select VS Code Violet Theme.");
}

module.exports = installLocal();
module.exports.catch(error => {
	console.error(error);
	process.exitCode = 1;
});
