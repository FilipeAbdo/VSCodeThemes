# Violet Theme development

## Editing the theme

Requires Node.js 22 or newer and npm. Run `npm ci` to install the build
dependencies, then `npx playwright install chromium` once to install the browser
used for palette screenshots. Repeat the browser installation after updating
Playwright.

- Define colors in [src/palette.cjs](src/palette.cjs), which exports `common`
  for shared UI colors and `tokens` for syntax-token colors.
  Use hex strings or the local helpers backed by `tinycolor2`:
  `rgb(18, 0, 28)` produces `"#12001c"`, and `rgba(18, 0, 28, 0.5)`
  produces `"#12001c80"`. Each RGB channel must be an integer between 0 and
  255; alpha must be a finite number between 0 and 1. Invalid values stop the
  build with an error.
  Use `withAlpha(hex, alpha)` within the palette to add or replace a hex color's
  opacity: `withAlpha("#4c8f95", 0.5)` returns `"#4c8f9580"`. It accepts
  `#RGB`, `#RGBA`, `#RRGGBB`, and `#RRGGBBAA`; the supplied alpha replaces any
  existing alpha rather than multiplying it.
- Use those exports in [src/theme.cjs](src/theme.cjs), for example
  `"editor.background": common.background` or `"foreground": tokens.variables`.
  Each token rule with a color has its own token-named entry, even when hex
  values repeat, so syntax colors can be edited independently.
  Repeated hex values are defined once in `commonColors` and referenced by
  `common` and `tokens`. Edit a shared value to update all its references, or
  replace an individual reference with a different color to customize one rule.
- Run `npm run build` after edits to regenerate
  [the theme JSON](themes/VS%20Code%20Violet%20Theme-color-theme.json).

Do not edit the generated JSON directly; the next build overwrites it.
Keep the generated JSON committed so VS Code can load the theme without a build.
F5 starts the watcher, waits for the first successful build, and launches the
Extension Development Host. Further source saves rebuild automatically.
Packaging with `vsce package` also builds automatically via `vscode:prepublish`.
The source and build scripts are excluded from the packaged extension.

## Palette references in decoration styles

Author decoration values in [src/theme.cjs](src/theme.cjs) using the existing
`common`, `tokens`, `commonColors`, and `decorationStyles` imports from
[src/palette.cjs](src/palette.cjs). For example:

```js
"decorationStyles": {
    "unusedFontStyle": decorationStyles.unusedFontStyle,
    "attributeAccessForeground": common.editorForeground
}
```

To select a specific palette color, replace `common.editorForeground` with,
for example, `commonColors.redTones.red` or `tokens.invalid`. For a font-style
string containing a color, use `"italic underline wavy " + commonColors.yellowTones.mustard`.
These are JavaScript references, not quoted reference names.

Run `node scripts/build-theme.cjs --development` to resolve these references
into literal values under `decorationStyles` in both generated color-theme JSON copies.
The installed runtime needs only the generated JSON, not the palette module.
Keep palette references in the source; JSON cannot import or evaluate them.

## Decoration maintenance agent

The **Violet Decorations** custom agent checks decoration parameters end-to-end:
source, build serialization/validation, runtime application, reloads, and tests.
Invoke it manually in Copilot or start **Watch Violet decorations with AI**
from **Tasks: Run Task** (`npm run watch:decorations:agent`).

The watcher requires the standalone GitHub Copilot CLI, authenticated with
`copilot login`; VS Code's Copilot shim alone is not sufficient. See the
[CLI setup guide](https://docs.github.com/en/copilot/how-tos/copilot-cli/cli-getting-started).
Run a development build first so both generated theme files exist.
Trust this repository in the CLI before starting the watcher.
It grants write access and permission for `node --test*` and
`node scripts/build-theme.cjs*` commands, not blanket tool approval.
Other permissions may need separate approval. It does not choose a model.

After startup, changes to `decorationStyles` in either generated color-theme JSON
trigger a debounced AI maintenance pass.
Whitespace-only saves and changes to other sections do not trigger it. Agent runs never overlap, and changes
during a run are absorbed as its final state to prevent rebuild loops.
Do not edit styles during a run; save again after it completes if necessary.
Normally edit `src/theme.cjs` under `decorationStyles`; a subsequent build changes
the watched output. If editing generated parameters directly, ensure the two
saved copies do not conflict; the watcher identifies them so the agent can
distinguish requested changes from a stale generated copy. The agent must
preserve intended changes in the source.
Unclear new parameter behavior is reported, not invented.

This watcher is opt-in and not part of F5 or the ordinary theme build.
Each run can consume Copilot requests and edit workspace files. Review its
changes; AI checks cannot guarantee correctness or appearance.
Stop the task or press Ctrl+C to stop watching.

## Inactive editor tabs

Set `common.inactiveTabForeground` and `common.unfocusedInactiveTabForeground`
in [src/palette.cjs](src/palette.cjs). Their mappings live under
`configurationColorDefaults` in [src/theme.cjs](src/theme.cjs). The build
copies their hex values into the theme-specific `workbench.colorCustomizations`
defaults in [package.json](package.json), preserving other settings. This
metadata is not included in the generated color-theme JSON.

Commit the updated manifest and restart the Extension Development Host after
changing these defaults; user settings can override them. Modern UI is
experimental, so verify their appearance in the VS Code build you use.

## Unused code

`common.unusedCodeOpacity` controls `editorUnnecessaryCode.opacity`. Only the
alpha channel is used: `rgba(0, 0, 0, 0.5)` fades unused symbols to approximately
50% opacity while retaining their syntax colors. This is a workbench color,
not a TextMate token rule. It requires `editor.showUnused` to be enabled and
the language extension to report unnecessary code. The theme cannot detect unused
symbols itself or assign separate unused-variable and unused-function colors.

[extension.cjs](extension.cjs) additionally decorates `Unnecessary` diagnostics
with italic text and the `violetTheme.unusedForeground` theme color, sourced from
`common.unusedCodeForeground`. It only runs decorations while Violet is selected,
`editor.showUnused` is enabled, and `violetTheme.decorateUnusedCode` is enabled.
It updates visible editors on diagnostic, configuration, theme, and visibility
changes. Disabling it or selecting a different theme clears the decorations.
The runtime has no npm dependencies and is included in local installations.
`violetTheme.unusedFontStyle` in Settings JSON controls the decoration font style
(space-separated `italic`, `bold`, `underline`, and `strikethrough`, with `oblique`
as an alternative to `italic`; `normal` or `""` adds no style).
The runtime maps these to decoration `fontStyle`, `fontWeight`, and
`textDecoration` properties. Set the theme's default in
`decorationStyles.unusedFontStyle` in [src/palette.cjs](src/palette.cjs).
It is wired into the `decorationStyles` section of [src/theme.cjs](src/theme.cjs),
alongside `colors` and `tokenColors`, so the theme source declares all style
mappings. You can override the value there instead of changing the palette.
This section is embedded in the generated color-theme JSON for the extension
runtime; VS Code's theme engine does not apply decorations itself.
The build validates it and updates the setting default in [package.json](package.json);
commit that generated default along with the theme. Explicit user settings win.
The runtime watches the generated theme JSON and reads its `decorationStyles`
section, refreshing decoration colors, opacity, and font styles after each build,
without restarting debugging. Commit this generated file and include it when
installing the extension. Explicit user/workspace font-style settings still win.
Use either `strikethrough` or `line-through` for a strikeout.
Underline supports one immediately following modifier: `solid`, `wavy`,
`dotted`, `dashed`, or `double`, for example `italic underline wavy`.
The CSS decoration style applies to both lines if combined with strikethrough.
Append a six- or eight-digit hex color to color the decoration independently of
the foreground, for example `italic underline wavy #FF00FF`. A trailing color
requires an underline or strikethrough. Edit the source default, not the generated
theme JSON, since builds overwrite that file.
This is a window-scoped
extension setting, not a theme color key. Changes recreate the decorations
immediately in both foreground and opacity-only modes.
For `violetTheme.unusedForeground`, eight-digit transparent-black values
(`#000000AA`) mean opacity-only decorations; other values use a `ThemeColor`
foreground. The runtime reads the generated theme value and global/exact
`[VS Code Violet Theme]` color overrides to choose the mode, refreshing on
color-customization changes. Use this exact theme selector rather than wildcard
or combined selectors when overriding the opacity-only mode.

## Palette preview

The nested objects in `commonColors` in [src/palette.cjs](src/palette.cjs)
define the preview sections automatically. For example, `redTones` becomes
"Red Tones", and each color inside it becomes a card. Reference grouped colors
as `commonColors.redTones.red`; no separate section list is needed.

The build also generates [palette.html](palette.html) from `commonColors` in
[src/palette.cjs](src/palette.cjs). Keep this page committed with the generated
theme JSON and [images/palette.png](images/palette.png). Playwright opens the HTML
locally in headless Chromium and captures a full-page PNG for the README.
No external rendering services are used. Open the HTML in your browser for
responsive color cards, selectable HEX/RGB/HSL values, and checkerboard transparency
previews. The README references the PNG hosted on GitHub.
Page surfaces and text use `common` colors; syntax examples and color functions
use `tokens` colors for methods, punctuation, numbers, strings, and comments.
The palette does not specify font families, so the page uses system UI fonts
and a monospace code stack, with italic comments matching the theme.

Every `npm run build` refreshes all three generated files. The existing watcher
does the same when source files are saved, including `src/palette.cjs`.

### README image

The Extensions Details page sanitizes local and data-URI image sources, so the
README uses the PNG hosted on GitHub's `main` branch. Commit and push the
generated PNG to update the displayed image. Local builds do not change the
hosted image until it is pushed.
Run **Violet Theme: Preview Color Palette** from the Command Palette to open
the installed `images/palette.png` in VS Code's image viewer. This command is
available in development and release installs and requires no network connection.

### Extension icon

The extension icon is authored in [images/icon-source.svg](images/icon-source.svg): an editor tab
and code behind a centered violet V and cyan diamond. The backdrop is dimmed
independently of the mark. CSS color variables have
fallback colors for standalone viewing; the build resolves them from the theme
palette into [images/icon.svg](images/icon.svg).
The renderer in [scripts/render-icon.cjs](scripts/render-icon.cjs) generates
the snippet from explicitly scoped tokens and reads their foreground, bold,
and italic settings directly from `src/theme.cjs`. This is a themed illustration,
not a screenshot or a full JavaScript grammar/semantic-token renderer.
Edit the source SVG to change the artwork. Each build renders it locally
to a 256 by 256 [images/icon.png](images/icon.png), referenced by the manifest's
`icon` field and included in release, local, and F5 development installations.
Commit the SVG source, generated SVG, and PNG.
Watch mode monitors only the source SVG, not the generated images, to avoid rebuild loops.

Release builds (`npm run build`, `vscode:prepublish`, and
`npm run install:local:release`) regenerate the icon automatically, as do
development builds. No AI service is needed during a build.
The workspace **Violet Icon** Copilot agent provides on-demand artwork maintenance
and visual review; it is not automatically launched by npm.

### GitHub automation

The **Build Violet theme** workflow runs after relevant changes are pushed,
on pull requests, or manually using **Actions > Build Violet theme > Run workflow**.
It installs dependencies and Chromium, builds the theme and palette previews,
and uploads the generated files as a downloadable artifact.
It does not commit files or modify your branch; commit generated files locally
to update the palette displayed in the repository README.
GitHub Actions cannot observe unsaved edits or local saves; F5/watch handles
local saves and GitHub Actions runs after pushing them.

### Creating a versioned release

Use numeric tags without a `v` prefix, for example `1.2.3`.
Finish validation and commit your work first, and stop build/AI watchers.
From `Violet`, run:

```sh
npm run release
npm run release -- --significant
npm run release -- -i
npm run release -- --major
npm run release -- -m
```

With no argument, the patch component increases (`1.2.3` becomes `1.2.4`).
`--significant` or `-i` increases minor and resets patch (`1.2.3` becomes `1.3.0`).
`--major` or `-m` increases major and resets minor and patch (`1.2.3` becomes `2.0.0`).
Pass one option only, after npm's `--` separator. An explicit version remains
available when needed:

```sh
npm run release -- 1.2.3
```

This requires a clean repository and a checked-out branch. It uses `npm version`
to synchronize `package.json` and `package-lock.json` without running lifecycle
scripts, commits the files, then creates an annotated tag matching the version on that commit.
The commit includes the Copilot co-author trailer. No build, test, push, extension
installation, or publication is performed by this command.
An existing tag or an invalid version is rejected before modifying files.
If the repository is not clean, the command prints a red **Release blocked**
message and exits unsuccessfully without throwing an exception or changing files.
Release installation stops at this check too.
If a later Git/npm operation fails, inspect the working tree, commits, and tags
before retrying; changes are not automatically rolled back.

When ready, push your branch and its release tag:

```sh
git push
git push origin 1.2.3
```

The tag push triggers **Build Violet theme**, which verifies that the tag and both
version files match and uploads the manifests with the build artifacts.
Creating a tag manually does not rewrite files in its commit; mismatches fail
the release build instead. A tag is a reference to an existing commit, so the
version update must happen before tag creation.

## Rebuilding on save

Run `npm run watch`, or select **Tasks: Run Task**
and **Watch Violet theme**. It builds immediately and rebuilds whenever you
save changes under `src`, `scripts`, or to `package.json`. The inactive-tab
defaults in the manifest are build-managed: edits to those values are replaced
by their palette values. Other manifest settings are preserved. Build errors appear in the
terminal; correcting and saving the file triggers another attempt.

F5 starts this task automatically; you do not need to start it separately.
Watch mode also creates a development extension in `.vscode/development`,
which F5 loads instead of the release sources.
The watcher stays running after debugging stops, so stop it explicitly when done.
The Extension Development
Host picks up changes to the generated theme JSON; reload that window if needed.
Stop watching with `Ctrl+C` in its terminal or **Tasks: Terminate Task**.
Watch mode only rebuilds the project; use `Ctrl+Shift+B` to update the locally
installed copy.

## Installing locally

With the development extension loaded, press **Ctrl+K, Ctrl+I** or run **Violet Theme:
Install Locally and Reload Window**. It runs the workspace task **Install Violet
theme locally**, waits for a successful exit, then reloads the window where the
command was invoked. Failed or cancelled tasks do not reload the window.
Open this project's `Violet` folder so its task is available. The chord overrides
the usual editor hover shortcut while a workspace folder is open.
After installing this command for the first time, reload VS Code once to load
the new runtime and keybinding. `Ctrl+Shift+B` still installs without reloading.

Run `npm run install:local` to build the theme and copy its runtime files into
the destination selected by [scripts/dev-target.cjs](scripts/dev-target.cjs).
The default is `<user home>\.vscode\extensions\violettheme-local`.
No packaging tools are required; run `npm ci` and
`npx playwright install chromium` before the first build.

Run **Developer: Reload Window** (or restart VS Code), then choose
**VS Code Violet Theme** using **Preferences: Color Theme**.
Run `npm run install:local` again after source changes to update the local copy.
This targets desktop VS Code Stable, not Insiders or remote extension hosts.
If **Toggle Violet dev environment** is set to **VS Code built-in extensions**,
the installer follows the active app folder in VS Code's `bin\code.cmd` launcher,
including versioned app folders.

Use **Toggle Violet dev environment**, `npm run toggle:env`, or **Ctrl+K, Ctrl+E**
with the development extension loaded to switch the installation destination.
Both development and release local installs use this shared selection.
The toggle does not move the workspace or change build inputs: build, palette,
and icon scripts resolve project files relative to their own script directory,
not the terminal's current directory or the selected VS Code installation.
F5 staging stays in the workspace's `.vscode/development` directory.

Default local installs and F5 builds include the install/reload command and shortcut.
For a local release install, select **Tasks: Run Task > Install Violet release
locally**, or run `npm run install:local:release`. This replaces the same local
extension with the release variant, without the development command or shortcut.
Every release install first increments the patch version, commits both version
files, and creates the matching tag using the release command. It requires a clean
repository: commit your changes and stop build/AI watchers first. To choose another
increment, use `npm run install:local:release -- --significant` (or `-i`) for minor,
or `npm run install:local:release -- --major` (or `-m`) for major.
The release VS Code task/shortcut uses the default patch increment.
In the development extension, **Ctrl+K, Ctrl+/** opens **Violet Theme: Choose
Release Impact, Install and Reload**. Select **Patch**, **Minor**, or **Major**
to run the corresponding release install task; Escape cancels without changes.
The same clean-repository requirement applies. Reload happens only after a
successful installation.
Development installs do not increment, commit, or tag.
Versioning failure prevents building/installing. If building or installing fails
after versioning succeeds, the commit/tag remain; inspect them before retrying,
because another successful invocation creates another version. Nothing is pushed.
From a development build, **Ctrl+K, Ctrl+Shift+I** or **Violet Theme: Install
Release Locally and Reload Window** runs this release task and reloads the
invoking window only after success. Both install shortcuts disappear after
switching to release; use the task or terminal to install development again.
Reload the window afterward to apply the change. Use `npm run install:local`
to switch back to the development variant.
The source `package.json` remains release-ready: `npm run build` and
`vscode:prepublish` do not add either contribution, so release packages leave
the normal hover shortcut untouched and do not register the development command.

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
