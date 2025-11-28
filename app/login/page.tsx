'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  getStoredPassword, 
  getLoginAttempts, 
  incrementLoginAttempts,
  resetLoginAttempts,
  setStoredPassword 
} from '@/lib/storage';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFirstConnection, setIsFirstConnection] = useState(true);
  const [serverIP, setServerIP] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Always show login page - don't auto-redirect
    // Reset attempts on page load (require password even if stored)
    resetLoginAttempts();
    setAttempts(0);

    // Generate random IP and store it
    const ip = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    setServerIP(ip);
    
    const fingerprint = Array.from({ length: 43 }, () => 
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.charAt(Math.floor(Math.random() * 64))
    ).join('');

    // ASCII art for PabloGFX
    const asciiArt = ['Quantum-pipe-q0-2-454-1'
      
    ];

    // Initial connection messages
    const initialOutput = [
      ...asciiArt,
      `$ ssh root@${ip}`,
      '',
      `The authenticity of host '${ip} (${ip})' can't be established.`,
      `ECDSA key fingerprint is SHA256:${fingerprint}.`,
      'Are you sure you want to continue connecting (yes/no/[fingerprint])? yes',
      '',
      `Warning: Permanently added '${ip}' (ECDSA) to the list of known hosts.`,
      '',
      `root@${ip}'s password: `,
    ];

    setOutput(initialOutput);
    setIsFirstConnection(false);
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    if (inputRef.current && !isFirstConnection) {
      inputRef.current.focus();
    }
  }, [isFirstConnection, output]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim() || !serverIP) {
      return;
    }

    setIsConnecting(true);
    
    // Update last line with password dots
    const dots = '*'.repeat(password.length);
    setOutput(prev => {
      const newOutput = [...prev];
      const lastIndex = newOutput.length - 1;
      if (newOutput[lastIndex] && newOutput[lastIndex].includes("'s password:")) {
        newOutput[lastIndex] = `root@${serverIP}'s password: ${dots}`;
      }
      return newOutput;
    });

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

    const storedPassword = getStoredPassword();
    const currentAttempts = incrementLoginAttempts();
    setAttempts(currentAttempts);

    // If password is stored, require exact match
    if (storedPassword) {
      if (password === storedPassword) {
        // Password matches stored password - login successful
        resetLoginAttempts();
        setOutput(prev => [...prev, '']);
        await new Promise(resolve => setTimeout(resolve, 300));
        // Set session and redirect
        sessionStorage.setItem('terminal_session_active', 'true');
        window.location.href = '/'; // Redirect to home page
        return;
      } else {
        // Password doesn't match - show error
        setOutput(prev => [
          ...prev,
          '',
          'Permission denied, please try again.',
          '',
          `root@${serverIP}'s password: `,
        ]);
        setIsConnecting(false);
        setPassword('');
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
        return;
      }
    }

    // No stored password - always succeed on 3rd attempt and save it
    if (currentAttempts >= 3) {
      // Save the password that user "discovered"
      setStoredPassword(password);
      resetLoginAttempts();
      setOutput(prev => [...prev, '']);
      await new Promise(resolve => setTimeout(resolve, 300));
      // Set session and redirect
      sessionStorage.setItem('terminal_session_active', 'true');
      window.location.href = '/'; // Redirect to home page
      return;
    }

    // Fail on first 2 attempts
    setOutput(prev => [
      ...prev,
      '',
      'Permission denied, please try again.',
      '',
      `root@${serverIP}'s password: `,
    ]);
    
    setIsConnecting(false);
    setPassword('');
    
    // Focus input after error
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  return (
    <div className="login-container">
      <div className="terminal-output" ref={outputRef}>
        {output.map((line, index) => (
          <div key={index} className="terminal-line">
            {line}
          </div>
        ))}
        {isConnecting && (
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
          onChange={(e) => {
            setPassword(e.target.value);
            // Update last line with password dots in real-time
            if (serverIP) {
              const dots = '*'.repeat(e.target.value.length);
              setOutput(prev => {
                const newOutput = [...prev];
                const lastIndex = newOutput.length - 1;
                if (newOutput[lastIndex] && newOutput[lastIndex].includes("'s password:")) {
                  newOutput[lastIndex] = `root@${serverIP}'s password: ${dots}`;
                }
                return newOutput;
              });
            }
          }}
          onKeyDown={handleKeyDown}
          autoFocus
          disabled={isConnecting}
          autoComplete="off"
        />
      </form>

      <style jsx>{`
        .login-container {
          width: 100%;
          height: 100vh;
          background: #000000;
          color: #ffffff;
          font-family: 'VT323', monospace;
          font-size: 28px;
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
        
        .login-form {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          pointer-events: auto;
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
          animation: blink 1s infinite;
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
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
        
        @media (max-width: 768px) {
          .login-container {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}

