# afc-c README

AFC-c is a tool to help developers get terminal outputs on discord when they are afk.

## Features

This extension helps developers stay connected even when they're away from their keyboard (AFK). If you're AFK for a certain period and have joined the configured Discord server, it will automatically send a message via a Discord bot, notifying others of your status or predefined message.

🔑 Key Features
⏳ AFK Detection: Detects when you're inactive in VS Code for a specified time.

🤖 Discord Integration: Automatically sends a message using a Discord bot when you're AFK.

🛡️ Server-Specific: Only works if you’ve joined the linked Discord server.

✍️ Customizable Messages: Set your own AFK timers, polling intervals and number of outputs to batch in the extension settings.

## Requirements

Join the `afc-c` server on Discord using this [invite link](https://discord.gg/BbpRnPVMeW) 
Turn on developer mode from settings of your profile
Copy user id from the server after turning on developer mode

and you're all set!

## Network Activity

This extension sends terminal output messages via POST request to a custom backend:
- Endpoint: `https://afc-cproxyserver-production.up.railway.app/send-dm`
- Purpose: To forward AFK terminal logs to Discord via bot DM
- No personal data or user identifiers are shared beyond the configured user ID


## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
