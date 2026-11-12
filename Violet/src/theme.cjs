const { common, tokens, commonColors, decorationStyles } = require("./palette.cjs");

module.exports = {
	"name": "VS Code Violet Theme",
	"decorationStyles": {
		"unusedFontStyle": decorationStyles.unusedFontStyle
	},
	"configurationColorDefaults": {
		"tab.inactiveForeground": common.inactiveTabForeground,
		"tab.unfocusedInactiveForeground": common.unfocusedInactiveTabForeground
	},
	"colors": {
		"editor.background": common.background,
		"editor.foreground": common.editorForeground,
		"editorUnnecessaryCode.opacity": common.unusedCodeOpacity,
		"violetTheme.unusedForeground": common.unusedCodeForeground,
		"surface.background": common.background,
		"sideBar.background": common.sidebarBackground,
		
		
		"modernEditorTab.activeBackground": common.selectionBackground,
		"modernEditorTab.activeActionBackground": common.activeTabActionBackground,
		"modernEditorTab.activeHoverBackground": common.accent,
		
		"modernTab.activeBackground": common.selectionBackground,
		"modernTab.hoverBackground": common.accent,
		"modernTab.activeForeground": common.white,
		
		"activityBarBadge.background": common.badgeBackground,
		"activityBarBadge.foreground": common.badgeForeground,
		"statusBar.background": common.statusBarBackground,
		"modernPanel.border": common.accent,
		
		"list.activeSelectionBackground": common.selectionBackground,
		"list.hoverBackground": common.accent,
		"list.hoverForeground": common.white,
		"list.activeSelectionForeground": common.white,
		"list.warningForeground": common.orange,
		
		"titleBar.activeBackground": common.shellBackground,
		"modernUI.shellBackground": common.shellBackground,
		"titleBar.inactiveBackground": common.inactiveShellBackground,
		"modernUI.inactiveShellBackground": common.inactiveShellBackground,

		"dropdown.background": common.dropdownBackground,
		"dropdown.foreground": common.dropdownForeground,
		"dropdown.border": common.dropdownBorder,
		"dropDownList.background": common.dropDownListBackground,

		"input.background": common.inputBackground,
		"input.foreground": common.inputForeground,
		"input.border": common.inputBorder,

		"editorGroupHeader.tabsBackground": common.tabsBackground,

		"button.background": commonColors.contrastColors.darkForeground,
		"button.hoverBackground": commonColors.violet.violet,
		"button.foreground": commonColors.contrastColors.lightForeground,
		"button.border": commonColors.contrastColors.darkForeground,
		"button.separator": commonColors.contrastColors.lightForeground,

		"checkbox.background": commonColors.violet.darkViolet,
		"checkbox.foreground": commonColors.contrastColors.lightForeground,
		"checkbox.border": commonColors.contrastColors.darkForeground,

		"radio.activeBackground": commonColors.violet.darkViolet,
		"radio.activeBorder": commonColors.contrastColors.darkForeground,
		"radio.inactiveBackground": commonColors.contrastColors.lightForeground,

		"toolbar.activeBackground": common.toolbarBackground,
		"toolbar.hoverOutline": common.toolbarOutline,

		"debugToolBar.background": commonColors.contrastColors.darkerForeground,
		"debugToolBar.border": commonColors.violet.violet,
	},
	
	"tokenColors": [
		{
			"name": "Comment",
			"scope": [
				"comment",
				"punctuation.definition.comment"
			],
			"settings": {
				"fontStyle": "italic",
				"foreground": tokens.comment
			}
		},
		{
			"name": "Variables",
			"scope": [
				"variable",
				"string constant.other.placeholder"
			],
			"settings": {
				"foreground": tokens.variables
			}
		},
		{
			"name": "Colors",
			"scope": [
				"constant.other.color"
			],
			"settings": {
				"foreground": tokens.colors
			}
		},
		{
			"name": "Invalid",
			"scope": [
				"invalid",
				"invalid.illegal"
			],
			"settings": {
				"foreground": tokens.invalid
			}
		},
		{
			"name": "Keyword, Storage",
			"scope": [
				"keyword",
				"storage.type",
				"storage.modifier"
			],
			"settings": {
				"foreground": tokens.keywordStorage,
				"fontStyle": "italic bold"
			}
		},
		{
			"name": "Operator, Misc",
			"scope": [
				"keyword.control",
				"constant.other.color",
				"punctuation",
				"meta.tag",
				"punctuation.definition.tag",
				"punctuation.separator.inheritance.php",
				"punctuation.definition.tag.html",
				"punctuation.definition.tag.begin.html",
				"punctuation.definition.tag.end.html",
				"punctuation.section.embedded",
				"keyword.other.template",
				"keyword.other.substitution"
			],
			"settings": {
				"foreground": tokens.operatorMisc
			}
		},
		{
			"name": "Tag",
			"scope": [
				"entity.name.tag",
				"meta.tag.sgml",
				"markup.deleted.git_gutter"
			],
			"settings": {
				"foreground": tokens.tag
			}
		},
		{
			"name": "Function, Special Method",
			"scope": [
				"entity.name.function",
				"meta.function-call",
				"variable.function",
				"support.function",
				"keyword.other.special-method"
			],
			"settings": {
				"foreground": tokens.functionSpecialMethod,
				"fontStyle": "italic"
			}
		},
		{
			"name": "Function Name Parameter Name Inline Definition",
			"scope": [
				"meta.object-literal.key",
			],
			"settings": {
				"foreground": tokens.functionInlineParameterNameDefinition
			}
		},
		{
			"name": "Block Level Variables",
			"scope": [
				"meta.block variable.other"
			],
			"settings": {
				"foreground": tokens.blockLevelVariables
			}
		},
		{
			"name": "Other Variable, String Link",
			"scope": [
				"support.other.variable",
				"string.other.link"
			],
			"settings": {
				"foreground": tokens.otherVariableStringLink
			}
		},
		{
			"name": "Number, Constant, Function Argument, Tag Attribute, Embedded",
			"scope": [
				"constant.numeric",
				"constant.language",
				"support.constant",
				"constant.character",
				"constant.escape",
				"variable.parameter",
				"keyword.other.unit",
				"keyword.other"
			],
			"settings": {
				"foreground": tokens.numberConstantFunctionArgumentTagAttributeEmbedded
			}
		},
		{
			"name": "String, Symbols, Inherited Class, Markup Heading",
			"scope": [
				"string",
				"constant.other.symbol",
				"constant.other.key",
				"entity.other.inherited-class",
				"markup.heading",
				"markup.inserted.git_gutter",
				"meta.group.braces.curly constant.other.object.key.js string.unquoted.label.js"
			],
			"settings": {
				"foreground": tokens.stringSymbolsInheritedClassMarkupHeading
			}
		},
		{
			"name": "Class, Support",
			"scope": [
				"entity.name",
				"support.type",
				"support.class",
				"support.other.namespace.use.php",
				"meta.use.php",
				"support.other.namespace.php",
				"markup.changed.git_gutter",
				"support.type.sys-types"
			],
			"settings": {
				"foreground": tokens.classSupport
			}
		},
		{
			"name": "Entity Types",
			"scope": [
				"support.type"
			],
			"settings": {
				"foreground": tokens.entityTypes
			}
		},
		{
			"name": "CSS Class and Support",
			"scope": [
				"source.css support.type.property-name",
				"source.sass support.type.property-name",
				"source.scss support.type.property-name",
				"source.less support.type.property-name",
				"source.stylus support.type.property-name",
				"source.postcss support.type.property-name"
			],
			"settings": {
				"foreground": tokens.cssClassAndSupport
			}
		},
		{
			"name": "Sub-methods",
			"scope": [
				"entity.name.module.js",
				"variable.import.parameter.js",
				"variable.other.class.js"
			],
			"settings": {
				"foreground": tokens.subMethods
			}
		},
		{
			"name": "Language methods",
			"scope": [
				"variable.language"
			],
			"settings": {
				"fontStyle": "italic",
				"foreground": tokens.languageMethods
			}
		},
		{
			"name": "entity.name.method.js",
			"scope": [
				"entity.name.method.js"
			],
			"settings": {
				"fontStyle": "italic",
				"foreground": tokens.entityNameMethodJs
			}
		},
		{
			"name": "meta.method.js",
			"scope": [
				"meta.class-method.js entity.name.function.js",
				"variable.function.constructor"
			],
			"settings": {
				"foreground": tokens.metaMethodJs
			}
		},
		{
			"name": "Attributes",
			"scope": [
				"entity.other.attribute-name"
			],
			"settings": {
				"foreground": tokens.attributes
			}
		},
		{
			"name": "HTML Attributes",
			"scope": [
				"text.html.basic entity.other.attribute-name.html",
				"text.html.basic entity.other.attribute-name"
			],
			"settings": {
				"fontStyle": "italic",
				"foreground": tokens.htmlAttributes
			}
		},
		{
			"name": "CSS Classes",
			"scope": [
				"entity.other.attribute-name.class"
			],
			"settings": {
				"foreground": tokens.cssClasses
			}
		},
		{
			"name": "CSS ID's",
			"scope": [
				"source.sass keyword.control"
			],
			"settings": {
				"foreground": tokens.cssIds
			}
		},
		{
			"name": "Inserted",
			"scope": [
				"markup.inserted"
			],
			"settings": {
				"foreground": tokens.inserted
			}
		},
		{
			"name": "Deleted",
			"scope": [
				"markup.deleted"
			],
			"settings": {
				"foreground": tokens.deleted
			}
		},
		{
			"name": "Changed",
			"scope": [
				"markup.changed"
			],
			"settings": {
				"foreground": tokens.changed
			}
		},
		{
			"name": "Regular Expressions",
			"scope": [
				"string.regexp"
			],
			"settings": {
				"foreground": tokens.regularExpressions
			}
		},
		{
			"name": "Escape Characters",
			"scope": [
				"constant.character.escape"
			],
			"settings": {
				"foreground": tokens.escapeCharacters
			}
		},
		{
			"name": "URL",
			"scope": [
				"*url*",
				"*link*",
				"*uri*"
			],
			"settings": {
				"fontStyle": "underline"
			}
		},
		{
			"name": "Decorators",
			"scope": [
				"tag.decorator.js entity.name.tag.js",
				"tag.decorator.js punctuation.definition.tag.js"
			],
			"settings": {
				"fontStyle": "italic",
				"foreground": tokens.decorators
			}
		},
		{
			"name": "ES7 Bind Operator",
			"scope": [
				"source.js constant.other.object.key.js string.unquoted.label.js"
			],
			"settings": {
				"fontStyle": "italic",
				"foreground": tokens.es7BindOperator
			}
		},
		{
			"name": "JSON Key - Level 0",
			"scope": [
				"source.json meta.structure.dictionary.json support.type.property-name.json"
			],
			"settings": {
				"foreground": tokens.jsonKeyLevel0
			}
		},
		{
			"name": "JSON Key - Level 1",
			"scope": [
				"source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json"
			],
			"settings": {
				"foreground": tokens.jsonKeyLevel1
			}
		},
		{
			"name": "JSON Key - Level 2",
			"scope": [
				"source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json"
			],
			"settings": {
				"foreground": tokens.jsonKeyLevel2
			}
		},
		{
			"name": "JSON Key - Level 3",
			"scope": [
				"source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json"
			],
			"settings": {
				"foreground": tokens.jsonKeyLevel3
			}
		},
		{
			"name": "JSON Key - Level 4",
			"scope": [
				"source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json"
			],
			"settings": {
				"foreground": tokens.jsonKeyLevel4
			}
		},
		{
			"name": "JSON Key - Level 5",
			"scope": [
				"source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json"
			],
			"settings": {
				"foreground": tokens.jsonKeyLevel5
			}
		},
		{
			"name": "JSON Key - Level 6",
			"scope": [
				"source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json"
			],
			"settings": {
				"foreground": tokens.jsonKeyLevel6
			}
		},
		{
			"name": "JSON Key - Level 7",
			"scope": [
				"source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json"
			],
			"settings": {
				"foreground": tokens.jsonKeyLevel7
			}
		},
		{
			"name": "JSON Key - Level 8",
			"scope": [
				"source.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json"
			],
			"settings": {
				"foreground": tokens.jsonKeyLevel8
			}
		},
		{
			"name": "Markdown - Plain",
			"scope": [
				"text.html.markdown",
				"punctuation.definition.list_item.markdown"
			],
			"settings": {
				"foreground": tokens.markdownPlain
			}
		},
		{
			"name": "Markdown - Markup Raw Inline",
			"scope": [
				"text.html.markdown markup.inline.raw.markdown"
			],
			"settings": {
				"foreground": tokens.markdownMarkupRawInline
			}
		},
		{
			"name": "Markdown - Markup Raw Inline Punctuation",
			"scope": [
				"text.html.markdown markup.inline.raw.markdown punctuation.definition.raw.markdown"
			],
			"settings": {
				"foreground": tokens.markdownMarkupRawInlinePunctuation
			}
		},
		{
			"name": "Markdown - Heading",
			"scope": [
				"markdown.heading",
				"markup.heading | markup.heading entity.name",
				"markup.heading.markdown punctuation.definition.heading.markdown"
			],
			"settings": {
				"foreground": tokens.markdownHeading
			}
		},
		{
			"name": "Markup - Italic",
			"scope": [
				"markup.italic"
			],
			"settings": {
				"fontStyle": "italic",
				"foreground": tokens.markupItalic
			}
		},
		{
			"name": "Markup - Bold",
			"scope": [
				"markup.bold",
				"markup.bold string"
			],
			"settings": {
				"fontStyle": "bold",
				"foreground": tokens.markupBold
			}
		},
		{
			"name": "Markup - Bold-Italic",
			"scope": [
				"markup.bold markup.italic",
				"markup.italic markup.bold",
				"markup.quote markup.bold",
				"markup.bold markup.italic string",
				"markup.italic markup.bold string",
				"markup.quote markup.bold string"
			],
			"settings": {
				"fontStyle": "bold",
				"foreground": tokens.markupBoldItalic
			}
		},
		{
			"name": "Markup - Underline",
			"scope": [
				"markup.underline"
			],
			"settings": {
				"fontStyle": "underline",
				"foreground": tokens.markupUnderline
			}
		},
		{
			"name": "Markdown - Blockquote",
			"scope": [
				"markup.quote punctuation.definition.blockquote.markdown"
			],
			"settings": {
				"foreground": tokens.markdownBlockquote
			}
		},
		{
			"name": "Markup - Quote",
			"scope": [
				"markup.quote"
			],
			"settings": {
				"fontStyle": "italic"
			}
		},
		{
			"name": "Markdown - Link",
			"scope": [
				"string.other.link.title.markdown"
			],
			"settings": {
				"foreground": tokens.markdownLink
			}
		},
		{
			"name": "Markdown - Link Description",
			"scope": [
				"string.other.link.description.title.markdown"
			],
			"settings": {
				"foreground": tokens.markdownLinkDescription
			}
		},
		{
			"name": "Markdown - Link Anchor",
			"scope": [
				"constant.other.reference.link.markdown"
			],
			"settings": {
				"foreground": tokens.markdownLinkAnchor
			}
		},
		{
			"name": "Markup - Raw Block",
			"scope": [
				"markup.raw.block"
			],
			"settings": {
				"foreground": tokens.markupRawBlock
			}
		},
		{
			"name": "Markdown - Raw Block Fenced",
			"scope": [
				"markup.raw.block.fenced.markdown"
			],
			"settings": {
				"foreground": tokens.markdownRawBlockFenced
			}
		},
		{
			"name": "Markdown - Fenced Bode Block",
			"scope": [
				"punctuation.definition.fenced.markdown"
			],
			"settings": {
				"foreground": tokens.markdownFencedBodeBlock
			}
		},
		{
			"name": "Markdown - Fenced Bode Block Variable",
			"scope": [
				"markup.raw.block.fenced.markdown",
				"variable.language.fenced.markdown",
				"punctuation.section.class.end"
			],
			"settings": {
				"foreground": tokens.markdownFencedBodeBlockVariable
			}
		},
		{
			"name": "Markdown - Fenced Language",
			"scope": [
				"variable.language.fenced.markdown"
			],
			"settings": {
				"foreground": tokens.markdownFencedLanguage
			}
		},
		{
			"name": "Markdown - Separator",
			"scope": [
				"meta.separator"
			],
			"settings": {
				"fontStyle": "bold",
				"foreground": tokens.markdownSeparator
			}
		},
		{
			"name": "Markup - Table",
			"scope": [
				"markup.table"
			],
			"settings": {
				"foreground": tokens.markupTable
			}
		}
	]
}
