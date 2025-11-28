// Miscellaneous commands (clear, history, alias, export, dd, etc.)

import { ParsedCommand } from '../commandParser';
import { registerCommand } from './registry';
import { getCommandHistory } from '../storage';
import { generateDdProgress } from '../progressBar';

// Storage for environment variables and aliases
function getEnvVars(): { [key: string]: string } {
  if (typeof window === 'undefined') return {};
  const envData = localStorage.getItem('terminal_env');
  return envData ? JSON.parse(envData) : {
    'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    'HOME': '/root',
    'USER': 'root',
    'SHELL': '/bin/bash',
    'TERM': 'xterm-256color',
    'LANG': 'en_US.UTF-8',
    'LC_ALL': 'en_US.UTF-8',
    'EDITOR': 'vim',
    'PWD': '/root',
    'HOSTNAME': 'prod-srv-42',
  };
}

function setEnvVar(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  const env = getEnvVars();
  env[key] = value;
  localStorage.setItem('terminal_env', JSON.stringify(env));
}

function getAliases(): { [key: string]: string } {
  if (typeof window === 'undefined') return {};
  const aliasData = localStorage.getItem('terminal_aliases');
  return aliasData ? JSON.parse(aliasData) : {
    'll': 'ls -la',
    'la': 'ls -A',
    'l': 'ls -CF',
    'grep': 'grep --color=auto',
    'fgrep': 'fgrep --color=auto',
    'egrep': 'egrep --color=auto',
  };
}

function setAlias(name: string, command: string): void {
  if (typeof window === 'undefined') return;
  const aliases = getAliases();
  aliases[name] = command;
  localStorage.setItem('terminal_aliases', JSON.stringify(aliases));
}

// clear command
registerCommand('clear', async () => {
  // Return special marker that Terminal.tsx can handle
  return '__CLEAR__';
});

// reset command
registerCommand('reset', async () => {
  return '__CLEAR__';
});

// history command
registerCommand('history', async (parsed: ParsedCommand) => {
  const clearFlag = parsed.flags['c'] || parsed.flags['clear'];
  
  if (clearFlag) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('terminal_history', JSON.stringify([]));
    }
    return '';
  }
  
  const history = getCommandHistory();
  const numLines = parsed.args[0] ? parseInt(parsed.args[0]) : history.length;
  
  return history.slice(-numLines).map((cmd, index) => 
    `  ${(history.length - numLines + index + 1).toString().padStart(4)}  ${cmd}`
  );
});

// alias command
registerCommand('alias', async (parsed: ParsedCommand) => {
  const args = parsed.args;
  
  if (args.length === 0) {
    // List all aliases
    const aliases = getAliases();
    return Object.entries(aliases).map(([name, cmd]) => `alias ${name}='${cmd}'`);
  }
  
  // Parse alias definition
  const definition = args.join(' ');
  const match = definition.match(/^(\w+)=(.+)$/);
  
  if (match) {
    const name = match[1];
    let command = match[2];
    // Remove surrounding quotes
    if ((command.startsWith("'") && command.endsWith("'")) || 
        (command.startsWith('"') && command.endsWith('"'))) {
      command = command.slice(1, -1);
    }
    setAlias(name, command);
    return '';
  }
  
  // Show specific alias
  const aliases = getAliases();
  if (aliases[args[0]]) {
    return `alias ${args[0]}='${aliases[args[0]]}'`;
  }
  
  return `bash: alias: ${args[0]}: not found`;
});

// unalias command
registerCommand('unalias', async (parsed: ParsedCommand) => {
  const name = parsed.args[0];
  
  if (!name) {
    return 'unalias: usage: unalias [-a] name [name ...]';
  }
  
  const aliases = getAliases();
  if (aliases[name]) {
    delete aliases[name];
    if (typeof window !== 'undefined') {
      localStorage.setItem('terminal_aliases', JSON.stringify(aliases));
    }
    return '';
  }
  
  return `bash: unalias: ${name}: not found`;
});

// export command
registerCommand('export', async (parsed: ParsedCommand) => {
  const args = parsed.args;
  
  if (args.length === 0) {
    // List all environment variables
    const env = getEnvVars();
    return Object.entries(env).map(([key, value]) => `declare -x ${key}="${value}"`);
  }
  
  // Parse VAR=value
  const definition = args.join(' ');
  const match = definition.match(/^(\w+)=(.*)$/);
  
  if (match) {
    const key = match[1];
    let value = match[2];
    // Remove surrounding quotes
    if ((value.startsWith("'") && value.endsWith("'")) || 
        (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    setEnvVar(key, value);
    return '';
  }
  
  return '';
});

// env command
registerCommand('env', async () => {
  const env = getEnvVars();
  return Object.entries(env).map(([key, value]) => `${key}=${value}`);
});

// printenv command
registerCommand('printenv', async (parsed: ParsedCommand) => {
  const varName = parsed.args[0];
  const env = getEnvVars();
  
  if (varName) {
    return env[varName] || '';
  }
  
  return Object.entries(env).map(([key, value]) => `${key}=${value}`);
});

// set command (simplified)
registerCommand('set', async (parsed: ParsedCommand) => {
  if (parsed.args.length === 0) {
    const env = getEnvVars();
    return Object.entries(env).map(([key, value]) => `${key}=${value}`);
  }
  
  return '';
});

// unset command
registerCommand('unset', async (parsed: ParsedCommand) => {
  const varName = parsed.args[0];
  
  if (!varName) {
    return 'unset: usage: unset [-f] [-v] [name ...]';
  }
  
  const env = getEnvVars();
  if (env[varName]) {
    delete env[varName];
    if (typeof window !== 'undefined') {
      localStorage.setItem('terminal_env', JSON.stringify(env));
    }
  }
  
  return '';
});

// which command
registerCommand('which', async (parsed: ParsedCommand) => {
  const command = parsed.args[0];
  
  if (!command) {
    return '';
  }
  
  const builtins = ['cd', 'pwd', 'echo', 'export', 'alias', 'history', 'exit'];
  
  if (builtins.includes(command)) {
    return `${command}: shell built-in command`;
  }
  
  const commonPaths: { [key: string]: string } = {
    'ls': '/usr/bin/ls',
    'cat': '/usr/bin/cat',
    'grep': '/usr/bin/grep',
    'find': '/usr/bin/find',
    'vim': '/usr/bin/vim',
    'nano': '/usr/bin/nano',
    'python': '/usr/bin/python3',
    'python3': '/usr/bin/python3',
    'node': '/usr/bin/node',
    'npm': '/usr/bin/npm',
    'git': '/usr/bin/git',
    'ssh': '/usr/bin/ssh',
    'scp': '/usr/bin/scp',
    'tar': '/usr/bin/tar',
    'gzip': '/usr/bin/gzip',
    'wget': '/usr/bin/wget',
    'curl': '/usr/bin/curl',
    'apt': '/usr/bin/apt',
    'dpkg': '/usr/bin/dpkg',
    'systemctl': '/usr/bin/systemctl',
    'docker': '/usr/bin/docker',
    'bash': '/usr/bin/bash',
    'sh': '/usr/bin/sh',
  };
  
  return commonPaths[command] || `${command} not found`;
});

// whereis command
registerCommand('whereis', async (parsed: ParsedCommand) => {
  const command = parsed.args[0];
  
  if (!command) {
    return 'whereis: usage: whereis [-bms] [-BMS directory... -f] filename...';
  }
  
  return `${command}: /usr/bin/${command} /usr/share/man/man1/${command}.1.gz`;
});

// type command
registerCommand('type', async (parsed: ParsedCommand) => {
  const command = parsed.args[0];
  
  if (!command) {
    return 'type: usage: type [-afptP] name [name ...]';
  }
  
  const builtins = ['cd', 'pwd', 'echo', 'export', 'alias', 'history', 'exit', 'source', 'type'];
  const aliases = getAliases();
  
  if (aliases[command]) {
    return `${command} is aliased to \`${aliases[command]}'`;
  }
  
  if (builtins.includes(command)) {
    return `${command} is a shell builtin`;
  }
  
  return `${command} is /usr/bin/${command}`;
});

// man command
registerCommand('man', async (parsed: ParsedCommand) => {
  const command = parsed.args[0];
  
  if (!command) {
    return 'What manual page do you want?\nFor example, try \'man man\'.';
  }
  
  const manPages: { [key: string]: string[] } = {
    'ls': [
      'LS(1)                            User Commands                           LS(1)',
      '',
      'NAME',
      '       ls - list directory contents',
      '',
      'SYNOPSIS',
      '       ls [OPTION]... [FILE]...',
      '',
      'DESCRIPTION',
      '       List  information  about  the FILEs (the current directory by default).',
      '       Sort entries alphabetically if none of -cftuvSUX nor --sort is specified.',
      '',
      '       -a, --all',
      '              do not ignore entries starting with .',
      '',
      '       -l     use a long listing format',
      '',
      '       -h, --human-readable',
      '              with -l and -s, print sizes like 1K 234M 2G etc.',
      '',
      'Press q to quit',
    ],
    'grep': [
      'GREP(1)                          User Commands                         GREP(1)',
      '',
      'NAME',
      '       grep, egrep, fgrep, rgrep - print lines that match patterns',
      '',
      'SYNOPSIS',
      '       grep [OPTION...] PATTERNS [FILE...]',
      '',
      'DESCRIPTION',
      '       grep searches for PATTERNS in each FILE.',
      '',
      '       -i, --ignore-case',
      '              Ignore case distinctions in patterns and data.',
      '',
      '       -v, --invert-match',
      '              Invert the sense of matching, to select non-matching lines.',
      '',
      '       -r, --recursive',
      '              Read all files under each directory, recursively.',
      '',
      'Press q to quit',
    ],
    'man': [
      'MAN(1)                           Manual pager utils                      MAN(1)',
      '',
      'NAME',
      '       man - an interface to the system reference manuals',
      '',
      'SYNOPSIS',
      '       man [man options] [[section] page ...] ...',
      '',
      'DESCRIPTION',
      '       man  is  the  system\'s  manual  pager.',
      '',
      'Press q to quit',
    ],
  };
  
  if (manPages[command]) {
    return manPages[command];
  }
  
  return [
    `${command.toUpperCase()}(1)                     User Commands                    ${command.toUpperCase()}(1)`,
    '',
    'NAME',
    `       ${command} - ${command} command`,
    '',
    'SYNOPSIS',
    `       ${command} [OPTION]... [FILE]...`,
    '',
    'DESCRIPTION',
    `       The ${command} command performs various operations.`,
    '',
    'Press q to quit',
  ];
});

// apropos command
registerCommand('apropos', async (parsed: ParsedCommand) => {
  const keyword = parsed.args[0];
  
  if (!keyword) {
    return 'apropos what?';
  }
  
  const results = [
    `${keyword} (1)           - ${keyword} related command`,
    `lib${keyword} (3)        - ${keyword} library functions`,
    `${keyword}.conf (5)      - ${keyword} configuration file`,
  ];
  
  return results;
});

// dd command
registerCommand('dd', async (parsed: ParsedCommand) => {
  let inputFile = '';
  let outputFile = '';
  let blockSize = '512';
  let count = 0;
  
  for (const arg of parsed.args) {
    if (arg.startsWith('if=')) {
      inputFile = arg.slice(3);
    } else if (arg.startsWith('of=')) {
      outputFile = arg.slice(3);
    } else if (arg.startsWith('bs=')) {
      blockSize = arg.slice(3);
    } else if (arg.startsWith('count=')) {
      count = parseInt(arg.slice(6));
    }
  }
  
  if (!inputFile && !outputFile) {
    return 'dd: missing input/output file';
  }
  
  return generateDdProgress(inputFile || '/dev/zero', outputFile || '/dev/null', blockSize, count || 100);
});

// tee command
registerCommand('tee', async (parsed: ParsedCommand, currentDir: string) => {
  const appendFlag = parsed.flags['a'] || parsed.flags['append'];
  const files = parsed.args;
  
  if (files.length === 0) {
    return '(stdin input would be written to stdout and files)';
  }
  
  return `(writing to: ${files.join(', ')})`;
});

// xargs command
registerCommand('xargs', async (parsed: ParsedCommand) => {
  const command = parsed.args.join(' ') || 'echo';
  return `(running ${command} with stdin arguments)`;
});

// yes command
registerCommand('yes', async (parsed: ParsedCommand) => {
  const text = parsed.args.join(' ') || 'y';
  return [
    text,
    text,
    text,
    '...',
    '(Press Ctrl+C to stop)',
  ];
});

// true command
registerCommand('true', async () => '');

// false command
registerCommand('false', async () => '');

// test command
registerCommand('test', async (parsed: ParsedCommand) => {
  // Returns empty - the exit code matters (simulated)
  return '';
});

// [ command (test alias)
registerCommand('[', async (parsed: ParsedCommand) => {
  return '';
});

// expr command
registerCommand('expr', async (parsed: ParsedCommand) => {
  const args = parsed.args;
  
  if (args.length < 3) {
    return 'expr: missing operand';
  }
  
  const left = parseInt(args[0]);
  const op = args[1];
  const right = parseInt(args[2]);
  
  switch (op) {
    case '+': return String(left + right);
    case '-': return String(left - right);
    case '*': return String(left * right);
    case '/': return String(Math.floor(left / right));
    case '%': return String(left % right);
    default: return `expr: syntax error: unexpected argument '${op}'`;
  }
});

// bc command (calculator)
registerCommand('bc', async () => {
  return [
    'bc 1.07.1',
    'Copyright 1991-1994, 1997, 1998, 2000, 2004, 2006, 2008, 2012-2017 Free Software Foundation, Inc.',
    'This is free software with ABSOLUTELY NO WARRANTY.',
    'For details type `warranty\'.',
    '',
    '(Interactive calculator - type expressions, quit with Ctrl+D)',
  ];
});

// cal command
registerCommand('cal', async (parsed: ParsedCommand) => {
  const now = new Date();
  const month = parsed.args[0] ? parseInt(parsed.args[0]) : now.getMonth() + 1;
  const year = parsed.args[1] ? parseInt(parsed.args[1]) : now.getFullYear();
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  const header = `    ${monthNames[month - 1]} ${year}`;
  const lines = [
    header,
    'Su Mo Tu We Th Fr Sa',
  ];
  
  let week = '   '.repeat(startDayOfWeek);
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = day.toString().padStart(2, ' ');
    const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
    week += (isToday ? `_${dayStr.trim()}_` : dayStr) + ' ';
    
    if ((startDayOfWeek + day) % 7 === 0 || day === daysInMonth) {
      lines.push(week.trimEnd());
      week = '';
    }
  }
  
  return lines;
});

// date command (override)
registerCommand('date', async (parsed: ParsedCommand) => {
  const formatFlag = parsed.args.find(a => a.startsWith('+'));
  const now = new Date();
  
  if (formatFlag) {
    let format = formatFlag.slice(1);
    format = format
      .replace('%Y', now.getFullYear().toString())
      .replace('%m', String(now.getMonth() + 1).padStart(2, '0'))
      .replace('%d', String(now.getDate()).padStart(2, '0'))
      .replace('%H', String(now.getHours()).padStart(2, '0'))
      .replace('%M', String(now.getMinutes()).padStart(2, '0'))
      .replace('%S', String(now.getSeconds()).padStart(2, '0'))
      .replace('%s', Math.floor(now.getTime() / 1000).toString())
      .replace('%F', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)
      .replace('%T', `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`);
    return format;
  }
  
  return now.toString();
});

// sleep command
registerCommand('sleep', async (parsed: ParsedCommand) => {
  const duration = parsed.args[0];
  
  if (!duration) {
    return 'sleep: missing operand';
  }
  
  return `(sleeping for ${duration} seconds)`;
});

// seq command
registerCommand('seq', async (parsed: ParsedCommand) => {
  const args = parsed.args.map(a => parseInt(a));
  
  let start = 1, end = 1, step = 1;
  
  if (args.length === 1) {
    end = args[0];
  } else if (args.length === 2) {
    start = args[0];
    end = args[1];
  } else if (args.length >= 3) {
    start = args[0];
    step = args[1];
    end = args[2];
  }
  
  const result: string[] = [];
  for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
    result.push(String(i));
    if (result.length > 100) {
      result.push('...');
      break;
    }
  }
  
  return result;
});

// printf command
registerCommand('printf', async (parsed: ParsedCommand) => {
  const format = parsed.args[0] || '';
  const args = parsed.args.slice(1);
  
  let result = format;
  let argIndex = 0;
  
  result = result.replace(/%[sd]/g, () => args[argIndex++] || '');
  result = result.replace(/\\n/g, '\n');
  result = result.replace(/\\t/g, '\t');
  
  return result;
});

// source command
registerCommand('source', async (parsed: ParsedCommand) => {
  const file = parsed.args[0];
  
  if (!file) {
    return 'bash: source: filename argument required';
  }
  
  return `(sourcing ${file})`;
});

// . command (source alias)
registerCommand('.', async (parsed: ParsedCommand) => {
  const file = parsed.args[0];
  
  if (!file) {
    return 'bash: .: filename argument required';
  }
  
  return `(sourcing ${file})`;
});

// exec command
registerCommand('exec', async (parsed: ParsedCommand) => {
  const command = parsed.args.join(' ');
  
  if (!command) {
    return '';
  }
  
  return `(exec ${command})`;
});

// eval command
registerCommand('eval', async (parsed: ParsedCommand) => {
  return `(eval: ${parsed.args.join(' ')})`;
});

// read command
registerCommand('read', async (parsed: ParsedCommand) => {
  const varName = parsed.args[0] || 'REPLY';
  return `(reading input into ${varName})`;
});

export {};

