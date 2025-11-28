'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { parseCommand } from '@/lib/commandParser';
import { getCommandHandler } from '@/lib/commands';
import { 
  getCurrentDir, 
  setCurrentDir, 
  addToHistory, 
  getCommandHistory,
  getStoredPassword,
  getAgent,
  addAgentMessage,
  saveAgent,
  type Agent
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
  const [isMuted, setIsMuted] = useState(false);
  const [brightness, setBrightness] = useState(40); // 0-100%
  const [censor, setCensor] = useState(25); // 0-100% blur
  const [activeAgent, setActiveAgent] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const history = useRef<string[]>([]);
  const videoStartedRef = useRef(false);

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
    // Generate random future date (1-365 days from now) - temporal bridge
    const daysAhead = Math.floor(Math.random() * 365) + 1;
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    
    // Format future date like: "Mon Dec 15 14:23:45 2026"
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[futureDate.getUTCDay()];
    const month = months[futureDate.getUTCMonth()];
    const day = futureDate.getUTCDate();
    const hours = String(futureDate.getUTCHours()).padStart(2, '0');
    const minutes = String(futureDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(futureDate.getUTCSeconds()).padStart(2, '0');
    const year = futureDate.getUTCFullYear();
    const lastLogin = `${dayName} ${month} ${day} ${hours}:${minutes}:${seconds} ${year}`;
    
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
      `[mostek czasowy] Last login: ${lastLogin} from ${lastLoginIP}`,
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

    // If in agent mode, treat all input as messages to agent (except exit/clear/agent which are handled above)
    // This must be checked BEFORE other commands to catch all input when in agent mode
    if (activeAgent !== null && parsed.command !== 'agent') {
      const message = cmd.trim();
      if (message) {
        addAgentMessage(activeAgent, 'user', message);
        setOutput(prev => [...prev, `[Agent ${activeAgent}] You: ${message}`]);
        
        try {
          const agent = getAgent(activeAgent);
          const history = agent?.messages || [];
          
          const response = await fetch('/api/agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentId: activeAgent,
              message,
              history: history.slice(-10),
            }),
          });
          
          if (!response.ok) {
            throw new Error('Failed to get agent response');
          }
          
          // Handle streaming response
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let agentResponse = '';
          let buffer = '';
          
          // Add initial line for agent response
          setOutput(prev => [...prev, `[Agent ${activeAgent}] `]);
          
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
                      agentResponse += data.chunk;
                      // Update the last line with accumulated response
                      setOutput(prev => {
                        const newOutput = [...prev];
                        // Update the last line (agent response line)
                        newOutput[newOutput.length - 1] = `[Agent ${activeAgent}] ${agentResponse}`;
                        return newOutput;
                      });
                    } else if (data.done && data.output) {
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
          
          // Save complete message
          if (agentResponse) {
            addAgentMessage(activeAgent, 'assistant', agentResponse);
          }
        } catch (error: any) {
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
      setOutput(prev => [...prev, 
        'Available commands:',
        '  ls, cd, pwd, cat, echo, whoami, hostname, date',
        '  touch, mkdir, rm, rmdir, cp, mv, chmod, chown',
        '  grep, find, ps, top, df, du, free, uname',
        '  vim, nano, mc (Midnight Commander)',
        '  pip install <package>',
        '  wget, curl',
        '  hackit (use hackit -h for help)',
        '  agent <number> - Connect to AI agent',
        '  clear, exit, help',
        '',
        'QuantumStreaming controls:',
        '  play, pause, mute, restart, reboot',
        '  seek <seconds>, forward [seconds], backward [seconds]',
        '  volume [0-1], brightness [0-100%], censor [0-100%]',
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
  }, [onLogout, activeAgent, currentDir, censor, brightness]);

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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    startVideo(); // Start video on any key press
    
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
  }, [input, historyIndex, executeCommand, startVideo]);

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
    
    // Set default volume
    if (video) {
      video.volume = 0.25;
    }

    // Try to play immediately
    if (video) {
      video.play().catch(() => {
        // Auto-play blocked, will start on first interaction
      });
    }
  }, []);

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
              onChange={(e) => {
                setInput(e.target.value);
                startVideo(); // Start video on input change
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onContextMenu={handleContextMenu}
              onClick={() => startVideo()} // Start video on click
              onFocus={() => startVideo()} // Start video on focus
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
          font-family: 'VT323', monospace;
          font-size: 28px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 1;
        }
        
        @media (max-width: 768px) {
          .terminal-container {
            font-size: 14px;
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
          font-family: 'VT323', monospace;
          font-size: 28px;
          outline: none;
          min-width: 0;
        }
        
        @media (max-width: 768px) {
          .terminal-input {
            font-size: 14px;
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

