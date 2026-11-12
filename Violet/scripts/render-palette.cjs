const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const tinycolor = require("tinycolor2");
const { commonColors, common, tokens } = require("../src/palette.cjs");

function formatColorFunction(value) {
	const [, method, argumentsText] = value.match(/^(\w+)\(([^)]+)\)$/);
	const argumentsHtml = argumentsText.split(", ").map(argument =>
		`<span class="syntax-number">${argument}</span>`
	).join('<span class="syntax-punctuation">, </span>');
	return `<span class="syntax-method">${method}</span><span class="syntax-punctuation">(</span>${argumentsHtml}<span class="syntax-punctuation">)</span>`;
}

function formatName(name) {
	const words = name
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/([a-zA-Z])(\d+)/g, "$1 $2");
	return (words[0].toUpperCase() + words.slice(1))
		.replace(/(\d+)(st|nd|rd|th)\b/g, "$1<sup>$2</sup>");
}

module.exports = async function renderPalette() {
	const sections = Object.entries(commonColors).map(([groupName, colors], index) => {
		if (!/^[a-zA-Z0-9]+$/.test(groupName) || !colors || typeof colors !== "object" || Object.keys(colors).length === 0) {
			throw new Error(`Invalid palette group: ${groupName}`);
		}
		const title = formatName(groupName);
		const cards = Object.entries(colors).map(([name, color]) => {
		if (!/^[a-zA-Z0-9]+$/.test(name) || !/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color)) {
			throw new Error(`Invalid palette card: ${name} (${color})`);
		}
		const label = formatName(name);
		const value = tinycolor(color);
		return `<li class="card">
			<div class="checker" aria-hidden="true"><div class="swatch" style="background-color: ${color}"></div></div>
			<h3>${label}</h3>
			<ul class="color-values" aria-label="Color values">
				<li><span class="value-label">Hex:</span> <code class="syntax-string">${color.toUpperCase()}</code></li>
				<li><span class="value-label">RGB:</span> <code>${formatColorFunction(value.toRgbString())}</code></li>
				<li><span class="value-label">HSL:</span> <code>${formatColorFunction(value.toHslString())}</code></li>
			</ul>
		</li>`;
		}).join("\n");
		return `<section aria-labelledby="palette-section-${index}">
			<h2 id="palette-section-${index}">${title}</h2>
			<ul class="palette" aria-labelledby="palette-section-${index}">${cards}</ul>
		</section>`;
	}).join("\n");
	const html = `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Violet Theme | Color palette</title>
	<style>
		:root {
			color-scheme: dark;
			font-family: "Segoe UI", system-ui, sans-serif;
			--background: ${common.background};
			--foreground: ${common.editorForeground};
			--surface: ${common.sidebarBackground};
			--shell: ${common.shellBackground};
			--accent: ${common.accent};
			--selection: ${common.selectionBackground};
			--label: ${tokens.variables};
			--method: ${tokens.functionSpecialMethod};
			--punctuation: ${tokens.operatorMisc};
			--number: ${tokens.numberConstantFunctionArgumentTagAttributeEmbedded};
			--string: ${tokens.stringSymbolsInheritedClassMarkupHeading};
			--keyword: ${tokens.keywordStorage};
			--comment: ${tokens.comment};
			background: var(--background);
			color: var(--foreground);
		}
		* { box-sizing: border-box; }
		body { margin: 0; padding: 48px 24px; background: radial-gradient(ellipse at top, var(--surface), transparent 70%); min-height: 100vh; }
		main { max-width: 1080px; margin: auto; }
		.eyebrow { color: var(--label); text-transform: uppercase; letter-spacing: .18em; font-size: .75rem; font-weight: 700; }
		h1 { margin: 12px 0; font-size: clamp(2rem, 6vw, 3.5rem); letter-spacing: -.04em; }
		.description { color: var(--foreground); line-height: 1.7; max-width: 640px; }
		.palette { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 18px; padding: 0; margin: 32px 0; list-style: none; }
		.card { padding: 12px 12px 18px; border: 1px solid var(--accent); border-radius: 18px; background: var(--surface); box-shadow: 0 8px 24px ${commonColors.otherColors.transparentBlack}; transition: transform .18s ease, border-color .18s ease; }
		.card:hover { transform: translateY(-4px); border-color: var(--selection); }
		.checker { overflow: hidden; border: 4px solid var(--accent); border-radius: 10px; background: conic-gradient(var(--shell) 25%, var(--foreground) 0 50%, var(--shell) 0 75%, var(--foreground) 0) 0 0 / 16px 16px; }
		.swatch { height: 96px; }
		section { margin-top: 40px; }
		h2 { font-size: 1.4rem; margin: 0; padding-bottom: 12px; border-bottom: 1px solid var(--accent); }
		h3 { font-size: .95rem; font-weight: 600; margin: 16px 4px 8px; overflow-wrap: anywhere; }
		.color-values { list-style: none; margin: 0 4px; padding: 0; }
		.color-values li { margin-top: 8px; }
		.value-label { color: var(--label); font-size: .8rem; }
		code { font-family: Consolas, "Courier New", monospace; font-size: .8rem; user-select: all; overflow-wrap: anywhere; }
		.syntax-method { color: var(--method); }
		.syntax-punctuation { color: var(--punctuation); }
		.syntax-number { color: var(--number); }
		.syntax-string { color: var(--string); }
		.syntax-keyword { color: var(--keyword); }
		.syntax-variable { color: var(--label); }
		.syntax-comment { color: var(--comment); font-style: italic; }
		.code-preview { padding: 24px; border: 1px solid var(--accent); border-radius: 18px; background: var(--background); overflow-x: auto; line-height: 1.8; }
		.code-preview code { font-size: .95rem; user-select: text; }
		::selection { background: var(--selection); color: var(--foreground); }
		footer { color: var(--foreground); font-size: .85rem; line-height: 1.7; }
		@media (prefers-reduced-motion: reduce) { .card { transition: none; } .card:hover { transform: none; } }
	</style>
</head>
<body>
	<main>
		<header>
			<p class="eyebrow">VS Code Violet Theme</p>
			<h1>A little more violet.</h1>
			<p class="description">Deep purples, soft contrasts, and colorful accents. Explore the shared palette behind Violet Theme. Select a HEX, RGB, or HSL value to copy it.</p>
		</header>
		<section aria-labelledby="syntax-preview">
			<h2 id="syntax-preview">The palette in action</h2>
			<p class="description">Actual theme colors for keywords, variables, methods, parentheses, numbers, strings, and italic comments.</p>
			<pre class="code-preview"><code><span class="syntax-comment">// A small sample of Violet Theme</span>
<span class="syntax-keyword">const</span> <span class="syntax-variable">accent</span> <span class="syntax-punctuation">=</span> ${formatColorFunction(tinycolor(common.accent).toRgbString())}<span class="syntax-punctuation">;</span>
<span class="syntax-method">paint</span><span class="syntax-punctuation">(</span><span class="syntax-string">"Violet"</span><span class="syntax-punctuation">, </span><span class="syntax-variable">accent</span><span class="syntax-punctuation">);</span></code></pre>
		</section>
		${sections}
		<footer>Generated from src/palette.cjs. Transparent colors appear over a checkerboard.<br>Run npm run build to refresh this page.</footer>
	</main>
</body>
</html>
`;
	const htmlPath = path.join(__dirname, "..", "palette.html");
	fs.writeFileSync(htmlPath, html);
	const imagePath = path.join(__dirname, "..", "images", "palette.png");
	fs.mkdirSync(path.dirname(imagePath), { recursive: true });
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage({
			viewport: { width: 1120, height: 900 },
			deviceScaleFactor: 1,
			reducedMotion: "reduce"
		});
		await page.goto(pathToFileURL(htmlPath).href);
		await page.evaluate(() => document.fonts.ready);
		await page.screenshot({ path: imagePath, fullPage: true, animations: "disabled" });
		await page.setViewportSize({ width: 256, height: 256 });
		await page.goto(pathToFileURL(path.join(__dirname, "..", "src", "icon.svg")).href);
		await page.screenshot({
			path: path.join(__dirname, "..", "images", "icon.png"),
			omitBackground: true,
			animations: "disabled"
		});
	} finally {
		await browser.close();
	}
};
