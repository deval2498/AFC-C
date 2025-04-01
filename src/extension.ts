import * as vscode from 'vscode';
import { request } from 'https';
import { URL } from 'url';

let USER_ID: string;
let AFK_THRESHOLD: number;
let TERMINAL_POLLING: number;
let BATCH_SIZE: number;

let pollIntervalId: NodeJS.Timeout | undefined;
let activityTimer: NodeJS.Timeout | undefined;
let isPolling = false;
let lastTerminalOutputTime = Date.now();
let lastPollingStartTime = 0;
const POLLING_LIFESPAN = 60 * 60 * 1000; // 1 hour

interface TerminalBuffer {
  buffer: string[];
  timer?: NodeJS.Timeout;
}

const terminalBuffers: Map<string, TerminalBuffer> = new Map();

function sendDM(userId: string, message: string): void {
  console.log("Sending message via proxy");
  const data = JSON.stringify({ userId, message });
  const url = new URL('https://afc-cproxyserver-production.up.railway.app/send-dm');

  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  };

  const req = request(options, res => {
    if (res.statusCode && res.statusCode >= 400) {
      console.error(`Failed to send DM. Status code: ${res.statusCode}`);
    }
  });

  req.on('error', error => console.error('Error sending DM:', error));
  req.write(data);
  req.end();
}

async function flushBuffer(terminalId: string): Promise<void> {
  const entry = terminalBuffers.get(terminalId);
  if (!entry || entry.buffer.length === 0) return;

  const batchedMessage = entry.buffer.join('\n---\n');
  sendDM(USER_ID, `✉️ Output from terminal [${terminalId}]:\n\n${batchedMessage}`);
  clearTimeout(entry.timer);
  entry.timer = undefined;
  entry.buffer = [];
}

async function handleTerminalOutput(): Promise<void> {
  try {
    for (const terminal of vscode.window.terminals) {
      const terminalId = `${await terminal.processId}`;
      const originalClipboard = await vscode.env.clipboard.readText();

      await vscode.commands.executeCommand('workbench.action.terminal.copyLastCommandOutput');
      const output = await vscode.env.clipboard.readText();
      await vscode.env.clipboard.writeText(originalClipboard);

      if (!output.trim() || output === originalClipboard) {
        console.log("No output from terminal");
        continue;
      }

      let entry = terminalBuffers.get(terminalId);
      if (!entry) {
        entry = { buffer: [] };
        terminalBuffers.set(terminalId, entry);
      }

      const last = entry.buffer.at(-1);
      if (output !== last) {
        lastTerminalOutputTime = Date.now();

        if (entry.buffer.length >= BATCH_SIZE) {
          entry.buffer = [];
        }

        entry.buffer.push(output);
        console.log(`New output from terminal [${terminalId}]:`, output);

        if (entry.buffer.length >= BATCH_SIZE) {
          await flushBuffer(terminalId);
        } else if (!entry.timer) {
          entry.timer = setTimeout(() => flushBuffer(terminalId), 60000);
        }
      } else {
        console.log("Output is same as last not sending. Thank you.", terminalBuffers);
      }
    }
  } catch (error) {
    console.error('Error handling terminal output:', error);
  }
}

const pollTerminalOutput = (): void => {
  if (isPolling) return;
  isPolling = true;
  lastPollingStartTime = Date.now();
  pollIntervalId = setInterval(async () => {
    await handleTerminalOutput();

    const now = Date.now();
    const timeSinceLastOutput = now - lastTerminalOutputTime;
    const timeSincePollingStart = now - lastPollingStartTime;

    if (timeSinceLastOutput > POLLING_LIFESPAN && timeSincePollingStart > POLLING_LIFESPAN) {
      console.log('⏹️ Auto-stopping polling due to inactivity.');
      stopPollingTerminalOutput();
    }
  }, TERMINAL_POLLING);
};

const stopPollingTerminalOutput = (): void => {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = undefined;
    isPolling = false;
    console.log('Stopped polling terminal output.');
  }
};

const resetActivityTimer = (): void => {
  stopPollingTerminalOutput();
  clearTimeout(activityTimer);
  activityTimer = setTimeout(() => {
    console.log('User inactive. Starting terminal output polling.');
    pollTerminalOutput();
  }, AFK_THRESHOLD);
};

export const activate = (context: vscode.ExtensionContext): void => {
  console.log('Activating extension');

  const config = vscode.workspace.getConfiguration('terminalDiscord');
  USER_ID = config.get<string>('USER_ID') || '';
  AFK_THRESHOLD = config.get<number>('AFK_THRESHOLD') || -1;
  TERMINAL_POLLING = config.get<number>('TERMINAL_POLLING') || -1;
  BATCH_SIZE = config.get<number>('BATCH_SIZE') || -1;

  if (!USER_ID || AFK_THRESHOLD <= 0 || TERMINAL_POLLING <= 0 || BATCH_SIZE <= 0) {
    vscode.window.showErrorMessage('Invalid configuration. Extension deactivated.');
    deactivate();
    return;
  }

  const onUserActivity = () => resetActivityTimer();

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(onUserActivity),
    vscode.window.onDidChangeTextEditorSelection(onUserActivity),
    vscode.window.onDidChangeActiveTextEditor(onUserActivity)
  );

  resetActivityTimer();
};

export const deactivate = (): void => {
  clearTimeout(activityTimer);
  stopPollingTerminalOutput();
};