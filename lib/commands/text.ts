// Text processing commands (head, tail, wc, sort, awk, sed, etc.)

import { ParsedCommand } from '../commandParser';
import { registerCommand } from './registry';
import * as fs from '../filesystem';

// head command
registerCommand('head', async (parsed: ParsedCommand, currentDir: string) => {
  const nLines = parsed.flags['n'] ? parseInt(String(parsed.flags['n'])) : 10;
  const files = parsed.args;
  
  if (files.length === 0) {
    return 'head: missing operand';
  }
  
  const results: string[] = [];
  
  for (const file of files) {
    const content = fs.readFile(file, currentDir);
    
    if (content === null) {
      results.push(`head: cannot open '${file}' for reading: No such file or directory`);
      continue;
    }
    
    if (files.length > 1) {
      results.push(`==> ${file} <==`);
    }
    
    const lines = content.split('\n').slice(0, nLines);
    results.push(...lines);
    
    if (files.length > 1) {
      results.push('');
    }
  }
  
  return results;
});

// tail command
registerCommand('tail', async (parsed: ParsedCommand, currentDir: string) => {
  const nLines = parsed.flags['n'] ? parseInt(String(parsed.flags['n'])) : 10;
  const followFlag = parsed.flags['f'] || parsed.flags['follow'];
  const files = parsed.args;
  
  if (files.length === 0) {
    return 'tail: missing operand';
  }
  
  const results: string[] = [];
  
  for (const file of files) {
    const content = fs.readFile(file, currentDir);
    
    if (content === null) {
      results.push(`tail: cannot open '${file}' for reading: No such file or directory`);
      continue;
    }
    
    if (files.length > 1) {
      results.push(`==> ${file} <==`);
    }
    
    const allLines = content.split('\n');
    const lines = allLines.slice(-nLines);
    results.push(...lines);
    
    if (files.length > 1) {
      results.push('');
    }
  }
  
  if (followFlag) {
    results.push('');
    results.push('(Following file - press Ctrl+C to exit)');
  }
  
  return results;
});

// wc command
registerCommand('wc', async (parsed: ParsedCommand, currentDir: string) => {
  const linesFlag = parsed.flags['l'] || parsed.flags['lines'];
  const wordsFlag = parsed.flags['w'] || parsed.flags['words'];
  const charsFlag = parsed.flags['c'] || parsed.flags['bytes'] || parsed.flags['m'];
  
  const files = parsed.args;
  
  if (files.length === 0) {
    return 'wc: missing operand';
  }
  
  const showAll = !linesFlag && !wordsFlag && !charsFlag;
  const results: string[] = [];
  let totalLines = 0, totalWords = 0, totalChars = 0;
  
  for (const file of files) {
    const content = fs.readFile(file, currentDir);
    
    if (content === null) {
      results.push(`wc: ${file}: No such file or directory`);
      continue;
    }
    
    const lines = content.split('\n').length;
    const words = content.split(/\s+/).filter(w => w.length > 0).length;
    const chars = content.length;
    
    totalLines += lines;
    totalWords += words;
    totalChars += chars;
    
    let line = '';
    if (showAll || linesFlag) line += lines.toString().padStart(8);
    if (showAll || wordsFlag) line += words.toString().padStart(8);
    if (showAll || charsFlag) line += chars.toString().padStart(8);
    line += ' ' + file;
    
    results.push(line);
  }
  
  if (files.length > 1) {
    let total = '';
    if (showAll || linesFlag) total += totalLines.toString().padStart(8);
    if (showAll || wordsFlag) total += totalWords.toString().padStart(8);
    if (showAll || charsFlag) total += totalChars.toString().padStart(8);
    total += ' total';
    results.push(total);
  }
  
  return results;
});

// sort command
registerCommand('sort', async (parsed: ParsedCommand, currentDir: string) => {
  const reverseFlag = parsed.flags['r'] || parsed.flags['reverse'];
  const numericFlag = parsed.flags['n'] || parsed.flags['numeric-sort'];
  const uniqueFlag = parsed.flags['u'] || parsed.flags['unique'];
  
  const files = parsed.args;
  
  if (files.length === 0) {
    return 'sort: missing operand';
  }
  
  let allLines: string[] = [];
  
  for (const file of files) {
    const content = fs.readFile(file, currentDir);
    
    if (content === null) {
      return `sort: cannot read: ${file}: No such file or directory`;
    }
    
    allLines.push(...content.split('\n').filter(l => l.length > 0));
  }
  
  if (numericFlag) {
    allLines.sort((a, b) => parseFloat(a) - parseFloat(b));
  } else {
    allLines.sort();
  }
  
  if (reverseFlag) {
    allLines.reverse();
  }
  
  if (uniqueFlag) {
    allLines = [...new Set(allLines)];
  }
  
  return allLines;
});

// uniq command
registerCommand('uniq', async (parsed: ParsedCommand, currentDir: string) => {
  const countFlag = parsed.flags['c'] || parsed.flags['count'];
  const duplicatesFlag = parsed.flags['d'] || parsed.flags['repeated'];
  const uniqueOnlyFlag = parsed.flags['u'] || parsed.flags['unique'];
  
  const file = parsed.args[0];
  
  if (!file) {
    return 'uniq: missing operand';
  }
  
  const content = fs.readFile(file, currentDir);
  
  if (content === null) {
    return `uniq: ${file}: No such file or directory`;
  }
  
  const lines = content.split('\n');
  const counts: { [key: string]: number } = {};
  const order: string[] = [];
  
  let prev = '';
  for (const line of lines) {
    if (line !== prev) {
      if (!counts[line]) {
        order.push(line);
        counts[line] = 0;
      }
      counts[line]++;
      prev = line;
    } else {
      counts[line]++;
    }
  }
  
  const results: string[] = [];
  
  for (const line of order) {
    if (duplicatesFlag && counts[line] < 2) continue;
    if (uniqueOnlyFlag && counts[line] > 1) continue;
    
    if (countFlag) {
      results.push(`${counts[line].toString().padStart(7)} ${line}`);
    } else {
      results.push(line);
    }
  }
  
  return results;
});

// cut command
registerCommand('cut', async (parsed: ParsedCommand, currentDir: string) => {
  const delimiter = parsed.flags['d'] ? String(parsed.flags['d']) : '\t';
  const fields = parsed.flags['f'] ? String(parsed.flags['f']) : '';
  const chars = parsed.flags['c'] ? String(parsed.flags['c']) : '';
  
  const files = parsed.args;
  
  if (!fields && !chars) {
    return 'cut: you must specify a list of bytes, characters, or fields';
  }
  
  if (files.length === 0) {
    return 'cut: missing operand';
  }
  
  const results: string[] = [];
  
  for (const file of files) {
    const content = fs.readFile(file, currentDir);
    
    if (content === null) {
      results.push(`cut: ${file}: No such file or directory`);
      continue;
    }
    
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (fields) {
        const parts = line.split(delimiter);
        const fieldNums = fields.split(',').map(f => parseInt(f) - 1);
        const selected = fieldNums.map(i => parts[i] || '').join(delimiter);
        results.push(selected);
      } else if (chars) {
        const charRange = chars.split('-');
        if (charRange.length === 2) {
          const start = parseInt(charRange[0]) - 1;
          const end = parseInt(charRange[1]);
          results.push(line.substring(start, end));
        } else {
          const charNums = chars.split(',').map(c => parseInt(c) - 1);
          const selected = charNums.map(i => line[i] || '').join('');
          results.push(selected);
        }
      }
    }
  }
  
  return results;
});

// tr command
registerCommand('tr', async (parsed: ParsedCommand) => {
  const deleteFlag = parsed.flags['d'] || parsed.flags['delete'];
  const squeezeFlag = parsed.flags['s'] || parsed.flags['squeeze-repeats'];
  
  const set1 = parsed.args[0] || '';
  const set2 = parsed.args[1] || '';
  
  if (!set1) {
    return 'tr: missing operand';
  }
  
  // Simulate tr behavior
  const examples = [
    `Example: echo "hello" | tr 'a-z' 'A-Z' => HELLO`,
    `Example: echo "hello  world" | tr -s ' ' => hello world`,
    `Example: echo "hello123" | tr -d '0-9' => hello`,
  ];
  
  return [
    `tr: translates or deletes characters`,
    `Set1: '${set1}'`,
    set2 ? `Set2: '${set2}'` : '',
    '',
    ...examples,
  ].filter(Boolean);
});

// awk command (simplified)
registerCommand('awk', async (parsed: ParsedCommand, currentDir: string) => {
  const program = parsed.args[0] || '';
  const files = parsed.args.slice(1);
  
  if (!program) {
    return 'usage: awk [-F fs] [-v var=value] [\'prog\' | -f progfile] [file ...]';
  }
  
  // Parse common awk patterns
  if (program.includes('print')) {
    const printMatch = program.match(/\{print \$(\d+)\}/);
    if (printMatch) {
      const fieldNum = parseInt(printMatch[1]);
      
      if (files.length > 0) {
        const results: string[] = [];
        for (const file of files) {
          const content = fs.readFile(file, currentDir);
          if (content === null) {
            results.push(`awk: can't open file ${file}`);
            continue;
          }
          
          const lines = content.split('\n');
          for (const line of lines) {
            const fields = line.split(/\s+/);
            if (fieldNum === 0) {
              results.push(line);
            } else if (fields[fieldNum - 1]) {
              results.push(fields[fieldNum - 1]);
            }
          }
        }
        return results;
      }
    }
    
    // NF (number of fields)
    if (program.includes('NF')) {
      return [
        '# awk with NF (Number of Fields)',
        '# Example: awk \'{print NF}\' file.txt',
        '# Prints the number of fields in each line',
      ];
    }
    
    // NR (record number)
    if (program.includes('NR')) {
      return [
        '# awk with NR (Record Number)',
        '# Example: awk \'{print NR, $0}\' file.txt',
        '# Prints line numbers with content',
      ];
    }
  }
  
  return [
    `awk: executing program '${program}'`,
    '(Input from stdin or files)',
  ];
});

// sed command (simplified)
registerCommand('sed', async (parsed: ParsedCommand, currentDir: string) => {
  const inPlaceFlag = parsed.flags['i'];
  const program = parsed.args[0] || '';
  const files = parsed.args.slice(1);
  
  if (!program) {
    return 'usage: sed [-Ealnru] [-e command] [-f command_file] [-i extension] [file ...]';
  }
  
  // Parse s/pattern/replacement/ syntax
  const subMatch = program.match(/s\/([^\/]*)\/([^\/]*)\/([gip]*)/);
  
  if (subMatch) {
    const [, pattern, replacement, flags] = subMatch;
    
    if (files.length > 0) {
      const results: string[] = [];
      for (const file of files) {
        const content = fs.readFile(file, currentDir);
        if (content === null) {
          results.push(`sed: can't read ${file}: No such file or directory`);
          continue;
        }
        
        const regex = new RegExp(pattern, flags.includes('g') ? 'g' : '');
        const lines = content.split('\n');
        for (const line of lines) {
          results.push(line.replace(regex, replacement));
        }
      }
      return results;
    }
    
    return `sed: substituting '${pattern}' with '${replacement}'`;
  }
  
  // Delete lines: d command
  if (program.match(/^\d+d$/)) {
    const lineNum = parseInt(program);
    return `sed: deleting line ${lineNum}`;
  }
  
  // Print specific lines: p command
  if (program.match(/^\d+p$/)) {
    const lineNum = parseInt(program);
    return `sed: printing line ${lineNum}`;
  }
  
  return `sed: executing '${program}'`;
});

// diff command
registerCommand('diff', async (parsed: ParsedCommand, currentDir: string) => {
  const unifiedFlag = parsed.flags['u'] || parsed.flags['unified'];
  const sideFlag = parsed.flags['y'] || parsed.flags['side-by-side'];
  
  const file1 = parsed.args[0];
  const file2 = parsed.args[1];
  
  if (!file1 || !file2) {
    return 'diff: missing operand after \'diff\'';
  }
  
  const content1 = fs.readFile(file1, currentDir);
  const content2 = fs.readFile(file2, currentDir);
  
  if (content1 === null) {
    return `diff: ${file1}: No such file or directory`;
  }
  
  if (content2 === null) {
    return `diff: ${file2}: No such file or directory`;
  }
  
  if (content1 === content2) {
    return '';
  }
  
  const lines1 = content1.split('\n');
  const lines2 = content2.split('\n');
  
  if (unifiedFlag) {
    return [
      `--- ${file1}	2024-01-15 10:30:00.000000000 +0000`,
      `+++ ${file2}	2024-01-15 10:35:00.000000000 +0000`,
      '@@ -1,' + lines1.length + ' +1,' + lines2.length + ' @@',
      ...lines1.slice(0, 3).map(l => '-' + l),
      ...lines2.slice(0, 3).map(l => '+' + l),
    ];
  }
  
  return [
    `1,${lines1.length}c1,${lines2.length}`,
    ...lines1.slice(0, 3).map(l => '< ' + l),
    '---',
    ...lines2.slice(0, 3).map(l => '> ' + l),
  ];
});

// comm command
registerCommand('comm', async (parsed: ParsedCommand, currentDir: string) => {
  const file1 = parsed.args[0];
  const file2 = parsed.args[1];
  
  if (!file1 || !file2) {
    return 'comm: missing operand';
  }
  
  const content1 = fs.readFile(file1, currentDir);
  const content2 = fs.readFile(file2, currentDir);
  
  if (content1 === null) {
    return `comm: ${file1}: No such file or directory`;
  }
  
  if (content2 === null) {
    return `comm: ${file2}: No such file or directory`;
  }
  
  const lines1 = new Set(content1.split('\n'));
  const lines2 = new Set(content2.split('\n'));
  
  const only1 = [...lines1].filter(l => !lines2.has(l));
  const only2 = [...lines2].filter(l => !lines1.has(l));
  const both = [...lines1].filter(l => lines2.has(l));
  
  const results: string[] = [];
  
  only1.forEach(l => results.push(l));
  only2.forEach(l => results.push('\t' + l));
  both.forEach(l => results.push('\t\t' + l));
  
  return results;
});

// paste command
registerCommand('paste', async (parsed: ParsedCommand, currentDir: string) => {
  const delimiter = parsed.flags['d'] ? String(parsed.flags['d']) : '\t';
  const files = parsed.args;
  
  if (files.length === 0) {
    return 'paste: missing operand';
  }
  
  const fileContents: string[][] = [];
  let maxLines = 0;
  
  for (const file of files) {
    const content = fs.readFile(file, currentDir);
    if (content === null) {
      return `paste: ${file}: No such file or directory`;
    }
    const lines = content.split('\n');
    fileContents.push(lines);
    maxLines = Math.max(maxLines, lines.length);
  }
  
  const results: string[] = [];
  
  for (let i = 0; i < maxLines; i++) {
    const lineParts = fileContents.map(fc => fc[i] || '');
    results.push(lineParts.join(delimiter));
  }
  
  return results;
});

// join command
registerCommand('join', async (parsed: ParsedCommand, currentDir: string) => {
  const file1 = parsed.args[0];
  const file2 = parsed.args[1];
  
  if (!file1 || !file2) {
    return 'join: missing operand';
  }
  
  return [
    `join: joining ${file1} and ${file2} on first field`,
    '(Files must be sorted on join fields)',
  ];
});

// less command
registerCommand('less', async (parsed: ParsedCommand, currentDir: string) => {
  const file = parsed.args[0];
  
  if (!file) {
    return 'Missing filename ("less --help" for help)';
  }
  
  const content = fs.readFile(file, currentDir);
  
  if (content === null) {
    return `${file}: No such file or directory`;
  }
  
  const lines = content.split('\n');
  return [
    ...lines.slice(0, 20),
    '',
    ':',
    '(END) - Press q to quit, h for help',
  ];
});

// more command
registerCommand('more', async (parsed: ParsedCommand, currentDir: string) => {
  const file = parsed.args[0];
  
  if (!file) {
    return 'usage: more [-dflpcsu] [+linenum | +/pattern] name1 name2 ...';
  }
  
  const content = fs.readFile(file, currentDir);
  
  if (content === null) {
    return `${file}: No such file or directory`;
  }
  
  const lines = content.split('\n');
  return [
    ...lines.slice(0, 20),
    '--More--(50%)',
  ];
});

// rev command
registerCommand('rev', async (parsed: ParsedCommand, currentDir: string) => {
  const files = parsed.args;
  
  if (files.length === 0) {
    return 'rev: (stdin) - waiting for input';
  }
  
  const results: string[] = [];
  
  for (const file of files) {
    const content = fs.readFile(file, currentDir);
    if (content === null) {
      results.push(`rev: cannot open ${file}: No such file or directory`);
      continue;
    }
    
    const lines = content.split('\n');
    results.push(...lines.map(l => l.split('').reverse().join('')));
  }
  
  return results;
});

// tac command (reverse cat)
registerCommand('tac', async (parsed: ParsedCommand, currentDir: string) => {
  const files = parsed.args;
  
  if (files.length === 0) {
    return 'tac: missing operand';
  }
  
  const results: string[] = [];
  
  for (const file of files) {
    const content = fs.readFile(file, currentDir);
    if (content === null) {
      results.push(`tac: cannot open '${file}' for reading: No such file or directory`);
      continue;
    }
    
    const lines = content.split('\n').reverse();
    results.push(...lines);
  }
  
  return results;
});

// nl command (number lines)
registerCommand('nl', async (parsed: ParsedCommand, currentDir: string) => {
  const files = parsed.args;
  
  if (files.length === 0) {
    return 'nl: missing operand';
  }
  
  const results: string[] = [];
  let lineNum = 1;
  
  for (const file of files) {
    const content = fs.readFile(file, currentDir);
    if (content === null) {
      results.push(`nl: cannot open '${file}' for reading: No such file or directory`);
      continue;
    }
    
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        results.push(`     ${lineNum}\t${line}`);
        lineNum++;
      } else {
        results.push('');
      }
    }
  }
  
  return results;
});

// expand command (tabs to spaces)
registerCommand('expand', async (parsed: ParsedCommand, currentDir: string) => {
  const tabSize = parsed.flags['t'] ? parseInt(String(parsed.flags['t'])) : 8;
  const files = parsed.args;
  
  if (files.length === 0) {
    return 'expand: missing operand';
  }
  
  const results: string[] = [];
  
  for (const file of files) {
    const content = fs.readFile(file, currentDir);
    if (content === null) {
      results.push(`expand: ${file}: No such file or directory`);
      continue;
    }
    
    const lines = content.split('\n');
    results.push(...lines.map(l => l.replace(/\t/g, ' '.repeat(tabSize))));
  }
  
  return results;
});

// unexpand command (spaces to tabs)
registerCommand('unexpand', async (parsed: ParsedCommand, currentDir: string) => {
  const tabSize = parsed.flags['t'] ? parseInt(String(parsed.flags['t'])) : 8;
  const files = parsed.args;
  
  if (files.length === 0) {
    return 'unexpand: missing operand';
  }
  
  const results: string[] = [];
  
  for (const file of files) {
    const content = fs.readFile(file, currentDir);
    if (content === null) {
      results.push(`unexpand: ${file}: No such file or directory`);
      continue;
    }
    
    const lines = content.split('\n');
    const spaces = ' '.repeat(tabSize);
    results.push(...lines.map(l => l.replace(new RegExp(spaces, 'g'), '\t')));
  }
  
  return results;
});

export {};

