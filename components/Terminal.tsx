'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { parseCommand } from '@/lib/commandParser';
import { getCommandHandler, getAllCommands } from '@/lib/commands';
import { 
  getCurrentDir, 
  setCurrentDir, 
  addToHistory, 
  getCommandHistory,
  getStoredPassword,
  getAgent,
  addAgentMessage,
  saveAgent,
  getLastLogin,
  addToTerminalSession,
  getSessionSummary,
  getAGQContext,
  saveAGQContext,
  getAGQConversation,
  addAGQMessage,
  clearAGQConversation,
  addFailedCommand,
  clearFailedCommands,
  getFailedCommands,
  incrementAGQSessionCount,
  type Agent
} from '@/lib/storage';
import { initializeFileSystem, getNodeAtPath } from '@/lib/filesystem';
import { detectUserLevel } from '@/lib/userLevel';
import MidnightCommander from './MidnightCommander';
import { renderSequence, createTerminalCallbacks } from '@/lib/agq-assistant/renderer';
import { generateActivationPrompt, generateWelcomeSequence, generateExitSequence } from '@/lib/agq-assistant/prompts';
import { AGQSequence } from '@/lib/agq-assistant/tools';

// Color code to CSS color mapping
const ANSI_COLORS: { [key: string]: string } = {
  '0': '',          // Reset
  '30': '#000000',  // Black
  '31': '#ff5555',  // Red
  '32': '#50fa7b',  // Green
  '33': '#f1fa8c',  // Yellow
  '34': '#6272a4',  // Blue
  '35': '#ff79c6',  // Magenta/Purple
  '36': '#8be9fd',  // Cyan
  '37': '#f8f8f2',  // White
  '90': '#6272a4',  // Bright Black (Gray)
  '91': '#ff6e6e',  // Bright Red
  '92': '#69ff94',  // Bright Green
  '93': '#ffffa5',  // Bright Yellow
  '94': '#d6acff',  // Bright Blue
  '95': '#ff92df',  // Bright Magenta
  '96': '#a4ffff',  // Bright Cyan
  '97': '#ffffff',  // Bright White
};

// Parse color codes {{c:XX}} and return React elements
function parseAnsiToReact(text: string, key: number): React.ReactNode {
  // Regex to match our custom color codes {{c:XX}}
  const colorRegex = /\{\{c:(\d+)\}\}/g;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let currentColor: string | null = null;
  let match;
  
  while ((match = colorRegex.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      const textPart = text.substring(lastIndex, match.index);
      if (textPart) {
        parts.push(
          <span key={`${key}-${parts.length}`} style={currentColor ? { color: currentColor } : undefined}>
            {textPart}
          </span>
        );
      }
    }
    
    // Parse the color code
    const code = match[1];
    if (code === '0') {
      currentColor = null; // Reset
    } else if (ANSI_COLORS[code]) {
      currentColor = ANSI_COLORS[code];
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      parts.push(
        <span key={`${key}-${parts.length}`} style={currentColor ? { color: currentColor } : undefined}>
          {remainingText}
        </span>
      );
    }
  }
  
  // If no color codes were found, return original text
  if (parts.length === 0) {
    return text;
  }
  
  return <>{parts}</>;
}

interface TerminalProps {
  onLogout?: () => void;
}

export default function Terminal({ onLogout }: TerminalProps) {
  const [output, setOutput] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [currentDir, setCurrentDirState] = useState('/root');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [brightness, setBrightness] = useState(40); // 0-100%
  const [censor, setCensor] = useState(25); // 0-100% blur
  const [activeAgent, setActiveAgent] = useState<number | null>(null);
  const [mcMode, setMcMode] = useState(false);
  const [agqMode, setAgqMode] = useState(false);
  const [failedCommandCount, setFailedCommandCount] = useState(0);
  const [agqPromptShown, setAgqPromptShown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const history = useRef<string[]>([]);
  const videoStartedRef = useRef(false);
  const abortSignalRef = useRef({ aborted: false });

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
    // Get stored last login (or default: April 16, 2049 16:16:16)
    const lastLoginInfo = getLastLogin();
    const lastLogin = lastLoginInfo.timestamp;
    const lastLoginIP = lastLoginInfo.ip;
    
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
      `[mostek czasowy] Last login: ${lastLogin} from ${lastLoginIP}`,
      '',
      '[AGQ-16.7.9v] Quantum Agent available. Type "agq" for full system access.',
      '',
    ];
    
    setOutput(welcomeMessage);
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, input]);

  // Always keep focus on input when not processing
  useEffect(() => {
    if (!isProcessing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isProcessing]);

  // Quantum Stream (video) control handler for AGQ
  const handleQuantumStream = useCallback((action: string, value?: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    switch (action) {
      case 'play':
        video.play().catch(() => {});
        break;
      case 'pause':
        video.pause();
        break;
      case 'stop':
        video.pause();
        video.currentTime = 0;
        break;
      case 'seek':
        if (value !== undefined) {
          video.currentTime = value;
        }
        break;
      case 'volume':
        if (value !== undefined) {
          video.volume = Math.max(0, Math.min(1, value / 100));
        }
        break;
      case 'mute':
        video.muted = true;
        setIsMuted(true);
        break;
      case 'unmute':
        video.muted = false;
        setIsMuted(false);
        break;
    }
  }, []);

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
    
    // Log command to session for agent context
    addToTerminalSession('command', cmd);

    // Handle special commands
    if (parsed.command === 'exit' || parsed.command === 'logout') {
      // Exit agent mode if in agent mode
      if (activeAgent !== null) {
        setOutput(prev => [...prev, `[Agent ${activeAgent}] Disconnected.`]);
        setActiveAgent(null);
        setIsProcessing(false);
        return;
      }
      // Otherwise logout
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

    // Launch Midnight Commander
    if (parsed.command === 'mc') {
      setMcMode(true);
      setIsProcessing(false);
      return;
    }

    // Handle AGQ-ASSISTANT activation
    if (parsed.command === 'agq' || parsed.command === 'assistant') {
      setAgqMode(true);
      clearFailedCommands();
      setFailedCommandCount(0);
      setAgqPromptShown(false);
      incrementAGQSessionCount();
      
      // Run welcome sequence
      const context = getAGQContext();
      const welcomeSeq = generateWelcomeSequence(context.initiationLevel);
      
      const callbacks = createTerminalCallbacks(setOutput, abortSignalRef.current, handleQuantumStream);
      abortSignalRef.current.aborted = false;
      
      (async () => {
        await renderSequence(welcomeSeq, callbacks);
        // Increase initiation level slightly
        saveAGQContext({ initiationLevel: Math.min(context.initiationLevel + 5, 100) });
        setIsProcessing(false);
      })();
      return;
    }

    // If in AGQ mode, handle messages to assistant
    if (agqMode) {
      const message = cmd.trim().toLowerCase();
      
      // Handle exit commands
      if (message === 'exit' || message === 'quit' || message === 'bye') {
        const exitSeq = generateExitSequence();
        const callbacks = createTerminalCallbacks(setOutput, abortSignalRef.current, handleQuantumStream);
        abortSignalRef.current.aborted = false;
        
        (async () => {
          await renderSequence(exitSeq, callbacks);
          setAgqMode(false);
          setIsProcessing(false);
        })();
        return;
      }
      
      // Handle clear
      if (message === 'clear') {
        setOutput([]);
        setIsProcessing(false);
        return;
      }
      
      // Send message to AGQ API
      if (cmd.trim()) {
        addAGQMessage('user', cmd.trim());
        setOutput(prev => [...prev, `agq> ${cmd.trim()}`]);
        
        // Show loading animation
        const spinners = ['◐', '◓', '◑', '◒'];
        let spinIdx = 0;
        const loadingMsgs = [
          'Quantum bridge synchronizing...',
          'Traversing temporal nodes...',
          'Decrypting response matrix...',
          'Calibrating neural interface...',
        ];
        let msgIdx = 0;
        
        setOutput(prev => [...prev, `${spinners[0]} ${loadingMsgs[0]}`]);
        
        const loadingInterval = setInterval(() => {
          spinIdx = (spinIdx + 1) % spinners.length;
          if (spinIdx === 0) msgIdx = (msgIdx + 1) % loadingMsgs.length;
          setOutput(prev => {
            const newOut = [...prev];
            newOut[newOut.length - 1] = `${spinners[spinIdx]} ${loadingMsgs[msgIdx]}`;
            return newOut;
          });
        }, 100);
        
        try {
          const context = getAGQContext();
          const response = await fetch('/api/agq', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: cmd.trim(),
              action: 'message',
              context: {
                failedCommands: getFailedCommands(),
                sessionHistory: getSessionSummary(),
                conversationHistory: getAGQConversation().slice(-10),
                initiationLevel: context.initiationLevel,
              }
            })
          });
          
          clearInterval(loadingInterval);
          // Remove loading line
          setOutput(prev => prev.slice(0, -1));
          
          const data = await response.json();
          
          if (data.sequence) {
            const callbacks = createTerminalCallbacks(setOutput, abortSignalRef.current, handleQuantumStream);
            abortSignalRef.current.aborted = false;
            await renderSequence(data.sequence, callbacks);
            
            // Store assistant response
            const responseText = data.sequence.steps
              .filter((s: { tool: string }) => s.tool === 'text')
              .map((s: { content?: string }) => s.content || '')
              .join(' ');
            if (responseText) {
              addAGQMessage('assistant', responseText);
            }
            
            // Update context if provided
            if (data.stateUpdate) {
              saveAGQContext(data.stateUpdate);
            }
          }
        } catch (error) {
          clearInterval(loadingInterval);
          setOutput(prev => [...prev.slice(0, -1), '[AGQ-16.7.9v] Quantum interference detected. Please retry.']);
        }
        
        setIsProcessing(false);
        return;
      }
      
      setIsProcessing(false);
      return;
    }

    // If in agent mode, treat all input as messages to agent (except exit/clear/agent which are handled above)
    // This must be checked BEFORE other commands to catch all input when in agent mode
    if (activeAgent !== null && parsed.command !== 'agent') {
      const message = cmd.trim();
      if (message) {
        addAgentMessage(activeAgent, 'user', message);
        setOutput(prev => [...prev, `[Agent ${activeAgent}] You: ${message}`]);
        
        // Quantum loading messages
        const quantumMessages = [
          'Synchronizing quantum entanglement matrices...',
          'Establishing temporal bridge connection...',
          'Decrypting chrono-spatial coordinates...',
          'Calibrating neural-quantum interface...',
          'Traversing parallel timeline nodes...',
          'Stabilizing wormhole aperture...',
          'Mapping multidimensional data streams...',
          'Resolving temporal paradox buffers...',
          'Aligning quantum coherence fields...',
          'Initializing tachyon pulse emitter...',
          'Parsing hyperdimensional signals...',
          'Unlocking encrypted timeline fragments...',
          'Channeling zero-point energy flux...',
          'Recalibrating chrono-sync protocols...',
          'Bridging consciousness resonance...',
          'Quantum tunneling through firewall...',
          'Decompressing temporal data packets...',
          'Harmonizing phase wave frequencies...',
        ];
        const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let spinnerIdx = 0;
        let msgIdx = Math.floor(Math.random() * quantumMessages.length);
        let loadingActive = true;
        
        // Add initial loading line
        setOutput(prev => [...prev, `[Agent ${activeAgent}] ${spinners[0]} ${quantumMessages[msgIdx]}`]);
        
        // Start loading animation
        const loadingInterval = setInterval(() => {
          if (!loadingActive) return;
          spinnerIdx = (spinnerIdx + 1) % spinners.length;
          // Change message every 3 spins
          if (spinnerIdx === 0) {
            msgIdx = (msgIdx + 1) % quantumMessages.length;
          }
          setOutput(prev => {
            const newOutput = [...prev];
            newOutput[newOutput.length - 1] = `[Agent ${activeAgent}] ${spinners[spinnerIdx]} ${quantumMessages[msgIdx]}`;
            return newOutput;
          });
        }, 80);
        
        try {
          const agent = getAgent(activeAgent);
          const history = agent?.messages || [];
          const sessionSummary = getSessionSummary();
          
          const response = await fetch('/api/agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentId: activeAgent,
              message,
              history: history.slice(-10),
              terminalSession: sessionSummary,
            }),
          });
          
          if (!response.ok) {
            loadingActive = false;
            clearInterval(loadingInterval);
            throw new Error('Failed to get agent response');
          }
          
          // Handle streaming response
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let agentResponse = '';
          let buffer = '';
          let firstChunk = true;
          
          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    if (data.videoPosition !== undefined) {
                      // Navigate video to the position based on context
                      const video = videoRef.current;
                      if (video && video.duration) {
                        const targetTime = (data.videoPosition / 100) * video.duration;
                        video.currentTime = Math.max(0, Math.min(video.duration, targetTime));
                      }
                    } else if (data.chunk) {
                      // Stop loading animation on first real chunk
                      if (firstChunk) {
                        loadingActive = false;
                        clearInterval(loadingInterval);
                        firstChunk = false;
                      }
                      agentResponse += data.chunk;
                      // Update the last line with accumulated response
                      setOutput(prev => {
                        const newOutput = [...prev];
                        newOutput[newOutput.length - 1] = `[Agent ${activeAgent}] ${agentResponse}`;
                        return newOutput;
                      });
                    } else if (data.done && data.output) {
                      loadingActive = false;
                      clearInterval(loadingInterval);
                      agentResponse = data.output;
                      // Final update
                      setOutput(prev => {
                        const newOutput = [...prev];
                        newOutput[newOutput.length - 1] = `[Agent ${activeAgent}] ${agentResponse}`;
                        return newOutput;
                      });
                    }
                  } catch (e) {
                    // Ignore parse errors
                  }
                }
              }
            }
          }
          
          // Cleanup loading animation
          loadingActive = false;
          clearInterval(loadingInterval);
          
          // Save complete message
          if (agentResponse) {
            addAgentMessage(activeAgent, 'assistant', agentResponse);
          }
        } catch (error: any) {
          loadingActive = false;
          setOutput(prev => [...prev, `agent: error - ${error.message}`]);
        }
      }
      setIsProcessing(false);
      return;
    }

    // Handle agent command (must be before agent mode check to allow connecting/switching)
    if (parsed.command === 'agent') {
      // If agent number is provided, connect/switch to that agent
      if (parsed.args.length > 0) {
        const agentId = parseInt(parsed.args[0]);
        if (isNaN(agentId)) {
          setOutput(prev => [...prev, 'agent: invalid agent number']);
          setIsProcessing(false);
          return;
        }
        
        // Disconnect from current agent if switching
        if (activeAgent !== null && activeAgent !== agentId) {
          setOutput(prev => [...prev, `[Agent ${activeAgent}] Disconnected.`]);
        }
        
        let agent = getAgent(agentId);
        if (!agent) {
          agent = {
            id: agentId,
            messages: [],
            createdAt: Date.now(),
          };
          saveAgent(agent);
          setOutput(prev => [...prev, `[Agent ${agentId}] Connected. Type your message or use 'exit' to disconnect.`]);
        } else {
          // Resume existing conversation
          const lastMessages = agent.messages.slice(-5);
          setOutput(prev => [...prev, 
            `[Agent ${agentId}] Resuming conversation...`,
            ...lastMessages.map(msg => 
              `[Agent ${agentId}] ${msg.role === 'user' ? 'You' : 'Agent'}: ${msg.content}`
            ),
            `[Agent ${agentId}] Ready. Type your message or use 'exit' to disconnect.`
          ]);
        }
        
        setActiveAgent(agentId);
        setIsProcessing(false);
        return;
      }
      
      // No agent number provided
      if (activeAgent === null) {
        setOutput(prev => [...prev, 'agent: usage: agent <number>', 'Example: agent 1']);
        setIsProcessing(false);
        return;
      }
      
      // Already in agent mode, no number provided - show help
      setOutput(prev => [...prev, 
        `[Agent ${activeAgent}] Active session.`,
        'Usage:',
        '  agent <number> - Connect to agent',
        '  exit - Disconnect from agent',
        '  Type any message to send to agent'
      ]);
      setIsProcessing(false);
      return;
    }


    // Video control commands
    if (parsed.command === 'play') {
      const video = videoRef.current;
      if (video) {
        video.play();
        setOutput(prev => [...prev, 'QuantumStreaming open.']);
      } else {
        setOutput(prev => [...prev, 'play: QuantumStreaming not found']);
      }
      setIsProcessing(false);
      return;
    }

    if (parsed.command === 'pause') {
      const video = videoRef.current;
      if (video) {
        video.pause();
        setOutput(prev => [...prev, 'QuantumStreaming paused.']);
      } else {
        setOutput(prev => [...prev, 'pause: QuantumStreaming not found']);
      }
      setIsProcessing(false);
      return;
    }

    if (parsed.command === 'mute') {
      const video = videoRef.current;
      if (video) {
        video.muted = !video.muted;
        setIsMuted(video.muted);
        setOutput(prev => [...prev, `QuantumStreaming ${video.muted ? 'muted' : 'unmuted'}.`]);
      } else {
        setOutput(prev => [...prev, 'mute: QuantumStreaming not found']);
      }
      setIsProcessing(false);
      return;
    }

    if (parsed.command === 'restart' || parsed.command === 'reboot') {
      const video = videoRef.current;
      if (video) {
        video.currentTime = 0;
        video.play();
        setOutput(prev => [...prev, 'QuantumStreaming restarted.']);
      } else {
        setOutput(prev => [...prev, `${parsed.command}: QuantumStreaming not found`]);
      }
      setIsProcessing(false);
      return;
    }

    if (parsed.command === 'seek' || parsed.command === 'forward' || parsed.command === 'backward') {
      const video = videoRef.current;
      if (!video) {
        setOutput(prev => [...prev, `${parsed.command}: QuantumStreaming not found`]);
        setIsProcessing(false);
        return;
      }

      const time = parsed.args[0] ? parseFloat(parsed.args[0]) : 10;
      if (parsed.command === 'seek') {
        video.currentTime = Math.max(0, Math.min(video.duration, time));
        setOutput(prev => [...prev, `QuantumStreaming seeked to ${time.toFixed(1)}s.`]);
      } else if (parsed.command === 'forward') {
        video.currentTime = Math.min(video.duration, video.currentTime + time);
        setOutput(prev => [...prev, `QuantumStreaming forwarded ${time}s.`]);
      } else if (parsed.command === 'backward') {
        video.currentTime = Math.max(0, video.currentTime - time);
        setOutput(prev => [...prev, `QuantumStreaming rewound ${time}s.`]);
      }
      setIsProcessing(false);
      return;
    }

    if (parsed.command === 'volume') {
      const video = videoRef.current;
      if (!video) {
        setOutput(prev => [...prev, 'volume: QuantumStreaming not found']);
        setIsProcessing(false);
        return;
      }

      if (parsed.args.length > 0) {
        const vol = parseFloat(parsed.args[0]);
        if (vol >= 0 && vol <= 1) {
          video.volume = vol;
          setOutput(prev => [...prev, `Volume set to ${(vol * 100).toFixed(0)}%.`]);
        } else {
          setOutput(prev => [...prev, 'volume: value must be between 0 and 1']);
        }
      } else {
        setOutput(prev => [...prev, `Current volume: ${(video.volume * 100).toFixed(0)}%`]);
      }
      setIsProcessing(false);
      return;
    }

    if (parsed.command === 'brightness') {
      if (parsed.args.length > 0) {
        const bright = parseFloat(parsed.args[0]);
        if (bright >= 0 && bright <= 100) {
          setBrightness(bright);
          setOutput(prev => [...prev, `Brightness set to ${bright.toFixed(0)}%.`]);
        } else {
          setOutput(prev => [...prev, 'brightness: value must be between 0 and 100']);
        }
      } else {
        setOutput(prev => [...prev, `Current brightness: ${brightness.toFixed(0)}%`]);
      }
      setIsProcessing(false);
      return;
    }

    if (parsed.command === 'censor') {
      if (parsed.args.length > 0) {
        const cens = parseFloat(parsed.args[0]);
        if (cens >= 0 && cens <= 100) {
          setCensor(cens);
          setOutput(prev => [...prev, `Censor (blur) set to ${cens.toFixed(0)}%.`]);
        } else {
          setOutput(prev => [...prev, 'censor: value must be between 0 and 100']);
        }
      } else {
        setOutput(prev => [...prev, `Current censor: ${censor.toFixed(0)}%`]);
      }
      setIsProcessing(false);
      return;
    }


    if (parsed.command === 'help') {
      const allCmds = getAllCommands().sort();
      
      // Group commands by category
      const categories: { [key: string]: string[] } = {
        'File Operations': ['ls', 'cd', 'pwd', 'cat', 'echo', 'touch', 'mkdir', 'rm', 'rmdir', 'cp', 'mv', 'ln', 'stat', 'file', 'tree', 'find', 'locate', 'updatedb', 'basename', 'dirname', 'realpath', 'readlink'],
        'Text Processing': ['head', 'tail', 'grep', 'sed', 'awk', 'cut', 'sort', 'uniq', 'wc', 'tr', 'diff', 'comm', 'paste', 'less', 'more'],
        'File Permissions': ['chmod', 'chown', 'chgrp'],
        'System Info': ['uname', 'hostname', 'uptime', 'date', 'cal', 'whoami', 'id', 'groups', 'w', 'who', 'last', 'df', 'du', 'free', 'lscpu', 'lsblk', 'lsusb', 'lspci', 'dmidecode'],
        'Process Management': ['ps', 'top', 'htop', 'kill', 'killall', 'pkill', 'pgrep', 'pstree', 'nice', 'renice', 'nohup', 'bg', 'fg', 'jobs', 'lsof'],
        'Package Management': ['apt', 'apt-get', 'apt-cache', 'dpkg', 'pip', 'pip3', 'npm', 'yarn'],
        'Network': ['ifconfig', 'ip', 'ping', 'traceroute', 'netstat', 'ss', 'nslookup', 'dig', 'host', 'wget', 'curl', 'ssh', 'scp', 'rsync', 'nc', 'nmap', 'arp', 'route'],
        'User Management': ['useradd', 'userdel', 'usermod', 'groupadd', 'groupdel', 'passwd', 'su', 'sudo'],
        'Archive & Compression': ['tar', 'gzip', 'gunzip', 'zip', 'unzip', 'bzip2', 'bunzip2', 'xz', 'unxz', '7z', 'rar', 'unrar'],
        'System Services': ['systemctl', 'service', 'shutdown', 'reboot', 'dmesg', 'journalctl'],
        'Editors': ['vim', 'nano', 'mc'],
        'Shell & Environment': ['clear', 'history', 'alias', 'export', 'env', 'printenv', 'which', 'whereis', 'man', 'apropos'],
        'Misc Tools': ['time', 'watch', 'xargs', 'tee', 'dd', 'seq', 'md5sum', 'sha256sum'],
        'Security Tools': ['hackit', 'nmap'],
      };
      
      const helpLines: string[] = [
        '',
        '\x1b[1;32m╔══════════════════════════════════════════════════════════════════════╗\x1b[0m',
        '\x1b[1;32m║                    AVAILABLE COMMANDS                                ║\x1b[0m',
        '\x1b[1;32m╚══════════════════════════════════════════════════════════════════════╝\x1b[0m',
        '',
      ];
      
      for (const [category, cmds] of Object.entries(categories)) {
        const availableCmds = cmds.filter(cmd => allCmds.includes(cmd));
        if (availableCmds.length > 0) {
          helpLines.push(`\x1b[1;33m${category}:\x1b[0m`);
          helpLines.push(`  ${availableCmds.join(', ')}`);
          helpLines.push('');
        }
      }
      
      // Find commands not in any category
      const categorizedCmds = Object.values(categories).flat();
      const uncategorized = allCmds.filter(cmd => !categorizedCmds.includes(cmd));
      if (uncategorized.length > 0) {
        helpLines.push('\x1b[1;33mOther:\x1b[0m');
        helpLines.push(`  ${uncategorized.join(', ')}`);
        helpLines.push('');
      }
      
      helpLines.push('\x1b[1;36mSpecial Commands:\x1b[0m');
      helpLines.push('  agent <number>  - Connect to AI temporal agent');
      helpLines.push('  exit            - Disconnect from agent or close session');
      helpLines.push('  help            - Show this help message');
      helpLines.push('');
      helpLines.push('\x1b[1;36mQuantumStreaming Controls:\x1b[0m');
      helpLines.push('  play, pause, mute, restart, reboot');
      helpLines.push('  seek <seconds>, forward [seconds], backward [seconds]');
      helpLines.push('  volume [0-1], brightness [0-100%], censor [0-100%]');
      helpLines.push('');
      helpLines.push('\x1b[1;90mTip: Use arrow keys for command history. Most commands support --help flag.\x1b[0m');
      helpLines.push(`\x1b[1;90mTotal commands available: ${allCmds.length}\x1b[0m`);
      helpLines.push('');
      
      setOutput(prev => [...prev, ...helpLines]);
      setIsProcessing(false);
      return;
    }

    // Try to get handler
    const handler = getCommandHandler(parsed.command);
    
    if (handler) {
      try {
        const result = await handler(parsed, dir);
        if (result) {
          // Handle special markers
          if (result === '__CLEAR__') {
            setOutput([]);
            setIsProcessing(false);
            return;
          }
          
          // Check if result is an array (for animated/multi-line output)
          if (Array.isArray(result)) {
            // Add lines with delay for animation effect
            for (let i = 0; i < result.length; i++) {
              const line = result[i];
              // Check if line starts with animation marker
              if (line.startsWith('__PROGRESS__')) {
                // Update last line instead of adding new one
                const actualLine = line.replace('__PROGRESS__', '');
                setOutput(prev => {
                  const newOutput = [...prev];
                  newOutput[newOutput.length - 1] = actualLine;
                  return newOutput;
                });
                await new Promise(resolve => setTimeout(resolve, 100));
              } else if (line.startsWith('__DELAY__')) {
                // Just wait
                const delay = parseInt(line.replace('__DELAY__', '')) || 100;
                await new Promise(resolve => setTimeout(resolve, delay));
              } else {
                setOutput(prev => [...prev, line]);
                // Small delay between lines for realistic effect
                if (i < result.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 50));
                }
              }
            }
          } else {
            setOutput(prev => [...prev, result]);
          }
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
          // Track failed command
          const newCount = addFailedCommand(parsed.command);
          setFailedCommandCount(newCount);
          setOutput(prev => [...prev, `${parsed.command}: command not found. Type 'agq' to activate Quantum Agent.`]);
          
          // Show AGQ prompt after 3 failed commands (only once)
          if (newCount >= 3 && !agqPromptShown) {
            setAgqPromptShown(true);
            const promptSeq = generateActivationPrompt(newCount);
            const callbacks = createTerminalCallbacks(setOutput, abortSignalRef.current, handleQuantumStream);
            abortSignalRef.current.aborted = false;
            await renderSequence(promptSeq, callbacks);
          }
        }
      } catch (error: any) {
        // Track failed command
        const newCount = addFailedCommand(parsed.command);
        setFailedCommandCount(newCount);
        setOutput(prev => [...prev, `${parsed.command}: command not found. Type 'agq' to activate Quantum Agent.`]);
        
        // Show AGQ prompt after 3 failed commands (only once)
        if (newCount >= 3 && !agqPromptShown) {
          setAgqPromptShown(true);
          const promptSeq = generateActivationPrompt(newCount);
          const callbacks = createTerminalCallbacks(setOutput, abortSignalRef.current, handleQuantumStream);
          abortSignalRef.current.aborted = false;
          await renderSequence(promptSeq, callbacks);
        }
      }
    }

    setIsProcessing(false);
  }, [onLogout, activeAgent, currentDir, censor, brightness, agqPromptShown, agqMode, handleQuantumStream]);

  const startVideo = useCallback(() => {
    const video = videoRef.current;
    if (!videoStartedRef.current && video) {
      videoStartedRef.current = true;
      video.volume = 0.25;
      video.play().catch(() => {
        // Video play failed
      });
    }
  }, []);

  // Tab completion helper
  const getCompletions = useCallback((inputText: string): { completions: string[], prefix: string, isCommand: boolean } => {
    const parts = inputText.split(/\s+/);
    const currentWord = parts[parts.length - 1] || '';
    const isFirstWord = parts.length === 1 || (parts.length === 2 && inputText.endsWith(' ') === false && parts[0] !== '');
    
    // If first word, complete commands
    if (isFirstWord && !inputText.includes(' ')) {
      const allCmds = getAllCommands();
      const matches = allCmds.filter(cmd => cmd.startsWith(currentWord));
      return { completions: matches.sort(), prefix: currentWord, isCommand: true };
    }
    
    // Otherwise, complete file/directory paths
    const dir = getCurrentDir();
    
    // Parse the path
    let searchDir = dir;
    let searchPrefix = currentWord;
    
    if (currentWord.includes('/')) {
      const lastSlash = currentWord.lastIndexOf('/');
      const pathPart = currentWord.substring(0, lastSlash + 1);
      searchPrefix = currentWord.substring(lastSlash + 1);
      
      // Resolve the directory path
      if (pathPart.startsWith('/')) {
        searchDir = pathPart;
      } else {
        searchDir = dir === '/' ? '/' + pathPart : dir + '/' + pathPart;
      }
      searchDir = searchDir.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    }
    
    // Get files in the directory
    const node = getNodeAtPath(searchDir, dir);
    if (!node || node.type !== 'directory' || !node.children) {
      return { completions: [], prefix: currentWord, isCommand: false };
    }
    
    const matches = Object.keys(node.children)
      .filter(name => name.startsWith(searchPrefix))
      .sort()
      .map(name => {
        const child = node.children![name];
        const suffix = child.type === 'directory' ? '/' : '';
        if (currentWord.includes('/')) {
          const lastSlash = currentWord.lastIndexOf('/');
          return currentWord.substring(0, lastSlash + 1) + name + suffix;
        }
        return name + suffix;
      });
    
    return { completions: matches, prefix: currentWord, isCommand: false };
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // CTRL+C - Abort current sequence/process
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      abortSignalRef.current.aborted = true;
      
      if (isProcessing) {
        setOutput(prev => [...prev, '^C']);
        setIsProcessing(false);
      } else if (agqMode) {
        // Exit AGQ mode on CTRL+C
        setOutput(prev => [...prev, '^C', '[AGQ-16.7.9v] Connection interrupted.']);
        setAgqMode(false);
      } else if (input) {
        // Clear current input
        setOutput(prev => [...prev, `root@prod-srv-42:${getCurrentDir()}# ${input}`, '^C']);
        setInput('');
      }
      return;
    }
    
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const { completions, prefix, isCommand } = getCompletions(input);
      
      if (completions.length === 0) {
        // No completions - do nothing
        return;
      } else if (completions.length === 1) {
        // Single match - complete it
        const completion = completions[0];
        const parts = input.split(/\s+/);
        parts[parts.length - 1] = completion;
        const newInput = parts.join(' ') + (isCommand || !completion.endsWith('/') ? ' ' : '');
        setInput(newInput);
      } else {
        // Multiple matches - show them and complete common prefix
        setOutput(prev => [...prev, `root@prod-srv-42:${getCurrentDir()}# ${input}`, completions.join('  ')]);
        
        // Find common prefix
        let commonPrefix = completions[0];
        for (const comp of completions) {
          while (!comp.startsWith(commonPrefix) && commonPrefix.length > 0) {
            commonPrefix = commonPrefix.slice(0, -1);
          }
        }
        
        if (commonPrefix.length > prefix.length) {
          const parts = input.split(/\s+/);
          parts[parts.length - 1] = commonPrefix;
          setInput(parts.join(' '));
        }
      }
      return;
    }
    
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
  }, [input, historyIndex, executeCommand, getCompletions, agqMode, isProcessing]);

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

  useEffect(() => {
    const video = videoRef.current;
    
    // Set default volume but don't auto-play
    if (video) {
      video.volume = 0.25;
    }
  }, []);

  // Render Midnight Commander if active
  if (mcMode) {
    return (
      <MidnightCommander 
        onExit={() => {
          setMcMode(false);
          setOutput(prev => [...prev, 'Midnight Commander exited.']);
        }}
      />
    );
  }

  return (
    <div className="terminal-wrapper">
      <video
        ref={videoRef}
        id="background-video"
        className="background-video"
        autoPlay
        loop
        playsInline
        style={{
          filter: `brightness(${brightness}%) blur(${censor * 0.1}px)`,
        }}
      >
        <source src="/background.mp4" type="video/mp4" />
      </video>
      <div 
        className="video-overlay"
        style={{
          opacity: (100 - brightness) / 100,
          backdropFilter: `blur(${censor * 0.15}px)`,
        }}
      />
      <div 
        className="video-noise"
        style={{
          opacity: Math.min(censor / 50, 0.3),
        }}
      />
      <div className="terminal-container" onClick={() => inputRef.current?.focus()}>
        <div className="terminal-output" ref={outputRef}>
        {output.map((line, index) => {
          // Check if line is an image data URL
          if (line.startsWith('data:image/')) {
            return (
              <div key={index} className="terminal-line terminal-image-container">
                <img 
                  src={line} 
                  alt="Quantum scan result" 
                  className="terminal-scan-image"
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    border: '1px solid #00ffff',
                    margin: '10px 0',
                    display: 'block',
                  }}
                />
              </div>
            );
          }
          
          return (
            <div key={index} className="terminal-line">
              {parseAnsiToReact(line, index)}
            </div>
          );
        })}
        {!isProcessing && (
          <div className="terminal-input-line">
            <span className="terminal-prompt">
              {agqMode ? (
                <span className="prompt-agq" style={{ color: '#c084fc' }}>agq&gt;</span>
              ) : (
                <>
                  <span className="prompt-user">root</span>@<span className="prompt-host">prod-srv-42</span>:<span className="prompt-dir">{displayDir}</span>#
                </>
              )}
            </span>
            <input
              ref={inputRef}
              type="text"
              className="terminal-input"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onContextMenu={handleContextMenu}
              autoFocus
              disabled={isProcessing}
            />
          </div>
        )}
        </div>
      </div>
      <style jsx>{`
        .terminal-wrapper {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          background: #000000;
        }
        
        .background-video {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100vw;
          height: auto;
          min-height: 100vh;
          object-fit: contain;
          object-position: center;
          z-index: 0;
          pointer-events: none;
        }
        
        .video-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: #000000;
          z-index: 0;
          pointer-events: none;
        }
        
        .video-noise {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-image: 
            repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 2px, rgba(255,255,255,0.03) 3px),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 2px, rgba(255,255,255,0.03) 3px);
          background-size: 4px 4px;
          z-index: 0;
          pointer-events: none;
          mix-blend-mode: overlay;
        }
        
        .terminal-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          color: #ffffff;
          font-family: 'Fira Code', 'Source Code Pro', 'Consolas', monospace;
          font-size: 14px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 1;
        }
        
        @media (max-width: 768px) {
          .terminal-container {
            font-size: 12px;
          }
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
          font-family: 'Fira Code', 'Source Code Pro', 'Consolas', monospace;
          font-size: 14px;
          outline: none;
          min-width: 0;
        }
        
        @media (max-width: 768px) {
          .terminal-input {
            font-size: 12px;
          }
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

