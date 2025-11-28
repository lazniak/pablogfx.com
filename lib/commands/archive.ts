// Archive commands (tar, zip, gzip, etc.)

import { ParsedCommand } from '../commandParser';
import { registerCommand, getCommandHandler } from './registry';
import * as fs from '../filesystem';

// tar command
registerCommand('tar', async (parsed: ParsedCommand, currentDir: string) => {
  const createFlag = parsed.flags['c'] || parsed.flags['create'];
  const extractFlag = parsed.flags['x'] || parsed.flags['extract'];
  const listFlag = parsed.flags['t'] || parsed.flags['list'];
  const verboseFlag = parsed.flags['v'] || parsed.flags['verbose'];
  const fileFlag = parsed.flags['f'] || parsed.flags['file'];
  const gzipFlag = parsed.flags['z'] || parsed.flags['gzip'];
  const bzip2Flag = parsed.flags['j'] || parsed.flags['bzip2'];
  const xzFlag = parsed.flags['J'] || parsed.flags['xz'];
  
  const archiveName = parsed.args[0];
  const files = parsed.args.slice(1);
  
  if (!archiveName && !listFlag) {
    return `tar: You must specify one of the '-Acdtrux', '--delete' or '--test-label' options
Try 'tar --help' or 'tar --usage' for more information.`;
  }
  
  if (createFlag) {
    if (files.length === 0) {
      return 'tar: Cowardly refusing to create an empty archive\nTry \'tar --help\' or \'tar --usage\' for more information.';
    }
    
    const lines: string[] = [];
    const compression = gzipFlag ? 'gzip' : bzip2Flag ? 'bzip2' : xzFlag ? 'xz' : 'none';
    
    if (verboseFlag) {
      files.forEach(f => {
        lines.push(f);
      });
    }
    
    // Simulate progress for large operations
    if (files.length > 2) {
      const totalSize = files.length * Math.floor(Math.random() * 1000 + 100);
      for (let i = 1; i <= 5; i++) {
        const percent = i * 20;
        lines.push(`__PROGRESS__Creating archive: ${percent}%`);
      }
    }
    
    return lines.length > 0 ? lines : '';
  }
  
  if (extractFlag) {
    const lines: string[] = [];
    
    // Simulate extraction
    const simulatedFiles = [
      'package.json',
      'src/',
      'src/index.ts',
      'src/utils/',
      'src/utils/helpers.ts',
      'README.md',
      'tsconfig.json',
    ];
    
    if (verboseFlag) {
      simulatedFiles.forEach(f => {
        lines.push(f);
      });
    }
    
    // Progress for extraction
    for (let i = 1; i <= 5; i++) {
      const percent = i * 20;
      lines.push(`__PROGRESS__Extracting: ${percent}%`);
    }
    
    return lines.length > 0 ? lines : '';
  }
  
  if (listFlag) {
    return [
      '-rw-r--r-- root/root       1234 2024-01-15 10:30 package.json',
      'drwxr-xr-x root/root          0 2024-01-15 10:30 src/',
      '-rw-r--r-- root/root       5678 2024-01-15 10:30 src/index.ts',
      'drwxr-xr-x root/root          0 2024-01-15 10:30 src/utils/',
      '-rw-r--r-- root/root       2345 2024-01-15 10:30 src/utils/helpers.ts',
      '-rw-r--r-- root/root        890 2024-01-15 10:30 README.md',
      '-rw-r--r-- root/root        456 2024-01-15 10:30 tsconfig.json',
    ];
  }
  
  return '';
});

// gzip command
registerCommand('gzip', async (parsed: ParsedCommand, currentDir: string) => {
  const decompressFlag = parsed.flags['d'] || parsed.flags['decompress'];
  const keepFlag = parsed.flags['k'] || parsed.flags['keep'];
  const verboseFlag = parsed.flags['v'] || parsed.flags['verbose'];
  const listFlag = parsed.flags['l'] || parsed.flags['list'];
  
  const files = parsed.args;
  
  if (files.length === 0) {
    return 'gzip: compressed data not read from a terminal. Use -f to force compression.\nFor help, type: gzip -h';
  }
  
  if (listFlag) {
    const lines = ['         compressed        uncompressed  ratio uncompressed_name'];
    files.forEach(f => {
      const compressed = Math.floor(Math.random() * 5000 + 1000);
      const uncompressed = Math.floor(compressed * (1 + Math.random() * 2));
      const ratio = ((1 - compressed / uncompressed) * 100).toFixed(1);
      lines.push(`               ${compressed}                ${uncompressed}  ${ratio}% ${f.replace('.gz', '')}`);
    });
    return lines;
  }
  
  const results: string[] = [];
  
  for (const file of files) {
    if (decompressFlag) {
      if (!file.endsWith('.gz')) {
        results.push(`gzip: ${file}: unknown suffix -- ignored`);
        continue;
      }
      if (verboseFlag) {
        const ratio = (Math.random() * 70 + 10).toFixed(1);
        results.push(`${file}:	 ${ratio}% -- replaced with ${file.replace('.gz', '')}`);
      }
    } else {
      if (verboseFlag) {
        const ratio = (Math.random() * 70 + 10).toFixed(1);
        results.push(`${file}:	 ${ratio}% -- replaced with ${file}.gz`);
      }
    }
  }
  
  return results.length > 0 ? results : '';
});

// gunzip command
registerCommand('gunzip', async (parsed: ParsedCommand) => {
  const files = parsed.args;
  const verboseFlag = parsed.flags['v'] || parsed.flags['verbose'];
  
  if (files.length === 0) {
    return 'gzip: compressed data not read from a terminal.';
  }
  
  const results: string[] = [];
  
  for (const file of files) {
    if (!file.endsWith('.gz')) {
      results.push(`gzip: ${file}: unknown suffix -- ignored`);
      continue;
    }
    if (verboseFlag) {
      const ratio = (Math.random() * 70 + 10).toFixed(1);
      results.push(`${file}:	 ${ratio}% -- replaced with ${file.replace('.gz', '')}`);
    }
  }
  
  return results.length > 0 ? results : '';
});

// zip command
registerCommand('zip', async (parsed: ParsedCommand) => {
  const recursiveFlag = parsed.flags['r'] || parsed.flags['recurse-paths'];
  const quietFlag = parsed.flags['q'] || parsed.flags['quiet'];
  
  const zipFile = parsed.args[0];
  const files = parsed.args.slice(1);
  
  if (!zipFile) {
    return `Copyright (c) 1990-2008 Info-ZIP - Type 'zip "-L"' for software license.
Zip 3.0 (July 5th 2008). Usage:
zip [-options] [-b path] [-t mmddyyyy] [-n suffixes] [zipfile list] [-xi list]`;
  }
  
  if (files.length === 0) {
    return 'zip error: Nothing to do!';
  }
  
  const lines: string[] = [];
  
  if (!quietFlag) {
    if (recursiveFlag) {
      lines.push(`  adding: ${files[0]}/ (stored 0%)`);
      lines.push(`  adding: ${files[0]}/file1.txt (deflated 45%)`);
      lines.push(`  adding: ${files[0]}/file2.txt (deflated 52%)`);
      lines.push(`  adding: ${files[0]}/subdir/ (stored 0%)`);
      lines.push(`  adding: ${files[0]}/subdir/file3.txt (deflated 38%)`);
    } else {
      files.forEach(f => {
        const method = Math.random() > 0.5 ? 'deflated' : 'stored';
        const ratio = method === 'deflated' ? Math.floor(Math.random() * 70 + 10) : 0;
        lines.push(`  adding: ${f} (${method} ${ratio}%)`);
      });
    }
  }
  
  return lines;
});

// unzip command
registerCommand('unzip', async (parsed: ParsedCommand) => {
  const listFlag = parsed.flags['l'] || parsed.flags['list'];
  const quietFlag = parsed.flags['q'] || parsed.flags['quiet'];
  const testFlag = parsed.flags['t'] || parsed.flags['test'];
  
  const zipFile = parsed.args[0];
  
  if (!zipFile) {
    return `UnZip 6.00 of 20 April 2009, by Debian. Original by Info-ZIP.
Usage: unzip [-Z] [-opts[modifiers]] file[.zip] [list] [-x xlist] [-d exdir]`;
  }
  
  if (listFlag) {
    return [
      `Archive:  ${zipFile}`,
      '  Length      Date    Time    Name',
      '---------  ---------- -----   ----',
      '     1234  2024-01-15 10:30   package.json',
      '     5678  2024-01-15 10:30   src/index.ts',
      '     2345  2024-01-15 10:30   src/utils/helpers.ts',
      '      890  2024-01-15 10:30   README.md',
      '---------                     -------',
      '    10147                     4 files',
    ];
  }
  
  if (testFlag) {
    return [
      `Archive:  ${zipFile}`,
      '    testing: package.json            OK',
      '    testing: src/index.ts            OK',
      '    testing: src/utils/helpers.ts    OK',
      '    testing: README.md               OK',
      'No errors detected in compressed data of ' + zipFile + '.',
    ];
  }
  
  const lines: string[] = [`Archive:  ${zipFile}`];
  
  if (!quietFlag) {
    lines.push('  inflating: package.json');
    lines.push('   creating: src/');
    lines.push('  inflating: src/index.ts');
    lines.push('   creating: src/utils/');
    lines.push('  inflating: src/utils/helpers.ts');
    lines.push('  inflating: README.md');
  }
  
  return lines;
});

// bzip2 command
registerCommand('bzip2', async (parsed: ParsedCommand) => {
  const decompressFlag = parsed.flags['d'] || parsed.flags['decompress'];
  const keepFlag = parsed.flags['k'] || parsed.flags['keep'];
  const verboseFlag = parsed.flags['v'] || parsed.flags['verbose'];
  
  const files = parsed.args;
  
  if (files.length === 0) {
    return 'bzip2: I won\'t read compressed data from a terminal.';
  }
  
  const results: string[] = [];
  
  for (const file of files) {
    if (decompressFlag) {
      if (!file.endsWith('.bz2')) {
        results.push(`bzip2: Can't guess original name for ${file} -- using ${file}.out`);
        continue;
      }
      if (verboseFlag) {
        const ratio = (Math.random() * 70 + 20).toFixed(2);
        results.push(`  ${file}: done, ratio: ${ratio}%`);
      }
    } else {
      if (verboseFlag) {
        const ratio = (Math.random() * 70 + 20).toFixed(2);
        results.push(`  ${file}: ${ratio}% ratio, ${file}.bz2`);
      }
    }
  }
  
  return results.length > 0 ? results : '';
});

// bunzip2 command
registerCommand('bunzip2', async (parsed: ParsedCommand) => {
  const handler = getCommandHandler('bzip2');
  if (handler) {
    return handler({ ...parsed, flags: { ...parsed.flags, d: true } }, '');
  }
  return '';
});

// xz command
registerCommand('xz', async (parsed: ParsedCommand) => {
  const decompressFlag = parsed.flags['d'] || parsed.flags['decompress'];
  const keepFlag = parsed.flags['k'] || parsed.flags['keep'];
  const verboseFlag = parsed.flags['v'] || parsed.flags['verbose'];
  const listFlag = parsed.flags['l'] || parsed.flags['list'];
  
  const files = parsed.args;
  
  if (files.length === 0) {
    return 'xz: Compressed data cannot be read from a terminal';
  }
  
  if (listFlag) {
    const lines = ['Strms  Blocks   Compressed Uncompressed  Ratio  Check   Filename'];
    files.forEach(f => {
      const compressed = Math.floor(Math.random() * 5000 + 1000);
      const uncompressed = Math.floor(compressed * (1 + Math.random() * 3));
      const ratio = ((compressed / uncompressed) * 100).toFixed(1);
      lines.push(`    1       1      ${compressed} B      ${uncompressed} B  ${ratio}%  CRC64   ${f}`);
    });
    return lines;
  }
  
  const results: string[] = [];
  
  for (const file of files) {
    if (verboseFlag) {
      const ratio = (Math.random() * 70 + 20).toFixed(1);
      if (decompressFlag) {
        results.push(`${file} (${ratio}%) -> ${file.replace('.xz', '')}`);
      } else {
        results.push(`${file} (${ratio}%) -> ${file}.xz`);
      }
    }
  }
  
  return results.length > 0 ? results : '';
});

// unxz command
registerCommand('unxz', async (parsed: ParsedCommand) => {
  const handler = getCommandHandler('xz');
  if (handler) {
    return handler({ ...parsed, flags: { ...parsed.flags, d: true } }, '');
  }
  return '';
});

// 7z command
registerCommand('7z', async (parsed: ParsedCommand) => {
  const command = parsed.args[0];
  const archive = parsed.args[1];
  const files = parsed.args.slice(2);
  
  if (!command) {
    return `
7-Zip [64] 16.02 : Copyright (c) 1999-2016 Igor Pavlov : 2016-05-21
p7zip Version 16.02

Usage: 7z <command> [<switches>...] <archive_name> [<file_names>...] [@listfile]

<Commands>
  a : Add files to archive
  b : Benchmark
  d : Delete files from archive
  e : Extract files from archive (without using directory names)
  h : Calculate hash values for files
  i : Show information about supported formats
  l : List contents of archive
  rn : Rename files in archive
  t : Test integrity of archive
  u : Update files to archive
  x : eXtract files with full paths`;
  }
  
  switch (command) {
    case 'a':
      if (!archive) return '7-Zip: archive name required';
      return [
        '',
        '7-Zip [64] 16.02 : Copyright (c) 1999-2016 Igor Pavlov : 2016-05-21',
        '',
        'Scanning the drive:',
        `${files.length || 5} files, ${Math.floor(Math.random() * 100000 + 10000)} bytes`,
        '',
        'Creating archive: ' + archive,
        '',
        'Items to compress: ' + (files.length || 5),
        '',
        'Files read from disk: ' + (files.length || 5),
        'Archive size: ' + Math.floor(Math.random() * 50000 + 5000) + ' bytes',
        '',
        'Everything is Ok',
      ];
    
    case 'x':
    case 'e':
      if (!archive) return '7-Zip: archive name required';
      return [
        '',
        '7-Zip [64] 16.02 : Copyright (c) 1999-2016 Igor Pavlov : 2016-05-21',
        '',
        `Processing archive: ${archive}`,
        '',
        'Extracting  package.json',
        'Extracting  src/index.ts',
        'Extracting  README.md',
        '',
        'Everything is Ok',
        '',
        'Files: 3',
        'Size:       ' + Math.floor(Math.random() * 50000 + 5000),
        'Compressed: ' + Math.floor(Math.random() * 20000 + 2000),
      ];
    
    case 'l':
      if (!archive) return '7-Zip: archive name required';
      return [
        '',
        '7-Zip [64] 16.02 : Copyright (c) 1999-2016 Igor Pavlov : 2016-05-21',
        '',
        `Listing archive: ${archive}`,
        '',
        '   Date      Time    Attr         Size   Compressed  Name',
        '------------------- ----- ------------ ------------  ------------------------',
        '2024-01-15 10:30:00 ....A         1234          890  package.json',
        '2024-01-15 10:30:00 ....A         5678         3456  src/index.ts',
        '2024-01-15 10:30:00 ....A          890          567  README.md',
        '------------------- ----- ------------ ------------  ------------------------',
        '2024-01-15 10:30:00               7802         4913  3 files',
      ];
    
    case 't':
      if (!archive) return '7-Zip: archive name required';
      return [
        '',
        '7-Zip [64] 16.02 : Copyright (c) 1999-2016 Igor Pavlov : 2016-05-21',
        '',
        `Processing archive: ${archive}`,
        '',
        'Testing     package.json',
        'Testing     src/index.ts',
        'Testing     README.md',
        '',
        'Everything is Ok',
        '',
        'Files: 3',
        'Size:       7802',
        'Compressed: 4913',
      ];
    
    default:
      return `7-Zip: Unknown command: ${command}`;
  }
});

// rar command
registerCommand('rar', async (parsed: ParsedCommand) => {
  const command = parsed.args[0];
  const archive = parsed.args[1];
  
  if (!command) {
    return `
RAR 6.21   Copyright (c) 1993-2023 Alexander Roshal

Usage:     rar <command> -<switch 1> -<switch N> <archive> <files...>

<Commands>
  a             Add files to archive
  c             Add archive comment
  d             Delete files from archive
  e             Extract files without archived paths
  l[t[a],b]     List archive contents
  p             Print file to stdout
  r             Repair archive
  t             Test archive files
  x             Extract files with full path`;
  }
  
  switch (command) {
    case 'a':
      return [
        '',
        'RAR 6.21   Copyright (c) 1993-2023 Alexander Roshal',
        '',
        'Creating archive ' + (archive || 'archive.rar'),
        '',
        'Adding    package.json                                           OK ',
        'Adding    src/index.ts                                           OK ',
        'Adding    README.md                                              OK ',
        '',
        'Done',
      ];
    
    case 'x':
    case 'e':
      return [
        '',
        'RAR 6.21   Copyright (c) 1993-2023 Alexander Roshal',
        '',
        'Extracting from ' + (archive || 'archive.rar'),
        '',
        'Extracting  package.json                                         OK ',
        'Extracting  src/index.ts                                         OK ',
        'Extracting  README.md                                            OK ',
        '',
        'All OK',
      ];
    
    case 'l':
      return [
        '',
        'RAR 6.21   Copyright (c) 1993-2023 Alexander Roshal',
        '',
        'Archive: ' + (archive || 'archive.rar'),
        '',
        ' Attributes      Size     Date    Time   Name',
        '----------- ---------  ---------- -----  ----',
        '    ..A....      1234  2024-01-15 10:30  package.json',
        '    ..A....      5678  2024-01-15 10:30  src/index.ts',
        '    ..A....       890  2024-01-15 10:30  README.md',
        '----------- ---------  ---------- -----  ----',
        '                 7802                    3',
      ];
    
    default:
      return `RAR: Unknown command: ${command}`;
  }
});

// unrar command
registerCommand('unrar', async (parsed: ParsedCommand) => {
  const command = parsed.args[0];
  
  if (!command) {
    return `
UNRAR 6.21 freeware      Copyright (c) 1993-2023 Alexander Roshal

Usage:     unrar <command> -<switch 1> -<switch N> <archive> <files...>

<Commands>
  e             Extract files without archived paths
  l[t[a],b]     List archive contents
  p             Print file to stdout
  t             Test archive files
  v[t[a],b]     Verbosely list archive contents
  x             Extract files with full path`;
  }
  
  const handler = getCommandHandler('rar');
  if (handler) {
    return handler(parsed, '');
  }
  return '';
});

export {};

