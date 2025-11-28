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

