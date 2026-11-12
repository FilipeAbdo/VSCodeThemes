# Welcome to your VS Code Extension

## What's in the folder

* This folder contains all of the files necessary for your color theme extension.
* `package.json` - this is the manifest file that defines the location of the theme file and specifies the base theme of the theme.
* `themes/VS Code Violet Theme-color-theme.json` - the color theme definition file.

## Get up and running straight away

* Press `F5` (the **Extension** launch configuration) to build the theme and open an Extension Development Host window with your extension loaded. This previews the theme without installing it locally; `Ctrl+Shift+B` remains the local installation command.
* Open the color theme picker with  the `File > Preferences > Theme > Color Theme` menu item, or use the `Preferences: Color Theme command (Ctrl+K Ctrl+T)` and pick your theme
* Open a file that has a language associated. The languages' configured grammar will tokenize the text and assign 'scopes' to the tokens. To examine these scopes, invoke the `Developer: Inspect Editor Tokens and Scopes` command from the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac).

## Make changes

* Changes to the theme file are automatically applied to the Extension Development Host window.

## Adopt your theme to Visual Studio Code

* The token colorization is done based on standard TextMate themes. Colors are matched against one or more scopes.

To learn more about scopes and how they're used, check out the [color theme](https://code.visualstudio.com/api/extension-guides/color-theme) documentation, and the settings available for the theme at [theme color](https://code.visualstudio.com/api/references/theme-color) page.

## Install your extension

* Run `npm run install:local` to build and copy the extension into `<user home>\.vscode\extensions\violettheme-local`, then reload or restart Code. Run the command again after edits to update the installed copy.
* Press `Ctrl+Shift+B` to run the default build task, **Install Violet theme locally**.
* To use `Ctrl+B` instead, open **Preferences: Open Keyboard Shortcuts (JSON)** and add this entry to the existing array. This overrides the sidebar-toggle shortcut globally; the named task is available when this project is open:

  ```json
  {
    "key": "ctrl+b",
    "command": "workbench.action.tasks.runTask",
    "args": "Install Violet theme locally"
  }
  ```

* To share your extension with the world, read on https://code.visualstudio.com/api/working-with-extensions/publishing-extension about publishing an extension.
