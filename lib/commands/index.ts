// Command handlers - main entry point
// Re-exports registry functions and imports all command modules

import { getCurrentDir, setCurrentDir } from '../storage';
import * as fs from '../filesystem';

// Re-export from registry to maintain API compatibility
export { 
  registerCommand, 
  getCommandHandler, 
  getAllCommands
} from './registry';
export type { CommandHandler } from './registry';

import { registerCommand } from './registry';

// Basic commands
registerCommand('ls', async (parsed, currentDir) => {
  const path = parsed.args[0] || currentDir;
  const node = fs.getNodeAtPath(path, currentDir);
  
  if (!node) {
    return `ls: cannot access '${parsed.args[0] || path}': No such file or directory`;
  }
  
  if (node.type !== 'directory') {
    return node.name;
  }
  
  const items = fs.listDirectory(path, currentDir);
  const showAll = parsed.flags['a'] || parsed.flags['all'];
  const longFormat = parsed.flags['l'] || parsed.flags['long'];
  
  let filtered = items;
  if (!showAll) {
    filtered = items.filter(item => !item.name.startsWith('.'));
  }
  
  if (longFormat) {
    return filtered.map(item => {
      const type = item.type === 'directory' ? 'd' : '-';
      const perms = item.permissions || (item.type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--');
      const size = item.size || 4096;
      const date = item.modified ? new Date(item.modified).toLocaleDateString() : 'Jan 1';
      return `${perms} 1 user user ${size} ${date} ${item.name}`;
    }).join('\n');
  }
  
  return filtered.map(item => item.name).join('  ');
});

registerCommand('cd', async (parsed, currentDir) => {
  const path = parsed.args[0] || '/root';
  const normalizedPath = fs.normalizePath(path, currentDir);
  const node = fs.getNodeAtPath(normalizedPath, currentDir);
  
  if (!node) {
    return `cd: no such file or directory: ${parsed.args[0] || path}`;
  }
  
  if (node.type !== 'directory') {
    return `cd: not a directory: ${parsed.args[0] || path}`;
  }
  
  setCurrentDir(normalizedPath);
  return '';
});

registerCommand('pwd', async () => {
  return getCurrentDir();
});

registerCommand('cat', async (parsed, currentDir) => {
  if (parsed.args.length === 0) {
    return 'cat: missing file operand';
  }
  
  const path = parsed.args[0];
  const content = fs.readFile(path, currentDir);
  
  if (content === null) {
    return `cat: ${path}: No such file or directory`;
  }
  
  return content;
});

registerCommand('echo', async (parsed) => {
  return parsed.args.join(' ');
});

registerCommand('whoami', async () => {
  return 'root';
});

registerCommand('hostname', async () => {
  return 'prod-srv-42';
});

registerCommand('date', async () => {
  return new Date().toString();
});

registerCommand('touch', async (parsed, currentDir) => {
  if (parsed.args.length === 0) {
    return 'touch: missing file operand';
  }
  
  for (const arg of parsed.args) {
    if (!fs.createFile(arg, '', currentDir)) {
      return `touch: cannot touch '${arg}': No such file or directory`;
    }
  }
  
  return '';
});

registerCommand('mkdir', async (parsed, currentDir) => {
  if (parsed.args.length === 0) {
    return 'mkdir: missing operand';
  }
  
  const parents = parsed.flags['p'] || parsed.flags['parents'];
  
  for (const arg of parsed.args) {
    if (parents) {
      // Create parent directories
      const parts = fs.normalizePath(arg, currentDir).split('/').filter(Boolean);
      let path = '';
      for (const part of parts) {
        path += '/' + part;
        if (!fs.getNodeAtPath(path, '/')) {
          fs.createDirectory(path, '/');
        }
      }
    } else {
      if (!fs.createDirectory(arg, currentDir)) {
        return `mkdir: cannot create directory '${arg}': File exists`;
      }
    }
  }
  
  return '';
});

registerCommand('rm', async (parsed, currentDir) => {
  if (parsed.args.length === 0) {
    return 'rm: missing operand';
  }
  
  const recursive = parsed.flags['r'] || parsed.flags['R'] || parsed.flags['recursive'];
  const force = parsed.flags['f'] || parsed.flags['force'];
  
  for (const arg of parsed.args) {
    const node = fs.getNodeAtPath(arg, currentDir);
    if (!node) {
      if (!force) {
        return `rm: cannot remove '${arg}': No such file or directory`;
      }
      continue;
    }
    
    if (node.type === 'directory' && !recursive) {
      return `rm: cannot remove '${arg}': Is a directory`;
    }
    
    if (!fs.deleteNode(arg, currentDir)) {
      return `rm: cannot remove '${arg}': Permission denied`;
    }
  }
  
  return '';
});

registerCommand('rmdir', async (parsed, currentDir) => {
  if (parsed.args.length === 0) {
    return 'rmdir: missing operand';
  }
  
  for (const arg of parsed.args) {
    const node = fs.getNodeAtPath(arg, currentDir);
    if (!node) {
      return `rmdir: failed to remove '${arg}': No such file or directory`;
    }
    
    if (node.type !== 'directory') {
      return `rmdir: failed to remove '${arg}': Not a directory`;
    }
    
    if (node.children && Object.keys(node.children).length > 0) {
      return `rmdir: failed to remove '${arg}': Directory not empty`;
    }
    
    if (!fs.deleteNode(arg, currentDir)) {
      return `rmdir: failed to remove '${arg}': Permission denied`;
    }
  }
  
  return '';
});

registerCommand('cp', async (parsed, currentDir) => {
  if (parsed.args.length < 2) {
    return 'cp: missing file operand';
  }
  
  const src = parsed.args[0];
  const dest = parsed.args[1];
  const recursive = parsed.flags['r'] || parsed.flags['R'] || parsed.flags['recursive'];
  
  const srcNode = fs.getNodeAtPath(src, currentDir);
  if (!srcNode) {
    return `cp: cannot stat '${src}': No such file or directory`;
  }
  
  if (srcNode.type === 'directory' && !recursive) {
    return `cp: -r not specified; omitting directory '${src}'`;
  }
  
  // Copy file content
  if (srcNode.type === 'file') {
    const content = fs.readFile(src, currentDir);
    if (content === null) {
      return `cp: cannot read '${src}'`;
    }
    if (!fs.createFile(dest, content, currentDir)) {
      return `cp: cannot create '${dest}'`;
    }
  }
  
  return '';
});

registerCommand('mv', async (parsed, currentDir) => {
  if (parsed.args.length < 2) {
    return 'mv: missing file operand';
  }
  
  const src = parsed.args[0];
  const dest = parsed.args[1];
  
  const srcNode = fs.getNodeAtPath(src, currentDir);
  if (!srcNode) {
    return `mv: cannot stat '${src}': No such file or directory`;
  }
  
  // Copy then delete
  if (srcNode.type === 'file') {
    const content = fs.readFile(src, currentDir);
    if (content === null) {
      return `mv: cannot read '${src}'`;
    }
    if (!fs.createFile(dest, content, currentDir)) {
      return `mv: cannot create '${dest}'`;
    }
    fs.deleteNode(src, currentDir);
  }
  
  return '';
});

registerCommand('grep', async (parsed, currentDir) => {
  if (parsed.args.length < 1) {
    return 'grep: missing pattern';
  }
  
  const pattern = parsed.args[0];
  const files = parsed.args.slice(1);
  const caseInsensitive = parsed.flags['i'] || parsed.flags['ignore-case'];
  
  if (files.length === 0) {
    return 'grep: missing file operand';
  }
  
  const results: string[] = [];
  const regex = new RegExp(pattern, caseInsensitive ? 'i' : '');
  
  for (const file of files) {
    const content = fs.readFile(file, currentDir);
    if (content === null) {
      results.push(`grep: ${file}: No such file or directory`);
      continue;
    }
    
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (regex.test(line)) {
        results.push(`${file}:${index + 1}:${line}`);
      }
    });
  }
  
  return results.join('\n') || '';
});

registerCommand('find', async (parsed, currentDir) => {
  if (parsed.args.length < 1) {
    return 'find: missing path';
  }
  
  const startPath = parsed.args[0];
  const namePattern = parsed.args.find((arg, i) => parsed.args[i - 1] === '-name');
  
  const results: string[] = [];
  
  function search(node: any, path: string): void {
    if (node.type === 'file') {
      if (!namePattern || node.name.includes(namePattern.replace('*', ''))) {
        results.push(path);
      }
    } else if (node.type === 'directory' && node.children) {
      if (!namePattern || node.name.includes(namePattern.replace('*', ''))) {
        results.push(path);
      }
      Object.entries(node.children).forEach(([name, child]: [string, any]) => {
        search(child, path + '/' + name);
      });
    }
  }
  
  const startNode = fs.getNodeAtPath(startPath, currentDir);
  if (startNode) {
    search(startNode, startPath);
  }
  
  return results.join('\n') || '';
});

registerCommand('df', async () => {
  const disk = fs.getDiskStats();
  const totalGB = (disk.total / 1024 / 1024).toFixed(2);
  const usedGB = (disk.used / 1024 / 1024).toFixed(2);
  const freeGB = (disk.free / 1024 / 1024).toFixed(2);
  const usePercent = ((disk.used / disk.total) * 100).toFixed(1);
  
  return `Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/sda1       ${disk.total}  ${disk.used}  ${disk.free}  ${usePercent}% /\n`;
});

registerCommand('du', async (parsed, currentDir) => {
  const path = parsed.args[0] || currentDir;
  const node = fs.getNodeAtPath(path, currentDir);
  
  if (!node) {
    return `du: cannot access '${path}': No such file or directory`;
  }
  
  // Return directory size
  const size = node.size || 4096;
  return `${size}\t${path}`;
});

registerCommand('free', async () => {
  return `              total        used        free      shared  buff/cache   available\nMem:        8192000     2048000     4096000          0      2048000     6144000\nSwap:       2097152           0     2097152\n`;
});

registerCommand('uname', async (parsed) => {
  const all = parsed.flags['a'] || parsed.flags['all'];
  if (all) {
    return 'Linux prod-srv-42 5.15.0-91-generic #101-Ubuntu SMP Thu Nov 16 18:13:28 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux';
  }
  return 'Linux';
});

registerCommand('ps', async () => {
  return `  PID TTY          TIME CMD\n    1 ?        00:00:01 systemd\n  456 ?        00:00:00 sshd\n  789 ?        00:00:00 bash\n 1234 ?        00:00:00 ps\n`;
});

registerCommand('top', async () => {
  return `top - 12:34:56 up 5 days,  2:15,  1 user,  load average: 0.15, 0.12, 0.10\nTasks: 125 total,   1 running, 124 sleeping,   0 stopped,   0 zombie\n%Cpu(s):  2.5 us,  1.2 sy,  0.0 ni, 96.3 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st\nMiB Mem :   8000.0 total,   2000.0 free,   3000.0 used,   3000.0 buff/cache\nMiB Swap:   2048.0 total,   2048.0 free,      0.0 used.   5000.0 avail Mem\n\n  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n 1234 root      20   0   12345   6789   1234 R   5.0   0.1   0:00.05 top\n`;
});

registerCommand('wget', async (parsed) => {
  if (parsed.args.length === 0) {
    return 'wget: missing URL\nUsage: wget [OPTION]... [URL]...\n\nTry \'wget --help\' for more options.';
  }
  
  const url = parsed.args[0];
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  
  // Validate URL format
  let hostname: string;
  let protocol = 'http';
  try {
    // Handle URLs without protocol
    const urlWithProtocol = url.startsWith('http') ? url : `http://${url}`;
    const parsed = new URL(urlWithProtocol);
    hostname = parsed.hostname;
    protocol = parsed.protocol.replace(':', '');
  } catch {
    return `wget: invalid URL '${url}'\nUsage: wget [URL]`;
  }
  
  // Check for known/valid-looking domains
  const validTLDs = ['com', 'org', 'net', 'io', 'pl', 'edu', 'gov', 'co', 'de', 'uk', 'fr', 'ru', 'jp', 'cn'];
  const parts = hostname.split('.');
  const tld = parts[parts.length - 1];
  
  if (!validTLDs.includes(tld) && tld.length > 3) {
    return `--${timestamp}--  ${protocol}://${hostname}/\nResolving ${hostname} (${hostname})... failed: Name or service not known.\nwget: unable to resolve host address '${hostname}'`;
  }
  
  // Simulate DNS resolution failure for random domains
  if (hostname.length > 20 || /[^a-z0-9.-]/i.test(hostname)) {
    return `--${timestamp}--  ${protocol}://${hostname}/\nResolving ${hostname} (${hostname})... failed: Name or service not known.\nwget: unable to resolve host address '${hostname}'`;
  }
  
  // Random IP for successful lookups
  const ip = `${Math.floor(Math.random() * 200) + 20}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  const filename = url.split('/').pop()?.split('?')[0] || 'index.html';
  const port = protocol === 'https' ? 443 : 80;
  
  // Randomly decide if connection succeeds or fails
  if (Math.random() < 0.15) {
    return `--${timestamp}--  ${protocol}://${hostname}/\nResolving ${hostname} (${hostname})... ${ip}\nConnecting to ${hostname} (${hostname})|${ip}|:${port}... failed: Connection refused.`;
  }
  
  const size = Math.floor(Math.random() * 50000) + 1000;
  const speed = (Math.random() * 5 + 0.5).toFixed(2);
  
  return `--${timestamp}--  ${protocol}://${hostname}/${filename}
Resolving ${hostname} (${hostname})... ${ip}
Connecting to ${hostname} (${hostname})|${ip}|:${port}... connected.
HTTP request sent, awaiting response... 200 OK
Length: ${size} (${(size/1024).toFixed(1)}K) [${filename.endsWith('.html') ? 'text/html' : 'application/octet-stream'}]
Saving to: '${filename}'

${filename.substring(0,20).padEnd(20)} 100%[===================>] ${(size/1024).toFixed(2)}K  ${speed}MB/s    in ${(size/1024/parseFloat(speed)/1024).toFixed(3)}s

${timestamp} (${speed} MB/s) - '${filename}' saved [${size}/${size}]`;
});

registerCommand('curl', async (parsed) => {
  if (parsed.args.length === 0) {
    return 'curl: try \'curl --help\' or \'curl --manual\' for more information';
  }
  
  const url = parsed.args[0];
  const verbose = parsed.flags['v'] || parsed.flags['verbose'];
  const head = parsed.flags['I'] || parsed.flags['head'];
  
  // Parse URL
  let hostname: string;
  let protocol = 'http';
  try {
    const urlWithProtocol = url.startsWith('http') ? url : `http://${url}`;
    const parsed = new URL(urlWithProtocol);
    hostname = parsed.hostname;
    protocol = parsed.protocol.replace(':', '');
  } catch {
    return `curl: (3) URL rejected: Malformed input to a URL function`;
  }
  
  // Check for invalid domains
  const validTLDs = ['com', 'org', 'net', 'io', 'pl', 'edu', 'gov', 'co', 'de', 'uk', 'fr', 'ru', 'jp', 'cn'];
  const parts = hostname.split('.');
  const tld = parts[parts.length - 1];
  
  if (!validTLDs.includes(tld) && tld.length > 3) {
    return `curl: (6) Could not resolve host: ${hostname}`;
  }
  
  const ip = `${Math.floor(Math.random() * 200) + 20}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  
  if (head) {
    return `HTTP/1.1 200 OK
Date: ${new Date().toUTCString()}
Server: nginx/1.24.0
Content-Type: text/html; charset=UTF-8
Content-Length: ${Math.floor(Math.random() * 50000) + 1000}
Connection: keep-alive
Cache-Control: max-age=3600`;
  }
  
  if (verbose) {
    return `*   Trying ${ip}:${protocol === 'https' ? 443 : 80}...
* Connected to ${hostname} (${ip}) port ${protocol === 'https' ? 443 : 80}
> GET / HTTP/1.1
> Host: ${hostname}
> User-Agent: curl/8.5.0
> Accept: */*
>
< HTTP/1.1 200 OK
< Server: nginx
< Content-Type: text/html
<
<!DOCTYPE html>
<html><head><title>${hostname}</title></head>
<body><h1>Welcome to ${hostname}</h1></body></html>
* Connection #0 to host ${hostname} left intact`;
  }
  
  return `<!DOCTYPE html>
<html><head><title>${hostname}</title></head>
<body><h1>Welcome to ${hostname}</h1></body></html>`;
});

registerCommand('pip', async (parsed, currentDir) => {
  if (parsed.args[0] !== 'install') {
    return 'pip: command not recognized. Use "pip install <package>"';
  }
  
  if (parsed.args.length < 2) {
    return 'pip install: error: You must give at least one requirement to install';
  }
  
  const packageName = parsed.args[1];
  const { addInstalledPackage } = await import('../storage');
  
  // Simulate installation
  addInstalledPackage(packageName);
  
  // Update disk usage (simulate package installation)
  const disk = fs.getDiskStats();
  const packageSize = Math.floor(Math.random() * 5000) + 1000; // 1-6 MB in KB
  const newUsed = disk.used + packageSize;
  const newFree = Math.max(0, disk.total - newUsed);
  
  // Update in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('terminal_disk', JSON.stringify({
      ...disk,
      used: newUsed,
      free: newFree,
    }));
  }
  
  return `Collecting ${packageName}\n  Downloading ${packageName}-1.0.0-py3-none-any.whl (${packageSize} kB)\nInstalling collected packages: ${packageName}\nSuccessfully installed ${packageName}-1.0.0\n`;
});

registerCommand('hackit', async (parsed) => {
  if (parsed.flags['h'] || parsed.flags['help']) {
    return `hackit - Advanced penetration testing toolkit

Usage: hackit [OPTION] [TARGET]

Options:
  -h, --help          Show this help message
  -s, --scan          Scan target for vulnerabilities
  -e, --exploit       Exploit detected vulnerabilities
  -c, --crack         Crack password hashes
  -b, --bypass        Bypass security measures

Examples:
  hackit -s 192.168.1.1
  hackit -e CVE-2024-0001
  hackit -c /etc/shadow
  hackit --bypass firewall

Warning: Use only on systems you own or have explicit permission to test.`;
  }
  
  if (parsed.flags['s'] || parsed.flags['scan']) {
    const target = parsed.args[0] || 'localhost';
    return `[+] Scanning ${target}...\n[+] Port 22/tcp open  ssh\n[+] Port 80/tcp open  http\n[+] Port 443/tcp open  https\n[+] Vulnerabilities detected: 3\n[+] CVE-2024-0001: Remote code execution\n[+] CVE-2024-0002: SQL injection\n[+] CVE-2024-0003: Privilege escalation\n`;
  }
  
  if (parsed.flags['e'] || parsed.flags['exploit']) {
    return `[+] Exploiting vulnerability...\n[+] Payload sent successfully\n[+] Shell access obtained\n[+] Privilege escalation in progress...\n[+] Root access achieved\n`;
  }
  
  if (parsed.flags['c'] || parsed.flags['crack']) {
    return `[+] Loading password hashes...\n[+] Cracking with dictionary attack...\n[+] Found 3 matches:\n    user1:password123\n    user2:admin\n    root:toor\n`;
  }
  
  if (parsed.flags['b'] || parsed.flags['bypass']) {
    return `[+] Analyzing security measures...\n[+] Bypassing firewall rules...\n[+] Injecting payload...\n[+] Security bypassed successfully\n`;
  }
  
  return 'hackit: missing option. Use "hackit -h" for help.';
});

// Text editors
registerCommand('vim', async (parsed, currentDir) => {
  if (parsed.args.length === 0) {
    return 'vim: No file name\nVIM - Vi Improved\nversion 8.2\n';
  }
  
  const file = parsed.args[0];
  const content = fs.readFile(file, currentDir);
  const fileContent = content || '';
  const lines = fileContent.split('\n');
  
  return `VIM - Vi Improved\n\n"${file}" ${lines.length}L, ${fileContent.length}C\n\nPress ESC then type :wq to save and quit\nPress ESC then type :q! to quit without saving`;
});

registerCommand('nano', async (parsed, currentDir) => {
  if (parsed.args.length === 0) {
    return 'nano: No file name\n';
  }
  
  const file = parsed.args[0];
  const content = fs.readFile(file, currentDir);
  const fileContent = content || '';
  
  return `GNU nano 6.2                    ${file}\n\n${fileContent}\n\n^G Get Help  ^O Write Out  ^W Where Is  ^K Cut Text  ^J Justify   ^C Cur Pos\n^X Exit      ^R Read File  ^\ Replace   ^U Paste Text ^T To Spell  ^_ Go To Line`;
});

registerCommand('mc', async () => {
  return `Midnight Commander 4.8.31\n\nLeft Panel: /root\nRight Panel: /tmp\n\nUse arrow keys to navigate\nF3 - View file\nF4 - Edit file\nF5 - Copy\nF6 - Move\nF7 - Mkdir\nF8 - Delete\nF10 - Exit`;
});

// Import all command modules
import './packages';
import './network';
import './processes';
import './users';
import './archive';
import './text';
import './system';
import './files';
import './misc';

