// Virtual file system manager
// All operations stored in localStorage

export interface FileNode {
  type: 'file' | 'directory';
  name: string;
  content?: string;
  children?: { [key: string]: FileNode };
  permissions?: string;
  owner?: string;
  size?: number;
  modified?: number;
}

export interface FileSystem {
  [key: string]: FileNode;
}

const DEFAULT_FS: FileSystem = {
  '/': {
    type: 'directory',
    name: '/',
    children: {
      home: {
        type: 'directory',
        name: 'home',
        children: {
          user: {
            type: 'directory',
            name: 'user',
            children: {
              Documents: {
                type: 'directory',
                name: 'Documents',
                children: {},
              },
              Downloads: {
                type: 'directory',
                name: 'Downloads',
                children: {},
              },
              '.bashrc': {
                type: 'file',
                name: '.bashrc',
                content: '# ~/.bashrc\n\nexport PS1="\\u@\\h:\\w\\$ "\n',
                size: 45,
                modified: Date.now(),
              },
            },
          },
        },
      },
      etc: {
        type: 'directory',
        name: 'etc',
        children: {
          passwd: {
            type: 'file',
            name: 'passwd',
            content: 'root:x:0:0:root:/root:/bin/bash\nuser:x:1000:1000:user:/home/user:/bin/bash\n',
            size: 70,
            modified: Date.now(),
          },
          hosts: {
            type: 'file',
            name: 'hosts',
            content: '127.0.0.1\tlocalhost\n::1\t\tlocalhost\n',
            size: 35,
            modified: Date.now(),
          },
        },
      },
      var: {
        type: 'directory',
        name: 'var',
        children: {
          log: {
            type: 'directory',
            name: 'log',
            children: {
              syslog: {
                type: 'file',
                name: 'syslog',
                content: '2024-01-01 00:00:00 systemd: Started system\n2024-01-01 00:00:01 sshd: Server listening on port 22\n',
                size: 85,
                modified: Date.now(),
              },
            },
          },
        },
      },
      usr: {
        type: 'directory',
        name: 'usr',
        children: {
          bin: {
            type: 'directory',
            name: 'bin',
            children: {},
          },
        },
      },
      tmp: {
        type: 'directory',
        name: 'tmp',
        children: {},
      },
      root: {
        type: 'directory',
        name: 'root',
        children: {
          '.bashrc': {
            type: 'file',
            name: '.bashrc',
            content: '# ~/.bashrc: executed by bash(1) for non-login shells.\n# See /usr/share/doc/bash/examples/startup-files (in the package bash-doc)\n# for examples\n\n# If not running interactively, don\'t do anything\ncase $- in\n    *i*) ;;\n      *) return;;\nesac\n',
            size: 200,
            modified: Date.now(),
          },
          '.profile': {
            type: 'file',
            name: '.profile',
            content: '# ~/.profile: executed by the command interpreter for login shells.\n# This file is not read by bash(1), if ~/.bash_profile or ~/.bash_login\n# exists.\n',
            size: 150,
            modified: Date.now(),
          },
        },
      },
    },
  },
};

const DEFAULT_DISK = {
  total: 50000000, // 50MB in KB
  used: 5000000,   // 5MB used
  free: 45000000,  // 45MB free
};

function getFS(): FileSystem {
  if (typeof window === 'undefined') return DEFAULT_FS;
  const fsData = localStorage.getItem('terminal_fs');
  if (!fsData) {
    setFS(DEFAULT_FS);
    return DEFAULT_FS;
  }
  return JSON.parse(fsData);
}

function setFS(fs: FileSystem): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('terminal_fs', JSON.stringify(fs));
}

function getDiskUsage() {
  if (typeof window === 'undefined') return DEFAULT_DISK;
  const diskData = localStorage.getItem('terminal_disk');
  if (!diskData) {
    setDiskUsage(DEFAULT_DISK);
    return DEFAULT_DISK;
  }
  return JSON.parse(diskData);
}

function setDiskUsage(disk: typeof DEFAULT_DISK): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('terminal_disk', JSON.stringify(disk));
}

export function normalizePath(path: string, currentDir: string = '/root'): string {
  if (path.startsWith('/')) {
    return path;
  }
  if (path.startsWith('~')) {
    return path.replace('~', '/home/user');
  }
  // Resolve relative path
  const parts = currentDir.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  
  for (const part of pathParts) {
    if (part === '..') {
      parts.pop();
    } else if (part !== '.') {
      parts.push(part);
    }
  }
  
  return '/' + parts.join('/');
}

export function getNodeAtPath(path: string, currentDir: string = '/root'): FileNode | null {
  const normalizedPath = normalizePath(path, currentDir);
  const parts = normalizedPath.split('/').filter(Boolean);
  
  if (parts.length === 0) {
    parts.push('');
  }
  
  const fs = getFS();
  let current: FileNode | undefined = fs['/'];
  
  for (const part of parts) {
    if (!current || current.type !== 'directory' || !current.children) {
      return null;
    }
    current = current.children[part];
    if (!current) {
      return null;
    }
  }
  
  return current || null;
}

export function getParentNode(path: string, currentDir: string = '/root'): FileNode | null {
  const normalizedPath = normalizePath(path, currentDir);
  const parts = normalizedPath.split('/').filter(Boolean);
  
  if (parts.length <= 1) {
    return getFS()['/'];
  }
  
  const parentPath = '/' + parts.slice(0, -1).join('/');
  return getNodeAtPath(parentPath, '/');
}

export function listDirectory(path: string, currentDir: string = '/root'): FileNode[] {
  const node = getNodeAtPath(path, currentDir);
  if (!node || node.type !== 'directory' || !node.children) {
    return [];
  }
  
  return Object.values(node.children);
}

export function createFile(path: string, content: string = '', currentDir: string = '/root'): boolean {
  const normalizedPath = normalizePath(path, currentDir);
  const parts = normalizedPath.split('/').filter(Boolean);
  const fileName = parts.pop();
  
  if (!fileName) return false;
  
  const parentPath = '/' + parts.join('/');
  const parent = getNodeAtPath(parentPath, '/');
  
  if (!parent || parent.type !== 'directory' || !parent.children) {
    return false;
  }
  
  const fs = getFS();
  let current = fs['/'];
  
  for (const part of parts) {
    if (!current.children) {
      current.children = {};
    }
    if (!current.children[part]) {
      return false;
    }
    current = current.children[part];
  }
  
  if (!current.children) {
    current.children = {};
  }
  
  current.children[fileName] = {
    type: 'file',
    name: fileName,
    content,
    size: content.length,
    modified: Date.now(),
  };
  
  setFS(fs);
  updateDiskUsage(content.length);
  return true;
}

export function createDirectory(path: string, currentDir: string = '/root'): boolean {
  const normalizedPath = normalizePath(path, currentDir);
  const parts = normalizedPath.split('/').filter(Boolean);
  const dirName = parts.pop();
  
  if (!dirName) return false;
  
  const fs = getFS();
  let current = fs['/'];
  
  for (const part of parts) {
    if (!current.children) {
      current.children = {};
    }
    if (!current.children[part]) {
      return false;
    }
    current = current.children[part];
  }
  
  if (!current.children) {
    current.children = {};
  }
  
  if (current.children[dirName]) {
    return false; // Already exists
  }
  
  current.children[dirName] = {
    type: 'directory',
    name: dirName,
    children: {},
  };
  
  setFS(fs);
  return true;
}

export function deleteNode(path: string, currentDir: string = '/root'): boolean {
  const normalizedPath = normalizePath(path, currentDir);
  const parts = normalizedPath.split('/').filter(Boolean);
  const nodeName = parts.pop();
  
  if (!nodeName) return false;
  
  const fs = getFS();
  let current = fs['/'];
  
  for (const part of parts) {
    if (!current.children) {
      return false;
    }
    current = current.children[part];
    if (!current) {
      return false;
    }
  }
  
  if (!current.children || !current.children[nodeName]) {
    return false;
  }
  
  const deletedNode = current.children[nodeName];
  const size = calculateNodeSize(deletedNode);
  
  delete current.children[nodeName];
  setFS(fs);
  updateDiskUsage(-size);
  return true;
}

function calculateNodeSize(node: FileNode): number {
  if (node.type === 'file') {
    return node.size || 0;
  }
  if (node.type === 'directory' && node.children) {
    return Object.values(node.children).reduce((sum, child) => sum + calculateNodeSize(child), 0);
  }
  return 0;
}

function updateDiskUsage(delta: number): void {
  const disk = getDiskUsage();
  disk.used = Math.max(0, disk.used + delta);
  disk.free = Math.max(0, disk.total - disk.used);
  setDiskUsage(disk);
}

export function readFile(path: string, currentDir: string = '/root'): string | null {
  const node = getNodeAtPath(path, currentDir);
  if (!node || node.type !== 'file') {
    return null;
  }
  return node.content || '';
}

export function writeFile(path: string, content: string, currentDir: string = '/root'): boolean {
  const node = getNodeAtPath(path, currentDir);
  if (!node || node.type !== 'file') {
    return false;
  }
  
  const oldSize = node.size || 0;
  const newSize = content.length;
  const delta = newSize - oldSize;
  
  const normalizedPath = normalizePath(path, currentDir);
  const parts = normalizedPath.split('/').filter(Boolean);
  const fileName = parts.pop();
  
  if (!fileName) return false;
  
  const fs = getFS();
  let current = fs['/'];
  
  for (const part of parts) {
    if (!current.children) {
      return false;
    }
    current = current.children[part];
    if (!current) {
      return false;
    }
  }
  
  if (!current.children || !current.children[fileName]) {
    return false;
  }
  
  current.children[fileName].content = content;
  current.children[fileName].size = newSize;
  current.children[fileName].modified = Date.now();
  
  setFS(fs);
  updateDiskUsage(delta);
  return true;
}

export function getDiskStats() {
  return getDiskUsage();
}

export function initializeFileSystem(): void {
  if (typeof window === 'undefined') return;
  const fsData = localStorage.getItem('terminal_fs');
  if (!fsData) {
    setFS(DEFAULT_FS);
    setDiskUsage(DEFAULT_DISK);
  }
}

