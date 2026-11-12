const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const theme = require("../src/theme.cjs");
const { commonColors } = require("../src/palette.cjs");

function escapeXml(text) {
	return text.replace(/[<>&"]/g, character => ({
		"<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;"
	})[character]);
}

function token(text, scope) {
	const settings = {};
	for (const rule of theme.tokenColors) {
		const scopes = Array.isArray(rule.scope) ? rule.scope : [rule.scope];
		if (scopes.includes(scope)) Object.assign(settings, rule.settings);
	}
	if (!settings.foreground) throw new Error(`Missing icon token color for ${scope}`);
	const styles = new Set((settings.fontStyle || "").split(" "));
	return `<tspan data-scope="${escapeXml(scope)}" fill="${settings.foreground}" font-style="${styles.has("italic") ? "italic" : "normal"}" font-weight="${styles.has("bold") ? "bold" : "normal"}">${escapeXml(text)}</tspan>`;
}

module.exports = async function renderIcon(page) {
	const colors = {
		background: theme.colors["editor.background"],
		tabs: theme.colors["editorGroupHeader.tabsBackground"],
		foreground: theme.colors["editor.foreground"],
		muted: commonColors.contrastColors.mediumForeground,
		selection: theme.colors["modernEditorTab.activeBackground"],
		"violet-light": commonColors.violet.violet5thTone,
		"violet-medium": commonColors.violet.violet3rdTone,
		violet: commonColors.violet.violet4thTone,
		diamond: commonColors.blueTones.cyan
	};
	const punctuation = text => token(text, "punctuation");
	const variable = text => token(text, "variable");
	const lines = [
		token("// A little more violet", "comment"),
		"",
		token("const ", "storage.type") + variable("var") + token(" = ", "keyword")
			+ token('"Violet"', "string"),
		"",
		token("class ", "storage.type") + token("VioletTheme", "entity.name") + punctuation("{"),
		"    " + token("function ", "storage.type") + token("makeitViolet", "entity.name.function")
			+ punctuation("(") + token("a", "variable.parameter") + punctuation(", ")
			+ token("b", "variable.parameter") + punctuation("){"),
		"        " + variable("var") + token(" = ", "keyword") + token("10.2", "constant.numeric") + punctuation(";"),
		"    " + punctuation("}"),
		punctuation("};")
	];
	const snippet = lines.map((line, index) =>
		`<text x="33" y="${61 + index * 22}" xml:space="preserve">${line}</text>`
	).join("\n");
	const source = fs.readFileSync(path.join(__dirname, "..", "images", "icon-source.svg"), "utf8");
	if (!/<g id="code-snippet"[^>]*>/.test(source)) throw new Error("Icon source is missing the code-snippet group.");
	const svg = source.replace(/<g id="code-snippet"[^>]*>[\s\S]*?<\/g>/, `<g id="code-snippet" font-size="9">\n${snippet}\n</g>`)
		.replace(/var\(--([\w-]+), #[0-9a-f]+\)/g, (_, name) => {
			const color = colors[name];
			if (typeof color !== "string" || !/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color)) {
				throw new Error(`Invalid icon color: ${name} (${color})`);
			}
			return color;
		});
	const destination = path.join(__dirname, "..", "images", "icon.svg");
	fs.mkdirSync(path.dirname(destination), { recursive: true });
	fs.writeFileSync(destination, svg);
	await page.setViewportSize({ width: 256, height: 256 });
	await page.goto(pathToFileURL(destination).href);
	await page.evaluate(() => document.fonts.ready);
	await page.screenshot({
		path: path.join(__dirname, "..", "images", "icon.png"),
		omitBackground: true,
		animations: "disabled"
	});
};
