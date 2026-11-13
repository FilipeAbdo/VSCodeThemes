# Violet Theme

A violet-based dark theme for Visual Studio Code, pairing deep purple surfaces
with soft violet selections, cool teal accents, and colorful syntax highlighting.

## Color palette

![Violet Theme color palette with named swatches and HEX, RGB, and HSL values](https://raw.githubusercontent.com/FilipeAbdo/VSCodeThemes/main/Violet/images/palette.png)

Run **Violet Theme: Preview Color Palette** from the Command Palette to view the installed palette locally. No network connection is required.

## Highlights

- Deep violet editor background and muted purple sidebars.
- Coordinated editor tabs, lists, badges, and status bar.
- Colorful syntax highlighting, including nested JSON keys and Markdown.
- Modern UI styling with separate, rounded pill tabs.

## Activate the theme

1. Install **Violet Theme**.
2. Open **Preferences: Color Theme** (`Ctrl+K Ctrl+T` on Windows/Linux).
3. Select **VS Code Violet Theme**.

For a local development install from this repository, follow the
[local installation steps](DEVELOPMENT.md#installing-locally).

Requires VS Code **1.145.0 or newer**.

## Modern UI

The extension defaults Modern UI to enabled and editor tabs to `pill`.
These defaults apply while the extension is enabled, not only while this theme
is selected. Your explicit settings take precedence.

If needed, set:

```json
{
  "workbench.experimental.modernUI": true,
  "workbench.experimental.modernUIEditorTabStyle": "pill"
}
```

Connected tabs can use the editor surface color instead of the theme's custom
active-tab background.

## Unused-code styling

While this theme is selected, code reported as unnecessary by your language
extension appears italic with a golden wavy underline and muted foreground. This can include unused
variables, functions, imports, and unreachable code; the diagnostic determines
the highlighted range. `editor.showUnused` must be enabled.

Disable with `"violetTheme.decorateUnusedCode": false`.
Set the font style in Settings JSON (outside `workbench.colorCustomizations`):

```json
{
  "violetTheme.unusedFontStyle": "italic"
}
```

Supported styles are `italic`, `bold`, `underline`, and `strikethrough`
(also accepted as `line-through`),
combined with spaces, for example `"bold italic underline"`. `oblique` can replace
`italic`; `normal` or `""` adds no style. Changes apply
immediately, including when using opacity-only colors.
For squiggles, use `"italic underline wavy"`. Other underline modifiers are
`solid`, `dotted`, `dashed`, and `double`; place one immediately after `underline`.
When combined with strikethrough, the modifier affects both lines.
Append a decoration color, for example `"italic underline wavy #FF00FF"`.
Six- and eight-digit hex colors are supported without changing the text color.
Explicit Settings JSON values take precedence over the theme's defaults.

Use `#000000AA` for opacity-only styling that preserves syntax colors (for
example, `#00000080` for approximately 50%). Other colors override the foreground.
The configured font style remains in either mode. This opacity can combine with VS Code's built-in
unused-code fading; set `editorUnnecessaryCode.opacity` to `#000000ff` in color
customizations if you want only the decoration's opacity applied.

Customize the color with:

```json
{
  "workbench.colorCustomizations": {
    "[VS Code Violet Theme]": {
      "violetTheme.unusedForeground": "#65737E"
    }
  }
}
```
