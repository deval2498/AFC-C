import * as vscode from 'vscode';
import axios from 'axios';

let lastOutput = "";
let activityTimer: NodeJS.Timeout | undefined;
let pollIntervalId: NodeJS.Timeout | undefined;

// Set the inactivity threshold (e.g., 5 minutes)
const AFK_THRESHOLD = 5000; // 5 minutes in milliseconds

/**
 * Polls the terminal output periodically by executing the command to copy
 * the last command output, and then compares it to the previous output.
 * If the output is new, it logs it (or optionally sends it to Discord).
 */
const pollTerminalOutput = (pollInterval: number, webhookUrl: string): void => {
  pollIntervalId = setInterval(async () => {
    try {
      // Execute the command to copy the last terminal output.
      await vscode.commands.executeCommand("workbench.action.terminal.copyLastCommandOutput");
      // Read the text from the clipboard.
      const output = await vscode.env.clipboard.readText();

      if (output) {
        if (output !== lastOutput) {
          lastOutput = output;
          console.log("New terminal output:", output);
          // Uncomment the following line to send the output to Discord:
          // await axios.post(webhookUrl, { content: output });
        } else {
          console.log("Waiting for new output...");
        }
      } else {
        console.log("No output available yet.");
      }
    } catch (error) {
      console.error("Error reading terminal output:", error);
    }
  }, pollInterval);
};

/**
 * Stops the polling if it is active.
 */
const stopPollingTerminalOutput = (): void => {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = undefined;
    console.log("Stopped polling terminal output due to user activity.");
  }
};

/**
 * Resets the inactivity timer.
 * When the timer expires, it starts polling for terminal output.
 */
const resetActivityTimer = (webhookUrl: string): void => {
  // User activity is detected, so stop any ongoing polling.
  stopPollingTerminalOutput();

  if (activityTimer) {
    clearTimeout(activityTimer);
  }
  activityTimer = setTimeout(() => {
    console.log("User has been inactive for threshold duration. Starting terminal output polling.");
    // Start polling terminal output every 10 seconds when the user is inactive.
    pollTerminalOutput(10000, webhookUrl);
  }, AFK_THRESHOLD);
};

export const activate = (context: vscode.ExtensionContext): void => {
  console.log("Activating extension");

  // Retrieve the Discord webhook URL from configuration.
  const config = vscode.workspace.getConfiguration('terminalDiscord');
  const webhookUrl = config.get<string>('webhookUrl');
  if (!webhookUrl) {
    vscode.window.showErrorMessage('Discord webhook URL is not set in settings.');
    return;
  }

  // Listen for various user activity events.
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(() => {
    resetActivityTimer(webhookUrl);
  }));
  context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(() => {
    resetActivityTimer(webhookUrl);
  }));
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => {
    resetActivityTimer(webhookUrl);
  }));

  // Initialize the inactivity timer.
  resetActivityTimer(webhookUrl);
};

export const deactivate = (): void => {
  if (activityTimer) {
    clearTimeout(activityTimer);
  }
  stopPollingTerminalOutput();
};
