'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { parseCommand } from '@/lib/commandParser';
import { getCommandHandler } from '@/lib/commands';
import { 
  getCurrentDir, 
  setCurrentDir, 
  addToHistory, 
  getCommandHistory,
  getStoredPassword 
} from '@/lib/storage';
import { initializeFileSystem } from '@/lib/filesystem';
import { detectUserLevel } from '@/lib/userLevel';

interface TerminalProps {
  onLogout?: () => void;
}

export default function Terminal({ onLogout }: TerminalProps) {
  const [output, setOutput] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [currentDir, setCurrentDirState] = useState('/root');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const history = useRef<string[]>([]);

  useEffect(() => {
    initializeFileSystem();
    const dir = getCurrentDir();
    setCurrentDirState(dir);
    history.current = getCommandHistory();
    
    // Generate realistic Ubuntu welcome message
    const now = new Date();
    const dateStr = now.toUTCString().replace('GMT', 'UTC');
    const systemLoad = (Math.random() * 0.5 + 0.1).toFixed(2);
    const processes = Math.floor(Math.random() * 50 + 80);
    const diskUsage = (Math.random() * 20 + 10).toFixed(1);
    const diskTotal = (Math.random() * 20 + 40).toFixed(2);
    const memoryUsage = Math.floor(Math.random() * 30 + 15);
    const ipv4 = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const ipv6 = `2a02:4780:${Math.floor(Math.random() * 99)}:${Math.floor(Math.random() * 9999).toString(16)}::${Math.floor(Math.random() * 9)}`;
    const lastLogin = new Date(now.getTime() - Math.random() * 86400000 * 2).toUTCString().replace('GMT', 'UTC');
    const lastLoginIP = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    
    const welcomeMessage = [
      'Welcome to Ubuntu 25.04 (GNU/Linux 6.14.0-36-generic x86_64)',
      '',
      ' * Documentation:  https://help.ubuntu.com',
      ' * Management:     https://landscape.canonical.com',
      ' * Support:        https://ubuntu.com/pro',
      '',
      ` System information as of ${dateStr}`,
      '',
      `  System load:  ${systemLoad}               Processes:             ${processes}`,
      `  Usage of /:   ${diskUsage}% of ${diskTotal}GB   Users logged in:       1`,
      `  Memory usage: ${memoryUsage}%                IPv4 address for eth0: ${ipv4}`,
      `  Swap usage:   0%                 IPv6 address for eth0: ${ipv6}`,
      '',
      ' * Strictly confined Kubernetes makes edge and IoT secure. Learn how MicroK8s',
      '   just raised the bar for easy, resilient and secure K8s cluster deployment.',
      '',
      '   https://ubuntu.com/engage/secure-kubernetes-at-the-edge',
      '',
      `${Math.floor(Math.random() * 20 + 5)} updates can be applied immediately.`,
      'To see these additional updates run: apt list --upgradable',
      '',
      "New release '25.10' available.",
      "Run 'do-release-upgrade' to upgrade to it.",
      '',
      '',
      `Last login: ${lastLogin} from ${lastLoginIP}`,
      '',
    ];
    
    setOutput(welcomeMessage);
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, input]);

  const executeCommand = useCallback(async (cmd: string) => {
    if (!cmd.trim()) {
      return;
    }

    setIsProcessing(true);
    const parsed = parseCommand(cmd);
    const dir = getCurrentDir();
    
    // Add to history
    addToHistory(cmd);
    history.current = getCommandHistory();
    setHistoryIndex(-1);

    // Update output with command
    const displayDir = dir === '/home/user' || dir === '/root' ? '~' : dir;
    setOutput(prev => [...prev, `root@prod-srv-42:${displayDir}# ${cmd}`]);

    // Handle special commands
    if (parsed.command === 'exit' || parsed.command === 'logout') {
      if (onLogout) {
        onLogout();
      }
      return;
    }

    if (parsed.command === 'clear' || parsed.command === 'cls') {
      setOutput([]);
      setIsProcessing(false);
      return;
    }

    if (parsed.command === 'help') {
      setOutput(prev => [...prev, 
        'Available commands:',
        '  ls, cd, pwd, cat, echo, whoami, hostname, date',
        '  touch, mkdir, rm, rmdir, cp, mv, chmod, chown',
        '  grep, find, ps, top, df, du, free, uname',
        '  vim, nano, mc (Midnight Commander)',
        '  pip install <package>',
        '  wget, curl',
        '  hackit (use hackit -h for help)',
        '  clear, exit, help',
        '',
        'Use arrow keys for command history.',
      ]);
      setIsProcessing(false);
      return;
    }

    // Try to get handler
    const handler = getCommandHandler(parsed.command);
    
    if (handler) {
      try {
        const result = await handler(parsed, dir);
        if (result) {
          setOutput(prev => [...prev, result]);
        }
        // Update directory if changed
        const newDir = getCurrentDir();
        if (newDir !== dir) {
          setCurrentDirState(newDir);
        }
      } catch (error: any) {
        setOutput(prev => [...prev, `Error: ${error.message}`]);
      }
    } else {
      // Use LLM for unknown commands
      try {
        const userLevel = detectUserLevel();
        const recentCommands = getCommandHistory().slice(-10);
        
        const response = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: cmd,
            context: {
              currentDir: dir,
              userLevel,
              recentCommands,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get response');
        }

        const data = await response.json();
        if (data.output) {
          setOutput(prev => [...prev, data.output]);
        } else {
          setOutput(prev => [...prev, `${parsed.command}: command not found`]);
        }
      } catch (error: any) {
        setOutput(prev => [...prev, `${parsed.command}: command not found`]);
      }
    }

    setIsProcessing(false);
  }, [onLogout]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.current.length > 0) {
        const newIndex = historyIndex < history.current.length - 1 
          ? historyIndex + 1 
          : history.current.length - 1;
        setHistoryIndex(newIndex);
        setInput(history.current[history.current.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history.current[history.current.length - 1 - newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  }, [input, historyIndex, executeCommand]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    setInput(prev => prev + pastedText);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    e.preventDefault();
    // Paste from clipboard
    navigator.clipboard.readText().then(text => {
      setInput(prev => prev + text);
    }).catch(() => {
      // Fallback if clipboard API fails
    });
  }, []);

  const displayDir = currentDir === '/home/user' || currentDir === '/root' ? '~' : currentDir;

  return (
    <div className="terminal-container">
      <div className="terminal-output" ref={outputRef}>
        {output.map((line, index) => (
          <div key={index} className="terminal-line">
            {line}
          </div>
        ))}
        {!isProcessing && (
          <div className="terminal-input-line">
            <span className="terminal-prompt">
              <span className="prompt-user">root</span>@<span className="prompt-host">prod-srv-42</span>:<span className="prompt-dir">{displayDir}</span>#
            </span>
            <input
              ref={inputRef}
              type="text"
              className="terminal-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onContextMenu={handleContextMenu}
              autoFocus
              disabled={isProcessing}
            />
          </div>
        )}
      </div>
      <style jsx>{`
        .terminal-container {
          width: 100%;
          height: 100vh;
          background: #000000;
          color: #ffffff;
          font-family: 'Ubuntu Mono', 'Courier New', monospace;
          font-size: 14px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .terminal-output {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          line-height: 1.5;
        }
        
        .terminal-line {
          white-space: pre-wrap;
          word-wrap: break-word;
          color: #ffffff;
        }
        
        .terminal-input-line {
          display: inline-flex;
          align-items: center;
          width: 100%;
        }
        
        .terminal-prompt {
          margin-right: 8px;
          user-select: none;
          font-weight: normal;
          white-space: nowrap;
        }
        
        .prompt-user {
          color: #ffffff;
        }
        
        .prompt-host {
          color: #00ff00;
        }
        
        .prompt-dir {
          color: #00ff00;
        }
        
        .terminal-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #ffffff;
          font-family: 'Ubuntu Mono', 'Courier New', monospace;
          font-size: 14px;
          outline: none;
          min-width: 0;
        }
        
        .terminal-input:disabled {
          opacity: 0.5;
        }
        
        .terminal-output::-webkit-scrollbar {
          width: 10px;
        }
        
        .terminal-output::-webkit-scrollbar-track {
          background: #000000;
        }
        
        .terminal-output::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 5px;
        }
        
        .terminal-output::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
}

