// Extended file commands (stat, ln, tree, file, etc.)

import { ParsedCommand } from '../commandParser';
import { registerCommand } from './index';
import * as fs from '../filesystem';

// stat command
registerCommand('stat', async (parsed: ParsedCommand, currentDir: string) => {
  const files = parsed.args;
  
  if (files.length === 0) {
    return "stat: missing operand\nTry 'stat --help' for more information.";
  }
  
  const results: string[] = [];
  
  for (const file of files) {
    const node = fs.getNodeAtPath(file, currentDir);
    
    if (!node) {
      results.push(`stat: cannot statx '${file}': No such file or directory`);
      continue;
    }
    
    const normalizedPath = fs.normalizePath(file, currentDir);
    const inode = Math.floor(Math.random() * 1000000) + 100000;
    const links = node.type === 'directory' ? Math.floor(Math.random() * 10) + 2 : 1;
    const blocks = Math.ceil((node.size || 4096) / 512);
    const ioBlock = 4096;
    
    const typeStr = node.type === 'directory' ? 'directory' : 'regular file';
    const perms = node.permissions || (node.type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--');
    const permsOctal = node.type === 'directory' ? '0755' : '0644';
    
    const now = new Date();
    const modified = node.modified ? new Date(node.modified) : now;
    const dateStr = modified.toISOString().replace('T', ' ').split('.')[0] + '.000000000 +0000';
    
    results.push(`  File: ${normalizedPath}`);
    results.push(`  Size: ${node.size || 4096}\t\tBlocks: ${blocks}          IO Block: ${ioBlock} ${typeStr}`);
    results.push(`Device: 259,2\tInode: ${inode}      Links: ${links}`);
    results.push(`Access: (${permsOctal}/${perms})  Uid: (    0/    root)   Gid: (    0/    root)`);
    results.push(`Access: ${dateStr}`);
    results.push(`Modify: ${dateStr}`);
    results.push(`Change: ${dateStr}`);
    results.push(` Birth: -`);
    
    if (files.length > 1) {
      results.push('');
    }
  }
  
  return results;
});

// file command
registerCommand('file', async (parsed: ParsedCommand, currentDir: string) => {
  const files = parsed.args;
  
  if (files.length === 0) {
    return 'Usage: file [-bcCdEhikLlNnprsSvzZ0] [--apple] [--extension] [--mime-encoding]\n            [--mime-type] [-e <testname>] [-F <separator>]  [-f <namefile>]\n            [-m <magicfiles>] [-P <parameter=value>] [--exclude-quiet]\n            <file> ...';
  }
  
  const results: string[] = [];
  
  for (const file of files) {
    const node = fs.getNodeAtPath(file, currentDir);
    
    if (!node) {
      results.push(`${file}: cannot open '${file}' (No such file or directory)`);
      continue;
    }
    
    if (node.type === 'directory') {
      results.push(`${file}: directory`);
      continue;
    }
    
    const content = node.content || '';
    const ext = file.split('.').pop()?.toLowerCase();
    
    let fileType = 'ASCII text';
    
    switch (ext) {
      case 'js':
        fileType = 'JavaScript source, ASCII text';
        break;
      case 'ts':
        fileType = 'TypeScript source, ASCII text';
        break;
      case 'json':
        fileType = 'JSON data';
        break;
      case 'html':
        fileType = 'HTML document, ASCII text';
        break;
      case 'css':
        fileType = 'CSS stylesheet, ASCII text';
        break;
      case 'md':
        fileType = 'UTF-8 Unicode text';
        break;
      case 'sh':
        fileType = 'Bourne-Again shell script, ASCII text executable';
        break;
      case 'py':
        fileType = 'Python script, ASCII text executable';
        break;
      case 'jpg':
      case 'jpeg':
        fileType = 'JPEG image data';
        break;
      case 'png':
        fileType = 'PNG image data';
        break;
      case 'gif':
        fileType = 'GIF image data';
        break;
      case 'pdf':
        fileType = 'PDF document';
        break;
      case 'zip':
        fileType = 'Zip archive data';
        break;
      case 'tar':
        fileType = 'POSIX tar archive';
        break;
      case 'gz':
        fileType = 'gzip compressed data';
        break;
      default:
        if (content.startsWith('#!/')) {
          fileType = `${content.split('\n')[0]} script text executable`;
        } else if (content.trim() === '') {
          fileType = 'empty';
        }
    }
    
    results.push(`${file}: ${fileType}`);
  }
  
  return results;
});

// ln command
registerCommand('ln', async (parsed: ParsedCommand, currentDir: string) => {
  const symbolicFlag = parsed.flags['s'] || parsed.flags['symbolic'];
  const forceFlag = parsed.flags['f'] || parsed.flags['force'];
  
  const source = parsed.args[0];
  const target = parsed.args[1];
  
  if (!source) {
    return "ln: missing file operand\nTry 'ln --help' for more information.";
  }
  
  if (!target) {
    return `ln: missing destination file operand after '${source}'\nTry 'ln --help' for more information.`;
  }
  
  // For symlinks, source doesn't need to exist
  if (!symbolicFlag) {
    const sourceNode = fs.getNodeAtPath(source, currentDir);
    if (!sourceNode) {
      return `ln: failed to access '${source}': No such file or directory`;
    }
  }
  
  // Create the link (simulated)
  return '';
});

// readlink command
registerCommand('readlink', async (parsed: ParsedCommand, currentDir: string) => {
  const canonicalFlag = parsed.flags['f'] || parsed.flags['canonicalize'];
  const file = parsed.args[0];
  
  if (!file) {
    return "readlink: missing operand\nTry 'readlink --help' for more information.";
  }
  
  if (canonicalFlag) {
    return fs.normalizePath(file, currentDir);
  }
  
  // Simulated: pretend no links
  return '';
});

// basename command
registerCommand('basename', async (parsed: ParsedCommand) => {
  const path = parsed.args[0];
  const suffix = parsed.args[1];
  
  if (!path) {
    return "basename: missing operand\nTry 'basename --help' for more information.";
  }
  
  let result = path.split('/').pop() || path;
  
  if (suffix && result.endsWith(suffix)) {
    result = result.slice(0, -suffix.length);
  }
  
  return result;
});

// dirname command
registerCommand('dirname', async (parsed: ParsedCommand) => {
  const path = parsed.args[0];
  
  if (!path) {
    return "dirname: missing operand\nTry 'dirname --help' for more information.";
  }
  
  const parts = path.split('/');
  parts.pop();
  
  if (parts.length === 0) {
    return '.';
  }
  
  if (parts.length === 1 && parts[0] === '') {
    return '/';
  }
  
  return parts.join('/') || '.';
});

// realpath command
registerCommand('realpath', async (parsed: ParsedCommand, currentDir: string) => {
  const files = parsed.args;
  
  if (files.length === 0) {
    return "realpath: missing operand\nTry 'realpath --help' for more information.";
  }
  
  const results: string[] = [];
  
  for (const file of files) {
    const normalized = fs.normalizePath(file, currentDir);
    const node = fs.getNodeAtPath(normalized, '/');
    
    if (!node) {
      results.push(`realpath: ${file}: No such file or directory`);
    } else {
      results.push(normalized);
    }
  }
  
  return results;
});

// tree command
registerCommand('tree', async (parsed: ParsedCommand, currentDir: string) => {
  const path = parsed.args[0] || currentDir;
  const levelFlag = parsed.flags['L'] ? parseInt(String(parsed.flags['L'])) : 3;
  const dirsOnlyFlag = parsed.flags['d'];
  
  const node = fs.getNodeAtPath(path, currentDir);
  
  if (!node) {
    return `${path} [error opening dir]`;
  }
  
  if (node.type !== 'directory') {
    return `${path} [not a directory]`;
  }
  
  const lines: string[] = [path];
  let dirCount = 0;
  let fileCount = 0;
  
  function traverse(node: any, prefix: string, level: number): void {
    if (level > levelFlag || !node.children) return;
    
    const entries = Object.entries(node.children);
    
    entries.forEach(([name, child]: [string, any], index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');
      
      if (child.type === 'directory') {
        dirCount++;
        lines.push(prefix + connector + name);
        traverse(child, nextPrefix, level + 1);
      } else if (!dirsOnlyFlag) {
        fileCount++;
        lines.push(prefix + connector + name);
      }
    });
  }
  
  traverse(node, '', 1);
  
  lines.push('');
  if (dirsOnlyFlag) {
    lines.push(`${dirCount} directories`);
  } else {
    lines.push(`${dirCount} directories, ${fileCount} files`);
  }
  
  return lines;
});

// locate command (simulated)
registerCommand('locate', async (parsed: ParsedCommand) => {
  const pattern = parsed.args[0];
  
  if (!pattern) {
    return 'locate: no pattern to search for specified';
  }
  
  // Simulated results
  const results = [
    `/usr/bin/${pattern}`,
    `/usr/share/${pattern}`,
    `/etc/${pattern}.conf`,
    `/var/log/${pattern}.log`,
  ];
  
  return results.filter(r => r.toLowerCase().includes(pattern.toLowerCase()));
});

// updatedb command (simulated)
registerCommand('updatedb', async () => {
  return '';
});

// md5sum command
registerCommand('md5sum', async (parsed: ParsedCommand, currentDir: string) => {
  const files = parsed.args;
  
  if (files.length === 0) {
    return 'md5sum: missing operand';
  }
  
  const results: string[] = [];
  
  for (const file of files) {
    const content = fs.readFile(file, currentDir);
    
    if (content === null) {
      results.push(`md5sum: ${file}: No such file or directory`);
      continue;
    }
    
    // Simulated MD5 hash (not real)
    const hash = Array(32).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    results.push(`${hash}  ${file}`);
  }
  
  return results;
});

// sha256sum command
registerCommand('sha256sum', async (parsed: ParsedCommand, currentDir: string) => {
  const files = parsed.args;
  
  if (files.length === 0) {
    return 'sha256sum: missing operand';
  }
  
  const results: string[] = [];
  
  for (const file of files) {
    const content = fs.readFile(file, currentDir);
    
    if (content === null) {
      results.push(`sha256sum: ${file}: No such file or directory`);
      continue;
    }
    
    // Simulated SHA256 hash (not real)
    const hash = Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    results.push(`${hash}  ${file}`);
  }
  
  return results;
});

// sha1sum command
registerCommand('sha1sum', async (parsed: ParsedCommand, currentDir: string) => {
  const files = parsed.args;
  
  if (files.length === 0) {
    return 'sha1sum: missing operand';
  }
  
  const results: string[] = [];
  
  for (const file of files) {
    const content = fs.readFile(file, currentDir);
    
    if (content === null) {
      results.push(`sha1sum: ${file}: No such file or directory`);
      continue;
    }
    
    // Simulated SHA1 hash (not real)
    const hash = Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    results.push(`${hash}  ${file}`);
  }
  
  return results;
});

// cksum command
registerCommand('cksum', async (parsed: ParsedCommand, currentDir: string) => {
  const files = parsed.args;
  
  if (files.length === 0) {
    return '';
  }
  
  const results: string[] = [];
  
  for (const file of files) {
    const content = fs.readFile(file, currentDir);
    
    if (content === null) {
      results.push(`cksum: ${file}: No such file or directory`);
      continue;
    }
    
    const checksum = Math.floor(Math.random() * 4294967295);
    results.push(`${checksum} ${content.length} ${file}`);
  }
  
  return results;
});

// touch command (override with more options)
registerCommand('touch', async (parsed: ParsedCommand, currentDir: string) => {
  const files = parsed.args;
  const noCreateFlag = parsed.flags['c'] || parsed.flags['no-create'];
  
  if (files.length === 0) {
    return "touch: missing file operand\nTry 'touch --help' for more information.";
  }
  
  for (const file of files) {
    const exists = fs.getNodeAtPath(file, currentDir);
    
    if (!exists && !noCreateFlag) {
      fs.createFile(file, '', currentDir);
    }
    // Update timestamp (simulated - the filesystem tracks modified)
  }
  
  return '';
});

// chown command
registerCommand('chown', async (parsed: ParsedCommand, currentDir: string) => {
  const recursiveFlag = parsed.flags['R'] || parsed.flags['recursive'];
  const owner = parsed.args[0];
  const files = parsed.args.slice(1);
  
  if (!owner) {
    return "chown: missing operand\nTry 'chown --help' for more information.";
  }
  
  if (files.length === 0) {
    return `chown: missing operand after '${owner}'\nTry 'chown --help' for more information.`;
  }
  
  for (const file of files) {
    const node = fs.getNodeAtPath(file, currentDir);
    if (!node) {
      return `chown: cannot access '${file}': No such file or directory`;
    }
  }
  
  return '';
});

// chgrp command
registerCommand('chgrp', async (parsed: ParsedCommand, currentDir: string) => {
  const recursiveFlag = parsed.flags['R'] || parsed.flags['recursive'];
  const group = parsed.args[0];
  const files = parsed.args.slice(1);
  
  if (!group) {
    return "chgrp: missing operand\nTry 'chgrp --help' for more information.";
  }
  
  if (files.length === 0) {
    return `chgrp: missing operand after '${group}'\nTry 'chgrp --help' for more information.`;
  }
  
  for (const file of files) {
    const node = fs.getNodeAtPath(file, currentDir);
    if (!node) {
      return `chgrp: cannot access '${file}': No such file or directory`;
    }
  }
  
  return '';
});

// chmod command
registerCommand('chmod', async (parsed: ParsedCommand, currentDir: string) => {
  const recursiveFlag = parsed.flags['R'] || parsed.flags['recursive'];
  const mode = parsed.args[0];
  const files = parsed.args.slice(1);
  
  if (!mode) {
    return "chmod: missing operand\nTry 'chmod --help' for more information.";
  }
  
  if (files.length === 0) {
    return `chmod: missing operand after '${mode}'\nTry 'chmod --help' for more information.`;
  }
  
  for (const file of files) {
    const node = fs.getNodeAtPath(file, currentDir);
    if (!node) {
      return `chmod: cannot access '${file}': No such file or directory`;
    }
  }
  
  return '';
});

// install command
registerCommand('install', async (parsed: ParsedCommand) => {
  const source = parsed.args[0];
  const dest = parsed.args[1];
  
  if (!source || !dest) {
    return 'install: missing file operand';
  }
  
  return '';
});

// mkfifo command
registerCommand('mkfifo', async (parsed: ParsedCommand) => {
  const name = parsed.args[0];
  
  if (!name) {
    return "mkfifo: missing operand\nTry 'mkfifo --help' for more information.";
  }
  
  return '';
});

// mknod command
registerCommand('mknod', async (parsed: ParsedCommand) => {
  const name = parsed.args[0];
  const type = parsed.args[1];
  
  if (!name || !type) {
    return "mknod: missing operand\nTry 'mknod --help' for more information.";
  }
  
  return '';
});

// split command
registerCommand('split', async (parsed: ParsedCommand, currentDir: string) => {
  const linesFlag = parsed.flags['l'] ? parseInt(String(parsed.flags['l'])) : 1000;
  const bytesFlag = parsed.flags['b'] ? String(parsed.flags['b']) : null;
  const file = parsed.args[0];
  const prefix = parsed.args[1] || 'x';
  
  if (!file) {
    return "split: missing operand\nTry 'split --help' for more information.";
  }
  
  const content = fs.readFile(file, currentDir);
  if (content === null) {
    return `split: cannot open '${file}' for reading: No such file or directory`;
  }
  
  const lines = content.split('\n');
  const numParts = Math.ceil(lines.length / linesFlag);
  
  const results: string[] = [];
  for (let i = 0; i < numParts; i++) {
    const suffix = String.fromCharCode(97 + Math.floor(i / 26)) + String.fromCharCode(97 + (i % 26));
    results.push(`Creating ${prefix}${suffix}`);
  }
  
  return results;
});

// csplit command
registerCommand('csplit', async (parsed: ParsedCommand) => {
  const file = parsed.args[0];
  
  if (!file) {
    return 'csplit: missing operand';
  }
  
  return '';
});

export {};

