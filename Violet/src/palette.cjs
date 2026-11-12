const tinycolor = require("tinycolor2");

function validateChannels(red, green, blue) {
	const channels = [red, green, blue];
	if (!channels.every(channel => Number.isInteger(channel) && channel >= 0 && channel <= 255)) {
		throw new RangeError("RGB channels must be integers between 0 and 255.");
	}
}

function rgb(red, green, blue) {
	validateChannels(red, green, blue);
	return tinycolor({ r: red, g: green, b: blue }).toHexString();
}

function validateAlpha(alpha) {
	if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
		throw new RangeError("Alpha must be a finite number between 0 and 1.");
	}
}

function rgba(red, green, blue, alpha) {
	validateChannels(red, green, blue);
	validateAlpha(alpha);
	return tinycolor({ r: red, g: green, b: blue, a: alpha }).toHex8String();
}

function withAlpha(hex, alpha) {
	if (typeof hex !== "string" || !/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) {
		throw new TypeError("Color must be a hex string in #RGB, #RGBA, #RRGGBB, or #RRGGBBAA format.");
	}
	validateAlpha(alpha);
	return tinycolor(hex).setAlpha(alpha).toHex8String();
}

class Palette {
	constructor() {
		var a;
		this.commonColors = commonColors;
	}
}

class Color extends Palette {
	constructor() {
		super();
	}
}

class another {
	constructor() {
	}
}

const commonColors = {
	// Palette reference source: https://www.color-hex.com/color-palette/11325
	// Color picker site: https://colorpicker.dev/#3d293d
	
	// Violet palette
	violet: {
		darkViolet: rgb(24, 0, 37),
		greyishViolet: rgb(61, 41, 61),
		violet: rgb(113,25,113),
		violet2ndTone: rgb(135,46,135),
		violet3rdTone: rgb(158,74,158),
		violet4thTone: rgb(190,117,190),
		violet5thTone: rgb(222,172,222),
	},

	//Contrast colors
	contrastColors: {
		darkerForeground: rgb(33, 69, 73),
		darkForeground: rgb(44, 82, 86),
		mediumForeground: rgb(76, 143, 149),
		lightForeground: rgb(227, 248, 248)
	},

	//Red Tones
	redTones: {
		red: "#FF5370",
		coral: "#f07178",
		orange: "#F78C6C"
	},
	
	//Yellow Tones
	yellowTones: {
		darkMustard: "#634f12",
		mustard: "#fdbe01",
		yellow: "#FFCB6B"
	},
	
	//Green Tones
	greenTones: {
		muted: rgb(57, 136, 75),
		green: "#C3E88D"
	},
	
	//Blue Tones
	blueTones: {
		blue: "#82AAFF",
		cyan: "#89DDFF",
		blueGray: "#B2CCD6"
	},
	
	//Other Colors
	otherColors: {
		darkInactive: "#251c28",
		darkActive: "#382a3c"
	},

	//Transparency levels
	transparencyLevels: {
		low: rgba(0, 0, 0, 0.75),
		mid: rgba(0, 0, 0, 0.5),
		high: rgba(0, 0, 0, 0.31)
	}
};

commonColors.otherColors.accent = commonColors.contrastColors.darkForeground; //Accent color

module.exports = {
	commonColors,
	decorationStyles: {
		unusedFontStyle: "italic underline wavy " + commonColors.yellowTones.mustard,
	},
	common: {
		background: commonColors.violet.darkViolet,
		editorForeground: commonColors.contrastColors.lightForeground,
		unusedCodeForeground: commonColors.transparencyLevels.low,
		sidebarBackground: commonColors.violet.greyishViolet,
		selectionBackground: commonColors.violet.violet,
		accent: commonColors.otherColors.accent,
		white: commonColors.contrastColors.lightForeground,
		badgeBackground: commonColors.contrastColors.mediumForeground,
		badgeForeground: commonColors.contrastColors.lightForeground,
		statusBarBackground: commonColors.contrastColors.darkForeground,
		orange: commonColors.redTones.orange,
		shellBackground: commonColors.otherColors.darkActive,
		inactiveShellBackground: commonColors.otherColors.darkInactive,
		dropdownBackground: commonColors.violet.darkViolet,
		dropdownForeground: commonColors.contrastColors.lightForeground,
		dropdownBorder: commonColors.contrastColors.darkForeground,
		dropDownListBackground: commonColors.violet.darkViolet,
		inputBackground: commonColors.violet.darkViolet,
		inputForeground: commonColors.contrastColors.lightForeground,
		inputBorder: commonColors.contrastColors.darkForeground,
		tabsBackground: commonColors.violet.darkViolet,
		inactiveTabForeground: withAlpha(commonColors.contrastColors.lightForeground, 0.75),
		unfocusedInactiveTabForeground: withAlpha(commonColors.contrastColors.mediumForeground, 0.75),
		toolbarBackground: commonColors.contrastColors.darkForeground,
		toolbarOutline: commonColors.violet.violet3ndTone,
	},
	tokens: {
		comment: commonColors.greenTones.muted,
		variables: commonColors.contrastColors.mediumForeground,
		colors: commonColors.contrastColors.lightForeground,
		invalid: commonColors.redTones.red,
		keywordStorage: commonColors.violet.violet4thTone,
		operatorMisc: commonColors.blueTones.cyan,
		tag: commonColors.redTones.coral,
		functionSpecialMethod: commonColors.blueTones.blue,
		functionInlineParameterNameDefinition: commonColors.blueTones.blue,
		blockLevelVariables: commonColors.redTones.coral,
		otherVariableStringLink: commonColors.redTones.coral,
		numberConstantFunctionArgumentTagAttributeEmbedded: commonColors.redTones.orange,
		stringSymbolsInheritedClassMarkupHeading: commonColors.greenTones.green,
		classSupport: commonColors.yellowTones.yellow,
		entityTypes: commonColors.blueTones.blueGray,
		cssClassAndSupport: commonColors.blueTones.blueGray,
		subMethods: commonColors.redTones.red,
		languageMethods: commonColors.redTones.red,
		entityNameMethodJs: commonColors.blueTones.blue,
		metaMethodJs: commonColors.blueTones.blue,
		attributes: commonColors.violet.violet3rdTone,
		htmlAttributes: commonColors.yellowTones.yellow,
		cssClasses: commonColors.yellowTones.yellow,
		cssIds: commonColors.blueTones.blue,
		inserted: commonColors.greenTones.green,
		deleted: commonColors.redTones.red,
		changed: commonColors.violet.violet3rdTone,
		regularExpressions: commonColors.blueTones.cyan,
		escapeCharacters: commonColors.blueTones.cyan,
		decorators: commonColors.blueTones.blue,
		es7BindOperator: commonColors.redTones.red,
		
		//JSON
		jsonKeyLevel0: commonColors.violet.violet5thTone,
		jsonKeyLevel1: commonColors.yellowTones.yellow,
		jsonKeyLevel2: commonColors.redTones.orange,
		jsonKeyLevel3: commonColors.redTones.red,
		jsonKeyLevel4: commonColors.yellowTones.darkMustard,
		jsonKeyLevel5: commonColors.blueTones.blue,
		jsonKeyLevel6: commonColors.redTones.coral,
		jsonKeyLevel7: commonColors.violet.violet2ndTone,
		jsonKeyLevel8: commonColors.greenTones.green,

		//Markdown
		markdownPlain: commonColors.contrastColors.lightForeground,
		markdownMarkupRawInline: commonColors.violet.violet2ndTone,
		markdownMarkupRawInlinePunctuation: commonColors.greenTones.muted,
		markdownHeading: commonColors.greenTones.green,
		markupItalic: commonColors.redTones.coral,
		markupBold: commonColors.redTones.coral,
		markupBoldItalic: commonColors.redTones.coral,
		markupUnderline: commonColors.redTones.orange,
		markdownBlockquote: commonColors.greenTones.muted,
		markdownLink: commonColors.blueTones.blue,
		markdownLinkDescription: commonColors.violet.violet2ndTone,
		markdownLinkAnchor: commonColors.yellowTones.yellow,
		markupRawBlock: commonColors.violet.violet2ndTone,
		markdownRawBlockFenced: commonColors.transparencyLevels.high,
		markdownFencedBodeBlock: commonColors.transparencyLevels.high,
		markdownFencedBodeBlockVariable: commonColors.contrastColors.lightForeground,
		markdownFencedLanguage: commonColors.greenTones.muted,
		markdownSeparator: commonColors.greenTones.muted,
		markupTable: commonColors.contrastColors.lightForeground
	}
};
