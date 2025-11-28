// User level detection based on command history

import { getCommandHistory, getUserLevel, setUserLevel } from './storage';

export type UserLevel = 'beginner' | 'intermediate' | 'advanced';

const ADVANCED_COMMANDS = [
  'awk', 'sed', 'grep', 'find', 'xargs', 'tar', 'gzip', 'ssh', 'scp',
  'rsync', 'cron', 'systemctl', 'journalctl', 'iptables', 'netstat',
  'tcpdump', 'strace', 'gdb', 'vim', 'emacs', 'git', 'docker', 'kubectl',
];

const INTERMEDIATE_COMMANDS = [
  'cd', 'ls', 'cat', 'mkdir', 'rm', 'cp', 'mv', 'chmod', 'chown',
  'ps', 'top', 'df', 'du', 'free', 'wget', 'curl', 'nano',
];

export function detectUserLevel(): UserLevel {
  const history = getCommandHistory();
  const currentLevel = getUserLevel();
  
  if (history.length === 0) {
    return 'beginner';
  }
  
  // Count advanced commands
  const advancedCount = history.filter(cmd => 
    ADVANCED_COMMANDS.some(ac => cmd.includes(ac))
  ).length;
  
  // Count intermediate commands
  const intermediateCount = history.filter(cmd =>
    INTERMEDIATE_COMMANDS.some(ic => cmd.includes(ic))
  ).length;
  
  // Analyze command complexity
  const hasPipes = history.some(cmd => cmd.includes('|'));
  const hasRedirects = history.some(cmd => cmd.includes('>') || cmd.includes('<'));
  const hasBackground = history.some(cmd => cmd.includes('&'));
  const hasComplexCommands = hasPipes || hasRedirects || hasBackground;
  
  // Determine level
  if (advancedCount > 5 || (advancedCount > 2 && hasComplexCommands)) {
    if (currentLevel !== 'advanced') {
      setUserLevel('advanced');
    }
    return 'advanced';
  }
  
  if (intermediateCount > 10 || hasComplexCommands || advancedCount > 0) {
    if (currentLevel !== 'intermediate') {
      setUserLevel('intermediate');
    }
    return 'intermediate';
  }
  
  return 'beginner';
}

export function getUserLevelPrompt(): string {
  const level = detectUserLevel();
  
  switch (level) {
    case 'beginner':
      return 'The user is a beginner. Provide simple, helpful responses. Explain basic concepts if needed.';
    case 'intermediate':
      return 'The user has intermediate Linux knowledge. Provide standard terminal responses without over-explaining.';
    case 'advanced':
      return 'The user is advanced. Provide realistic, technical terminal responses. Use proper Linux terminology and error messages.';
    default:
      return 'Provide appropriate terminal responses.';
  }
}

