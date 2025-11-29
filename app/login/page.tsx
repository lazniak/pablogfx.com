'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  getStoredPassword, 
  getLoginAttempts, 
  incrementLoginAttempts,
  resetLoginAttempts,
  setStoredPassword,
  getLastLogin,
  saveCurrentLoginTime
} from '@/lib/storage';

interface OutputLine {
  text: string;
  delay: number; // milliseconds delay before showing this line
}

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPasswordPhase, setIsPasswordPhase] = useState(false);
  const [serverIP, setServerIP] = useState('');
  const [showCursor, setShowCursor] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<boolean>(true);

  // Animate lines one by one with delays
  const animateOutput = useCallback(async (lines: OutputLine[]) => {
    setIsAnimating(true);
    setShowCursor(false);
    
    for (let i = 0; i < lines.length; i++) {
      if (!animationRef.current) break;
      
      await new Promise(resolve => setTimeout(resolve, lines[i].delay));
      
      if (!animationRef.current) break;
      
      setDisplayedLines(prev => [...prev, lines[i].text]);
    }
    
    setIsAnimating(false);
    setShowCursor(true);
    setIsPasswordPhase(true);
    
    // Focus input after animation
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  }, []);

  useEffect(() => {
    // Generate random data for realistic output
    const ip = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    setServerIP(ip);
    
    const fingerprint = Array.from({ length: 43 }, () => 
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
        .charAt(Math.floor(Math.random() * 64))
    ).join('');

    const keyBits = Math.floor(Math.random() * 1000) + 3000;
    const port = 22;
    
    // Realistic SSH connection sequence with varied delays
    const bootSequence: OutputLine[] = [
      { text: '', delay: 200 },
      { text: '╔══════════════════════════════════════════════════════════════╗', delay: 50 },
      { text: '║  QUANTUM-PIPE v0.2.454-1 :: Temporal Bridge Interface        ║', delay: 30 },
      { text: '║  Classification: RESTRICTED                                   ║', delay: 30 },
      { text: '╚══════════════════════════════════════════════════════════════╝', delay: 50 },
      { text: '', delay: 300 },
      { text: `[${new Date().toISOString()}] Initializing secure tunnel...`, delay: 150 },
      { text: `[${new Date().toISOString()}] Probing target node...`, delay: 280 },
      { text: '', delay: 100 },
      { text: `$ ssh -p ${port} root@${ip}`, delay: 450 },
      { text: '', delay: 800 },
      { text: `Connecting to ${ip} port ${port}...`, delay: 350 },
      { text: `Connection established.`, delay: 620 },
      { text: '', delay: 150 },
      { text: `Remote host identification:`, delay: 180 },
      { text: `  Host: ${ip}`, delay: 80 },
      { text: `  Port: ${port}`, delay: 60 },
      { text: `  Protocol: SSH-2.0-OpenSSH_9.6`, delay: 90 },
      { text: '', delay: 200 },
      { text: `The authenticity of host '${ip} (${ip})' can't be established.`, delay: 120 },
      { text: `ED25519 key fingerprint is SHA256:${fingerprint}.`, delay: 180 },
      { text: `This host key is known by the following other names/addresses:`, delay: 140 },
      { text: `    ~/.ssh/known_hosts:${Math.floor(Math.random() * 100) + 1}: [hashed name]`, delay: 100 },
      { text: '', delay: 150 },
      { text: 'Are you sure you want to continue connecting (yes/no/[fingerprint])? yes', delay: 380 },
      { text: '', delay: 250 },
      { text: `Warning: Permanently added '${ip}' (ED25519) to the list of known hosts.`, delay: 220 },
      { text: '', delay: 350 },
      { text: `Authenticating to ${ip}:${port} as 'root'`, delay: 280 },
      { text: `  Authentication methods available: publickey,password`, delay: 150 },
      { text: `  Next authentication method: password`, delay: 180 },
      { text: '', delay: 300 },
      { text: `root@${ip}'s password: `, delay: 200 },
    ];

    // Start animation
    animationRef.current = true;
    animateOutput(bootSequence);

    // Reset attempts counter
    resetLoginAttempts();
    setAttempts(0);

    return () => {
      animationRef.current = false;
    };
  }, [animateOutput]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [displayedLines]);

  const showLoginFailure = async () => {
    setShowCursor(false);
    setIsPasswordPhase(false);
    
    const failureSequence: OutputLine[] = [
      { text: '', delay: 400 },
      { text: `Received disconnect from ${serverIP} port 22:2: Too many authentication failures`, delay: 180 },
      { text: 'Permission denied, please try again.', delay: 120 },
      { text: '', delay: 250 },
      { text: `root@${serverIP}'s password: `, delay: 200 },
    ];

    for (const line of failureSequence) {
      await new Promise(resolve => setTimeout(resolve, line.delay));
      setDisplayedLines(prev => [...prev, line.text]);
    }

    setShowCursor(true);
    setIsPasswordPhase(true);
    setPassword('');
    setIsConnecting(false);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const showLoginSuccess = async () => {
    setShowCursor(false);
    setIsPasswordPhase(false);
    
    // Get stored last login (or default: April 16, 2049 16:16:16)
    const lastLoginInfo = getLastLogin();
    
    const successSequence: OutputLine[] = [
      { text: '', delay: 600 },
      { text: 'Authenticated successfully.', delay: 250 },
      { text: '', delay: 180 },
      { text: `Last login: ${lastLoginInfo.timestamp} from ${lastLoginInfo.ip}`, delay: 220 },
      { text: '', delay: 150 },
      { text: 'Establishing secure channel...', delay: 380 },
      { text: '[OK] Cryptographic handshake complete', delay: 280 },
      { text: '[OK] Session encryption: AES-256-GCM', delay: 150 },
      { text: '[OK] Integrity verification: PASSED', delay: 180 },
      { text: '', delay: 300 },
      { text: 'Loading temporal interface...', delay: 450 },
      { text: '', delay: 200 },
    ];

    for (const line of successSequence) {
      await new Promise(resolve => setTimeout(resolve, line.delay));
      setDisplayedLines(prev => [...prev, line.text]);
    }

    // Save current login time for next session
    saveCurrentLoginTime();

    // Wait a moment then redirect
    await new Promise(resolve => setTimeout(resolve, 500));
    
    sessionStorage.setItem('terminal_session_active', 'true');
    window.location.href = '/';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim() || !serverIP || isAnimating || isConnecting) {
      return;
    }

    setIsConnecting(true);
    setShowCursor(false);
    
    // Update last line with password dots
    const dots = '*'.repeat(password.length);
    setDisplayedLines(prev => {
      const newOutput = [...prev];
      const lastIndex = newOutput.length - 1;
      if (newOutput[lastIndex] && newOutput[lastIndex].includes("'s password:")) {
        newOutput[lastIndex] = `root@${serverIP}'s password: ${dots}`;
      }
      return newOutput;
    });

    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 800));

    const storedPassword = getStoredPassword();
    const currentAttempts = incrementLoginAttempts();
    setAttempts(currentAttempts);

    // If password is stored, require exact match
    if (storedPassword) {
      if (password === storedPassword) {
        // Password matches - login successful
        resetLoginAttempts();
        await showLoginSuccess();
        return;
      } else {
        // Wrong password
        await showLoginFailure();
        return;
      }
    }

    // No stored password - succeed on 3rd attempt and save it
    if (currentAttempts >= 3) {
      // Save the password that user "discovered"
      setStoredPassword(password);
      resetLoginAttempts();
      await showLoginSuccess();
      return;
    }

    // Fail on first 2 attempts
    await showLoginFailure();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    
    // Update last line with password dots in real-time
    if (serverIP && isPasswordPhase) {
      const dots = '*'.repeat(newPassword.length);
      setDisplayedLines(prev => {
        const newOutput = [...prev];
        const lastIndex = newOutput.length - 1;
        if (newOutput[lastIndex] && newOutput[lastIndex].includes("'s password:")) {
          newOutput[lastIndex] = `root@${serverIP}'s password: ${dots}`;
        }
        return newOutput;
      });
    }
  };

  return (
    <div className="login-container" onClick={() => inputRef.current?.focus()}>
      <div className="scanline"></div>
      <div className="terminal-output" ref={outputRef}>
        {displayedLines.map((line, index) => (
          <div key={index} className="terminal-line">
            {line}
            {/* Show cursor on last line when in password phase */}
            {index === displayedLines.length - 1 && showCursor && isPasswordPhase && (
              <span className="cursor-blink">█</span>
            )}
          </div>
        ))}
        {isAnimating && (
          <div className="terminal-line">
            <span className="cursor-blink">█</span>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="login-form">
        <input
          ref={inputRef}
          type="text"
          className="login-input"
          value={password}
          onChange={handlePasswordChange}
          onKeyDown={handleKeyDown}
          autoFocus
          disabled={isConnecting || isAnimating}
          autoComplete="off"
          spellCheck="false"
        />
      </form>

      <style jsx>{`
        .login-container {
          width: 100%;
          height: 100vh;
          background: #0a0a0a;
          color: #00ff00;
          font-family: 'Fira Code', 'Source Code Pro', 'Consolas', monospace;
          font-size: 14px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }

        .scanline {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.15),
            rgba(0, 0, 0, 0.15) 1px,
            transparent 1px,
            transparent 2px
          );
          pointer-events: none;
          z-index: 10;
        }
        
        .terminal-output {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          line-height: 1.6;
          z-index: 1;
        }
        
        .terminal-line {
          white-space: pre-wrap;
          word-wrap: break-word;
          color: #00ff00;
          text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
          min-height: 1.6em;
        }
        
        .login-form {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          pointer-events: auto;
          z-index: 5;
        }
        
        .login-input {
          width: 100%;
          height: 100%;
          border: none;
          background: transparent;
          color: transparent;
          outline: none;
          caret-color: transparent;
        }
        
        .cursor-blink {
          animation: blink 0.8s infinite;
          color: #00ff00;
        }
        
        @keyframes blink {
          0%, 45% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        
        .terminal-output::-webkit-scrollbar {
          width: 8px;
        }
        
        .terminal-output::-webkit-scrollbar-track {
          background: #0a0a0a;
        }
        
        .terminal-output::-webkit-scrollbar-thumb {
          background: #00ff00;
          border-radius: 4px;
          opacity: 0.3;
        }
        
        .terminal-output::-webkit-scrollbar-thumb:hover {
          background: #00cc00;
        }
        
        @media (max-width: 768px) {
          .login-container {
            font-size: 14px;
          }
          
          .terminal-output {
            padding: 10px;
          }
        }
      `}</style>
    </div>
  );
}
