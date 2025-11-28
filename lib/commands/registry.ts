// Command registry - base module to avoid circular dependencies

import { ParsedCommand } from '../commandParser';

export type CommandHandler = (
  parsed: ParsedCommand,
  currentDir: string
) => Promise<string | string[]> | string | string[];

const handlers: { [key: string]: CommandHandler } = {};

export function registerCommand(name: string, handler: CommandHandler): void {
  handlers[name] = handler;
}

export function getCommandHandler(command: string): CommandHandler | null {
  return handlers[command] || null;
}

export function getAllCommands(): string[] {
  return Object.keys(handlers);
}

