// Command parser for terminal

export interface ParsedCommand {
  command: string;
  args: string[];
  flags: { [key: string]: boolean | string };
  raw: string;
}

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  if (!trimmed) {
    return { command: '', args: [], flags: {}, raw: trimmed };
  }
  
  // Handle quoted strings
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  
  if (current) {
    parts.push(current);
  }
  
  if (parts.length === 0) {
    return { command: '', args: [], flags: {}, raw: trimmed };
  }
  
  const command = parts[0];
  const args: string[] = [];
  const flags: { [key: string]: boolean | string } = {};
  
  for (let i = 1; i < parts.length; i++) {
    const arg = parts[i];
    
    if (arg.startsWith('--')) {
      const flagName = arg.substring(2);
      if (i + 1 < parts.length && !parts[i + 1].startsWith('-')) {
        flags[flagName] = parts[i + 1];
        i++;
      } else {
        flags[flagName] = true;
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      // Handle short flags like -la, -h, etc.
      if (arg.length === 2) {
        flags[arg[1]] = true;
      } else {
        // Multiple flags like -la
        for (let j = 1; j < arg.length; j++) {
          flags[arg[j]] = true;
        }
      }
    } else {
      args.push(arg);
    }
  }
  
  return { command, args, flags, raw: trimmed };
}

