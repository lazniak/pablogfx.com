// Storage utilities for terminal emulator
// All data stored in browser localStorage

export interface StorageKeys {
  password: string;
  fs: string;
  disk: string;
  history: string;
  userLevel: string;
  packages: string;
  currentDir: string;
  attempts: string;
  agents: string;
  env: string;
  aliases: string;
  users: string;
  groups: string;
  sessionActive: string;
  lastLogin: string;
  lastLoginIP: string;
  terminalSession: string;
}

export const STORAGE_KEYS: StorageKeys = {
  password: 'terminal_password',
  fs: 'terminal_fs',
  disk: 'terminal_disk',
  history: 'terminal_history',
  userLevel: 'terminal_user_level',
  packages: 'terminal_installed_packages',
  currentDir: 'terminal_current_dir',
  attempts: 'terminal_login_attempts',
  agents: 'terminal_agents',
  env: 'terminal_env',
  aliases: 'terminal_aliases',
  users: 'terminal_users',
  groups: 'terminal_groups',
  sessionActive: 'terminal_session_active',
  lastLogin: 'terminal_last_login',
  lastLoginIP: 'terminal_last_login_ip',
  terminalSession: 'terminal_session_log',
};

export function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

export function setStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
}

export function removeStorageItem(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

export function getStoredPassword(): string | null {
  return getStorageItem(STORAGE_KEYS.password);
}

export function setStoredPassword(password: string): void {
  setStorageItem(STORAGE_KEYS.password, password);
}

export function removeStoredPassword(): void {
  removeStorageItem(STORAGE_KEYS.password);
}

export function getLoginAttempts(): number {
  const attempts = getStorageItem(STORAGE_KEYS.attempts);
  return attempts ? parseInt(attempts, 10) : 0;
}

export function incrementLoginAttempts(): number {
  const attempts = getLoginAttempts() + 1;
  setStorageItem(STORAGE_KEYS.attempts, attempts.toString());
  return attempts;
}

export function resetLoginAttempts(): void {
  removeStorageItem(STORAGE_KEYS.attempts);
}

export function getCurrentDir(): string {
  return getStorageItem(STORAGE_KEYS.currentDir) || '/root';
}

export function setCurrentDir(path: string): void {
  setStorageItem(STORAGE_KEYS.currentDir, path);
}

export function getCommandHistory(): string[] {
  const history = getStorageItem(STORAGE_KEYS.history);
  return history ? JSON.parse(history) : [];
}

export function addToHistory(command: string): void {
  const history = getCommandHistory();
  history.push(command);
  // Keep last 1000 commands
  const trimmed = history.slice(-1000);
  setStorageItem(STORAGE_KEYS.history, JSON.stringify(trimmed));
}

export function getUserLevel(): 'beginner' | 'intermediate' | 'advanced' {
  const level = getStorageItem(STORAGE_KEYS.userLevel);
  return (level as 'beginner' | 'intermediate' | 'advanced') || 'beginner';
}

export function setUserLevel(level: 'beginner' | 'intermediate' | 'advanced'): void {
  setStorageItem(STORAGE_KEYS.userLevel, level);
}

export function getInstalledPackages(): string[] {
  const packages = getStorageItem(STORAGE_KEYS.packages);
  return packages ? JSON.parse(packages) : [];
}

export function addInstalledPackage(pkg: string): void {
  const packages = getInstalledPackages();
  if (!packages.includes(pkg)) {
    packages.push(pkg);
    setStorageItem(STORAGE_KEYS.packages, JSON.stringify(packages));
  }
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Agent {
  id: number;
  messages: AgentMessage[];
  createdAt: number;
  initiationLevel?: number; // 0-100, measures how much the user knows
}

export function getAgents(): { [key: number]: Agent } {
  const agents = getStorageItem(STORAGE_KEYS.agents);
  return agents ? JSON.parse(agents) : {};
}

export function getAgent(id: number): Agent | null {
  const agents = getAgents();
  return agents[id] || null;
}

export function saveAgent(agent: Agent): void {
  const agents = getAgents();
  agents[agent.id] = agent;
  setStorageItem(STORAGE_KEYS.agents, JSON.stringify(agents));
}

export function addAgentMessage(id: number, role: 'user' | 'assistant', content: string): void {
  const agents = getAgents();
  if (!agents[id]) {
    agents[id] = {
      id,
      messages: [],
      createdAt: Date.now(),
    };
  }
  agents[id].messages.push({
    role,
    content,
    timestamp: Date.now(),
  });
  setStorageItem(STORAGE_KEYS.agents, JSON.stringify(agents));
}

// Environment variables
export interface EnvVars {
  [key: string]: string;
}

const DEFAULT_ENV: EnvVars = {
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
  'LOGNAME': 'root',
  'MAIL': '/var/mail/root',
  'SHLVL': '1',
  'PS1': '\\u@\\h:\\w\\$ ',
};

export function getEnvVars(): EnvVars {
  const env = getStorageItem(STORAGE_KEYS.env);
  return env ? JSON.parse(env) : { ...DEFAULT_ENV };
}

export function setEnvVar(key: string, value: string): void {
  const env = getEnvVars();
  env[key] = value;
  setStorageItem(STORAGE_KEYS.env, JSON.stringify(env));
}

export function unsetEnvVar(key: string): void {
  const env = getEnvVars();
  delete env[key];
  setStorageItem(STORAGE_KEYS.env, JSON.stringify(env));
}

export function getEnvVar(key: string): string | undefined {
  const env = getEnvVars();
  return env[key];
}

// Aliases
export interface Aliases {
  [name: string]: string;
}

const DEFAULT_ALIASES: Aliases = {
  'll': 'ls -la',
  'la': 'ls -A',
  'l': 'ls -CF',
  'grep': 'grep --color=auto',
  'fgrep': 'fgrep --color=auto',
  'egrep': 'egrep --color=auto',
  'cls': 'clear',
  '..': 'cd ..',
  '...': 'cd ../..',
};

export function getAliases(): Aliases {
  const aliases = getStorageItem(STORAGE_KEYS.aliases);
  return aliases ? JSON.parse(aliases) : { ...DEFAULT_ALIASES };
}

export function setAlias(name: string, command: string): void {
  const aliases = getAliases();
  aliases[name] = command;
  setStorageItem(STORAGE_KEYS.aliases, JSON.stringify(aliases));
}

export function unsetAlias(name: string): void {
  const aliases = getAliases();
  delete aliases[name];
  setStorageItem(STORAGE_KEYS.aliases, JSON.stringify(aliases));
}

export function getAlias(name: string): string | undefined {
  const aliases = getAliases();
  return aliases[name];
}

// Users
export interface User {
  name: string;
  uid: number;
  gid: number;
  home: string;
  shell: string;
  groups: string[];
  passwordHash?: string;
}

const DEFAULT_USERS: User[] = [
  { name: 'root', uid: 0, gid: 0, home: '/root', shell: '/bin/bash', groups: ['root', 'sudo', 'wheel'] },
  { name: 'www-data', uid: 33, gid: 33, home: '/var/www', shell: '/usr/sbin/nologin', groups: ['www-data'] },
  { name: 'mysql', uid: 27, gid: 27, home: '/var/lib/mysql', shell: '/bin/false', groups: ['mysql'] },
  { name: 'postgres', uid: 26, gid: 26, home: '/var/lib/postgresql', shell: '/bin/bash', groups: ['postgres'] },
  { name: 'redis', uid: 110, gid: 117, home: '/var/lib/redis', shell: '/usr/sbin/nologin', groups: ['redis'] },
  { name: 'node', uid: 1000, gid: 1000, home: '/home/node', shell: '/bin/bash', groups: ['node', 'sudo'] },
];

export function getUsers(): User[] {
  const users = getStorageItem(STORAGE_KEYS.users);
  return users ? JSON.parse(users) : [...DEFAULT_USERS];
}

export function addUser(user: User): boolean {
  const users = getUsers();
  if (users.find(u => u.name === user.name)) {
    return false;
  }
  users.push(user);
  setStorageItem(STORAGE_KEYS.users, JSON.stringify(users));
  return true;
}

export function removeUser(username: string): boolean {
  const users = getUsers();
  const index = users.findIndex(u => u.name === username);
  if (index === -1) {
    return false;
  }
  users.splice(index, 1);
  setStorageItem(STORAGE_KEYS.users, JSON.stringify(users));
  return true;
}

export function getUser(username: string): User | null {
  const users = getUsers();
  return users.find(u => u.name === username) || null;
}

export function updateUser(username: string, updates: Partial<User>): boolean {
  const users = getUsers();
  const user = users.find(u => u.name === username);
  if (!user) {
    return false;
  }
  Object.assign(user, updates);
  setStorageItem(STORAGE_KEYS.users, JSON.stringify(users));
  return true;
}

// Groups
export interface Group {
  name: string;
  gid: number;
  members: string[];
}

const DEFAULT_GROUPS: Group[] = [
  { name: 'root', gid: 0, members: ['root'] },
  { name: 'sudo', gid: 27, members: ['root', 'node'] },
  { name: 'wheel', gid: 10, members: ['root'] },
  { name: 'www-data', gid: 33, members: ['www-data'] },
  { name: 'mysql', gid: 27, members: ['mysql'] },
  { name: 'postgres', gid: 26, members: ['postgres'] },
  { name: 'redis', gid: 117, members: ['redis'] },
  { name: 'node', gid: 1000, members: ['node'] },
  { name: 'docker', gid: 998, members: ['root', 'node'] },
  { name: 'adm', gid: 4, members: ['root'] },
];

export function getGroups(): Group[] {
  const groups = getStorageItem(STORAGE_KEYS.groups);
  return groups ? JSON.parse(groups) : [...DEFAULT_GROUPS];
}

export function addGroup(group: Group): boolean {
  const groups = getGroups();
  if (groups.find(g => g.name === group.name)) {
    return false;
  }
  groups.push(group);
  setStorageItem(STORAGE_KEYS.groups, JSON.stringify(groups));
  return true;
}

export function removeGroup(groupName: string): boolean {
  const groups = getGroups();
  const index = groups.findIndex(g => g.name === groupName);
  if (index === -1) {
    return false;
  }
  groups.splice(index, 1);
  setStorageItem(STORAGE_KEYS.groups, JSON.stringify(groups));
  return true;
}

export function getGroup(groupName: string): Group | null {
  const groups = getGroups();
  return groups.find(g => g.name === groupName) || null;
}

export function addUserToGroup(username: string, groupName: string): boolean {
  const groups = getGroups();
  const group = groups.find(g => g.name === groupName);
  if (!group) {
    return false;
  }
  if (!group.members.includes(username)) {
    group.members.push(username);
    setStorageItem(STORAGE_KEYS.groups, JSON.stringify(groups));
  }
  return true;
}

export function removeUserFromGroup(username: string, groupName: string): boolean {
  const groups = getGroups();
  const group = groups.find(g => g.name === groupName);
  if (!group) {
    return false;
  }
  group.members = group.members.filter(m => m !== username);
  setStorageItem(STORAGE_KEYS.groups, JSON.stringify(groups));
  return true;
}

// Session management
export function isSessionActive(): boolean {
  return getStorageItem(STORAGE_KEYS.sessionActive) === 'true';
}

export function setSessionActive(active: boolean): void {
  setStorageItem(STORAGE_KEYS.sessionActive, active ? 'true' : 'false');
}

// Clear all terminal data
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    removeStorageItem(key);
  });
}

// Last login management
export interface LastLoginInfo {
  timestamp: string;
  ip: string;
}

// Default first login: April 16, 2049 16:16:16
const DEFAULT_FIRST_LOGIN = 'Wed Apr 16 16:16:16 2049';
const DEFAULT_FIRST_LOGIN_IP = '10.42.0.1';

export function getLastLogin(): LastLoginInfo {
  const storedTime = getStorageItem(STORAGE_KEYS.lastLogin);
  const storedIP = getStorageItem(STORAGE_KEYS.lastLoginIP);
  
  if (storedTime && storedIP) {
    return {
      timestamp: storedTime,
      ip: storedIP
    };
  }
  
  // First login - return default future date
  return {
    timestamp: DEFAULT_FIRST_LOGIN,
    ip: DEFAULT_FIRST_LOGIN_IP
  };
}

export function saveCurrentLoginTime(): void {
  // Save current time as last login for next session
  const now = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const formatted = `${days[now.getDay()]} ${months[now.getMonth()]} ${now.getDate().toString().padStart(2, ' ')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} ${now.getFullYear()}`;
  
  // Generate a random IP for this session
  const ip = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  
  setStorageItem(STORAGE_KEYS.lastLogin, formatted);
  setStorageItem(STORAGE_KEYS.lastLoginIP, ip);
}

// Terminal session log for agent context
export interface SessionEntry {
  timestamp: number;
  type: 'command' | 'output' | 'agent';
  content: string;
}

const MAX_SESSION_ENTRIES = 100;

export function getTerminalSession(): SessionEntry[] {
  const stored = getStorageItem(STORAGE_KEYS.terminalSession);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function addToTerminalSession(type: 'command' | 'output' | 'agent', content: string): void {
  const session = getTerminalSession();
  session.push({
    timestamp: Date.now(),
    type,
    content: content.substring(0, 500) // Limit entry size
  });
  
  // Keep only last N entries
  const trimmed = session.slice(-MAX_SESSION_ENTRIES);
  setStorageItem(STORAGE_KEYS.terminalSession, JSON.stringify(trimmed));
}

export function getSessionSummary(): string {
  const session = getTerminalSession();
  if (session.length === 0) return 'No session history.';
  
  // Get last 20 entries for summary
  const recent = session.slice(-20);
  return recent.map(entry => {
    const prefix = entry.type === 'command' ? '$ ' : entry.type === 'agent' ? '[Agent] ' : '';
    return `${prefix}${entry.content}`;
  }).join('\n');
}

export function clearTerminalSession(): void {
  removeStorageItem(STORAGE_KEYS.terminalSession);
}

