// Process management commands (kill, ps, top, htop, etc.)

import { ParsedCommand } from '../commandParser';
import { registerCommand } from './index';

// Simulated process list
function getProcessList(): Array<{pid: number, user: string, cpu: number, mem: number, vsz: number, rss: number, tty: string, stat: string, start: string, time: string, command: string}> {
  return [
    { pid: 1, user: 'root', cpu: 0.0, mem: 0.1, vsz: 168936, rss: 11584, tty: '?', stat: 'Ss', start: 'Nov28', time: '0:02', command: '/sbin/init splash' },
    { pid: 2, user: 'root', cpu: 0.0, mem: 0.0, vsz: 0, rss: 0, tty: '?', stat: 'S', start: 'Nov28', time: '0:00', command: '[kthreadd]' },
    { pid: 456, user: 'root', cpu: 0.0, mem: 0.1, vsz: 15420, rss: 6852, tty: '?', stat: 'Ss', start: 'Nov28', time: '0:00', command: '/usr/sbin/sshd -D' },
    { pid: 789, user: 'root', cpu: 0.1, mem: 0.2, vsz: 21764, rss: 9876, tty: 'pts/0', stat: 'Ss', start: '10:15', time: '0:00', command: '-bash' },
    { pid: 1234, user: 'root', cpu: 0.0, mem: 0.1, vsz: 12456, rss: 3456, tty: 'pts/0', stat: 'R+', start: '10:20', time: '0:00', command: 'ps aux' },
    { pid: 5678, user: 'www-data', cpu: 0.5, mem: 1.2, vsz: 456789, rss: 98765, tty: '?', stat: 'S', start: 'Nov28', time: '1:23', command: 'nginx: worker process' },
    { pid: 5679, user: 'www-data', cpu: 0.3, mem: 1.1, vsz: 456789, rss: 87654, tty: '?', stat: 'S', start: 'Nov28', time: '0:45', command: 'nginx: worker process' },
    { pid: 9012, user: 'mysql', cpu: 1.2, mem: 5.5, vsz: 1876543, rss: 456789, tty: '?', stat: 'Ssl', start: 'Nov28', time: '15:32', command: '/usr/sbin/mysqld' },
    { pid: 3456, user: 'redis', cpu: 0.2, mem: 0.8, vsz: 98765, rss: 65432, tty: '?', stat: 'Ssl', start: 'Nov28', time: '2:15', command: 'redis-server 127.0.0.1:6379' },
    { pid: 7890, user: 'root', cpu: 0.0, mem: 0.3, vsz: 23456, rss: 12345, tty: 'pts/1', stat: 'Ss+', start: '09:30', time: '0:01', command: 'sshd: root@pts/1' },
    { pid: 11111, user: 'node', cpu: 2.5, mem: 3.2, vsz: 987654, rss: 234567, tty: '?', stat: 'Sl', start: 'Nov28', time: '8:45', command: 'node /var/www/app/server.js' },
    { pid: 22222, user: 'postgres', cpu: 0.8, mem: 2.1, vsz: 567890, rss: 178901, tty: '?', stat: 'Ss', start: 'Nov28', time: '3:21', command: 'postgres: main process' },
  ];
}

// ps command (enhanced)
registerCommand('ps', async (parsed: ParsedCommand) => {
  const auxFlag = parsed.flags['a'] || parsed.flags['aux'] || parsed.args.includes('aux');
  const efFlag = parsed.flags['e'] || parsed.flags['ef'] || parsed.args.includes('ef') || parsed.args.includes('-ef');
  
  if (auxFlag || efFlag) {
    const processes = getProcessList();
    const lines = [
      'USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND',
    ];
    
    processes.forEach(p => {
      lines.push(
        `${p.user.padEnd(8)} ${p.pid.toString().padStart(5)} ${p.cpu.toFixed(1).padStart(4)} ${p.mem.toFixed(1).padStart(4)} ${p.vsz.toString().padStart(6)} ${p.rss.toString().padStart(5)} ${p.tty.padEnd(8)} ${p.stat.padEnd(4)} ${p.start.padEnd(5)} ${p.time.padEnd(5)} ${p.command}`
      );
    });
    
    return lines;
  }
  
  return `  PID TTY          TIME CMD
  789 pts/0    00:00:00 bash
 1234 pts/0    00:00:00 ps`;
});

// top command (enhanced with ASCII art)
registerCommand('top', async () => {
  const uptime = `${Math.floor(Math.random() * 30) + 1} days, ${Math.floor(Math.random() * 24)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
  const users = Math.floor(Math.random() * 5) + 1;
  const load = [(Math.random() * 2).toFixed(2), (Math.random() * 1.5).toFixed(2), (Math.random() * 1).toFixed(2)];
  const tasks = { total: Math.floor(Math.random() * 200) + 100, running: Math.floor(Math.random() * 5) + 1, sleeping: 0, stopped: 0, zombie: 0 };
  tasks.sleeping = tasks.total - tasks.running;
  
  const cpuUs = (Math.random() * 20).toFixed(1);
  const cpuSy = (Math.random() * 10).toFixed(1);
  const cpuId = (100 - parseFloat(cpuUs) - parseFloat(cpuSy)).toFixed(1);
  
  const memTotal = 16000;
  const memUsed = Math.floor(Math.random() * 8000) + 2000;
  const memFree = memTotal - memUsed;
  const memBuff = Math.floor(Math.random() * 4000) + 1000;
  
  const swapTotal = 8000;
  const swapUsed = Math.floor(Math.random() * 1000);
  const swapFree = swapTotal - swapUsed;
  
  const lines = [
    `top - ${new Date().toTimeString().split(' ')[0]} up ${uptime},  ${users} user,  load average: ${load.join(', ')}`,
    `Tasks: ${tasks.total} total,   ${tasks.running} running, ${tasks.sleeping} sleeping,   ${tasks.stopped} stopped,   ${tasks.zombie} zombie`,
    `%Cpu(s): ${cpuUs} us, ${cpuSy} sy,  0.0 ni, ${cpuId} id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st`,
    `MiB Mem :  ${memTotal.toFixed(1)} total,   ${memFree.toFixed(1)} free,   ${memUsed.toFixed(1)} used,   ${memBuff.toFixed(1)} buff/cache`,
    `MiB Swap:  ${swapTotal.toFixed(1)} total,   ${swapFree.toFixed(1)} free,   ${swapUsed.toFixed(1)} used.  ${(memFree + memBuff).toFixed(1)} avail Mem`,
    '',
    '    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND',
  ];
  
  const topProcesses = getProcessList()
    .sort((a, b) => b.cpu - a.cpu)
    .slice(0, 10);
  
  topProcesses.forEach(p => {
    lines.push(
      `${p.pid.toString().padStart(7)} ${p.user.padEnd(9)} 20   0 ${p.vsz.toString().padStart(7)} ${p.rss.toString().padStart(6)} ${Math.floor(p.rss * 0.3).toString().padStart(6)} ${p.stat[0]} ${p.cpu.toFixed(1).padStart(5)} ${p.mem.toFixed(1).padStart(5)} ${p.time.padStart(9)} ${p.command.substring(0, 40)}`
    );
  });
  
  lines.push('');
  lines.push('Press q to quit, h for help');
  
  return lines;
});

// htop command (ASCII art version)
registerCommand('htop', async () => {
  const cpus = 4;
  const cpuBars: string[] = [];
  
  for (let i = 0; i < cpus; i++) {
    const usage = Math.random() * 100;
    const width = 40;
    const filled = Math.floor((usage / 100) * width);
    const bar = '|'.repeat(filled) + ' '.repeat(width - filled);
    cpuBars.push(`  ${i + 1}  [${bar}${usage.toFixed(1).padStart(5)}%]`);
  }
  
  const memUsed = Math.floor(Math.random() * 8000) + 2000;
  const memTotal = 16000;
  const memWidth = 40;
  const memFilled = Math.floor((memUsed / memTotal) * memWidth);
  const memBar = '|'.repeat(memFilled) + ' '.repeat(memWidth - memFilled);
  
  const swapUsed = Math.floor(Math.random() * 500);
  const swapTotal = 8000;
  const swapWidth = 40;
  const swapFilled = Math.floor((swapUsed / swapTotal) * swapWidth);
  const swapBar = '|'.repeat(swapFilled) + ' '.repeat(swapWidth - swapFilled);
  
  const lines = [
    ...cpuBars,
    `  Mem[${memBar}${(memUsed/1024).toFixed(1).padStart(5)}G/${(memTotal/1024).toFixed(0)}G]`,
    `  Swp[${swapBar}${(swapUsed/1024).toFixed(2).padStart(5)}G/${(swapTotal/1024).toFixed(0)}G]`,
    '',
    '  PID USER      PRI  NI  VIRT   RES   SHR S CPU% MEM%   TIME+  Command',
  ];
  
  const topProcesses = getProcessList()
    .sort((a, b) => b.cpu - a.cpu)
    .slice(0, 8);
  
  topProcesses.forEach(p => {
    lines.push(
      `${p.pid.toString().padStart(5)} ${p.user.padEnd(9)} 20   0 ${(p.vsz/1024).toFixed(0).padStart(5)}M ${(p.rss/1024).toFixed(0).padStart(5)}M ${(p.rss*0.3/1024).toFixed(0).padStart(5)}M ${p.stat[0]} ${p.cpu.toFixed(1).padStart(4)} ${p.mem.toFixed(1).padStart(4)} ${p.time.padStart(8)} ${p.command.substring(0, 30)}`
    );
  });
  
  lines.push('');
  lines.push('F1Help  F2Setup F3Search F4Filter F5Tree  F6SortBy F7Nice  F8Nice+ F9Kill  F10Quit');
  
  return lines;
});

// kill command
registerCommand('kill', async (parsed: ParsedCommand) => {
  const signal = parsed.flags['9'] || parsed.flags['KILL'] ? 'SIGKILL' : 
                 parsed.flags['15'] || parsed.flags['TERM'] ? 'SIGTERM' :
                 parsed.flags['HUP'] || parsed.flags['1'] ? 'SIGHUP' : 'SIGTERM';
  
  const pids = parsed.args.filter(arg => !arg.startsWith('-'));
  
  if (pids.length === 0) {
    return 'kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]';
  }
  
  // List signals if -l flag
  if (parsed.flags['l'] || parsed.flags['L']) {
    return ` 1) SIGHUP       2) SIGINT       3) SIGQUIT      4) SIGILL       5) SIGTRAP
 6) SIGABRT      7) SIGBUS       8) SIGFPE       9) SIGKILL     10) SIGUSR1
11) SIGSEGV     12) SIGUSR2     13) SIGPIPE     14) SIGALRM     15) SIGTERM
16) SIGSTKFLT   17) SIGCHLD     18) SIGCONT     19) SIGSTOP     20) SIGTSTP
21) SIGTTIN     22) SIGTTOU     23) SIGURG      24) SIGXCPU     25) SIGXFSZ
26) SIGVTALRM   27) SIGPROF     28) SIGWINCH    29) SIGIO       30) SIGPWR
31) SIGSYS      34) SIGRTMIN    35) SIGRTMIN+1  36) SIGRTMIN+2  37) SIGRTMIN+3`;
  }
  
  const results: string[] = [];
  for (const pid of pids) {
    const pidNum = parseInt(pid);
    if (isNaN(pidNum)) {
      results.push(`kill: ${pid}: arguments must be process or job IDs`);
    } else if (pidNum === 1) {
      results.push(`kill: (1) - Operation not permitted`);
    } else {
      // Simulate successful kill
      results.push('');
    }
  }
  
  return results.filter(r => r).join('\n') || '';
});

// killall command
registerCommand('killall', async (parsed: ParsedCommand) => {
  const processName = parsed.args[0];
  
  if (!processName) {
    return 'killall: no process specified';
  }
  
  const processes = getProcessList();
  const matching = processes.filter(p => p.command.includes(processName));
  
  if (matching.length === 0) {
    return `${processName}: no process found`;
  }
  
  return '';
});

// pkill command
registerCommand('pkill', async (parsed: ParsedCommand) => {
  const pattern = parsed.args[0];
  
  if (!pattern) {
    return 'pkill: no matching criteria specified';
  }
  
  return '';
});

// pgrep command
registerCommand('pgrep', async (parsed: ParsedCommand) => {
  const pattern = parsed.args[0];
  const listFlag = parsed.flags['l'] || parsed.flags['list-name'];
  const fullFlag = parsed.flags['f'] || parsed.flags['full'];
  
  if (!pattern) {
    return 'pgrep: pattern that searches for process name or command line required';
  }
  
  const processes = getProcessList();
  const matching = processes.filter(p => 
    fullFlag ? p.command.toLowerCase().includes(pattern.toLowerCase()) : 
    p.command.split(' ')[0].toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (matching.length === 0) {
    return '';
  }
  
  if (listFlag) {
    return matching.map(p => `${p.pid} ${p.command.split(' ')[0]}`).join('\n');
  }
  
  return matching.map(p => p.pid.toString()).join('\n');
});

// pstree command
registerCommand('pstree', async (parsed: ParsedCommand) => {
  const showPids = parsed.flags['p'];
  
  if (showPids) {
    return `systemd(1)─┬─ModemManager(876)─┬─{ModemManager}(901)
           │                   └─{ModemManager}(903)
           ├─NetworkManager(788)─┬─{NetworkManager}(857)
           │                     └─{NetworkManager}(859)
           ├─cron(678)
           ├─dbus-daemon(679)
           ├─login(996)───bash(1234)
           ├─nginx(5677)─┬─nginx(5678)
           │             └─nginx(5679)
           ├─mysqld(9012)─┬─{mysqld}(9013)
           │              ├─{mysqld}(9014)
           │              └─{mysqld}(9015)
           ├─redis-server(3456)─┬─{redis-server}(3457)
           │                    └─{redis-server}(3458)
           ├─sshd(456)───sshd(7890)───bash(789)───pstree(9999)
           └─systemd-journal(345)`;
  }
  
  return `systemd─┬─ModemManager─┬─{ModemManager}
        │              └─{ModemManager}
        ├─NetworkManager─┬─{NetworkManager}
        │                └─{NetworkManager}
        ├─cron
        ├─dbus-daemon
        ├─login───bash
        ├─nginx─┬─nginx
        │       └─nginx
        ├─mysqld─┬─{mysqld}
        │        ├─{mysqld}
        │        └─{mysqld}
        ├─redis-server─┬─{redis-server}
        │              └─{redis-server}
        ├─sshd───sshd───bash───pstree
        └─systemd-journal`;
});

// nice command
registerCommand('nice', async (parsed: ParsedCommand) => {
  const nValue = parsed.flags['n'] ? String(parsed.flags['n']) : '10';
  const cmd = parsed.args.join(' ');
  
  if (!cmd) {
    return '0';
  }
  
  return `Running '${cmd}' with niceness ${nValue}`;
});

// renice command
registerCommand('renice', async (parsed: ParsedCommand) => {
  const priority = parsed.args[0];
  const pid = parsed.args[1];
  
  if (!priority || !pid) {
    return 'renice: Usage: renice [-n] priority [-gpu] identifier';
  }
  
  return `${pid} (process ID) old priority 0, new priority ${priority}`;
});

// nohup command
registerCommand('nohup', async (parsed: ParsedCommand) => {
  const cmd = parsed.args.join(' ');
  
  if (!cmd) {
    return 'nohup: missing operand\nTry \'nohup --help\' for more information.';
  }
  
  return `nohup: ignoring input and appending output to 'nohup.out'`;
});

// bg command
registerCommand('bg', async () => {
  return '[1]+ Running                 sleep 100 &';
});

// fg command
registerCommand('fg', async () => {
  return 'bash: fg: current: no such job';
});

// jobs command
registerCommand('jobs', async () => {
  return `[1]+  Running                 sleep 100 &
[2]-  Stopped                 vim file.txt`;
});

// wait command
registerCommand('wait', async (parsed: ParsedCommand) => {
  const pid = parsed.args[0];
  if (pid) {
    return '';
  }
  return '';
});

// timeout command
registerCommand('timeout', async (parsed: ParsedCommand) => {
  const duration = parsed.args[0];
  const cmd = parsed.args.slice(1).join(' ');
  
  if (!duration || !cmd) {
    return 'timeout: missing operand\nTry \'timeout --help\' for more information.';
  }
  
  return `timeout: command '${cmd}' timed out after ${duration}`;
});

// watch command (simplified)
registerCommand('watch', async (parsed: ParsedCommand) => {
  const interval = parsed.flags['n'] ? String(parsed.flags['n']) : '2';
  const cmd = parsed.args.join(' ');
  
  if (!cmd) {
    return 'Usage: watch [-dhvt] [-n <seconds>] [--differences[=cumulative]] [--help]\n            [--interval=<seconds>] [--no-title] [--version] <command>';
  }
  
  return [
    `Every ${interval}.0s: ${cmd}                                prod-srv-42: ${new Date().toTimeString().split(' ')[0]}`,
    '',
    `Output of: ${cmd}`,
    '(Press Ctrl+C to exit)',
  ];
});

// time command
registerCommand('time', async (parsed: ParsedCommand) => {
  const cmd = parsed.args.join(' ');
  
  if (!cmd) {
    return '';
  }
  
  const real = (Math.random() * 2).toFixed(3);
  const user = (Math.random() * 0.5).toFixed(3);
  const sys = (Math.random() * 0.1).toFixed(3);
  
  return [
    `real    0m${real}s`,
    `user    0m${user}s`,
    `sys     0m${sys}s`,
  ];
});

// strace command (simplified)
registerCommand('strace', async (parsed: ParsedCommand) => {
  const cmd = parsed.args.join(' ');
  
  if (!cmd) {
    return 'strace: must have PROG [ARGS] or -p PID\nTry \'strace -h\' for more information.';
  }
  
  return [
    'execve("/bin/' + cmd.split(' ')[0] + '", ["' + cmd.split(' ')[0] + '"], 0x7ffc6c7e7e00 /* 50 vars */) = 0',
    'brk(NULL)                               = 0x55a6f4b5c000',
    'arch_prctl(0x3001 /* ARCH_??? */, 0x7ffc6c7e5e30) = -1 EINVAL (Invalid argument)',
    'mmap(NULL, 8192, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0) = 0x7f2d6c6e0000',
    'access("/etc/ld.so.preload", R_OK)      = -1 ENOENT (No such file or directory)',
    'openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 3',
    'fstat(3, {st_mode=S_IFREG|0644, st_size=69937, ...}) = 0',
    'mmap(NULL, 69937, PROT_READ, MAP_PRIVATE, 3, 0) = 0x7f2d6c6cf000',
    'close(3)                                = 0',
    '...',
    '+++ exited with 0 +++',
  ];
});

// lsof command
registerCommand('lsof', async (parsed: ParsedCommand) => {
  const iFlag = parsed.flags['i'];
  
  if (iFlag) {
    return [
      'COMMAND     PID     USER   FD   TYPE DEVICE SIZE/OFF NODE NAME',
      'sshd        456     root    3u  IPv4  12345      0t0  TCP *:ssh (LISTEN)',
      'sshd        456     root    4u  IPv6  12346      0t0  TCP *:ssh (LISTEN)',
      'nginx      5677     root    6u  IPv4  23456      0t0  TCP *:http (LISTEN)',
      'nginx      5677     root    7u  IPv4  23457      0t0  TCP *:https (LISTEN)',
      'mysqld     9012    mysql   22u  IPv4  34567      0t0  TCP localhost:mysql (LISTEN)',
      'redis-se   3456    redis    6u  IPv4  45678      0t0  TCP localhost:6379 (LISTEN)',
      `node      11111     node   20u  IPv4  56789      0t0  TCP *:3000 (LISTEN)`,
    ];
  }
  
  return [
    'COMMAND     PID   TID TASKCMD     USER   FD      TYPE DEVICE SIZE/OFF    NODE NAME',
    'systemd       1                   root  cwd       DIR  259,2     4096       2 /',
    'systemd       1                   root  rtd       DIR  259,2     4096       2 /',
    'systemd       1                   root  txt       REG  259,2  1849992 1835017 /usr/lib/systemd/systemd',
    'systemd       1                   root  mem       REG  259,2   613064 1835493 /usr/lib/x86_64-linux-gnu/libpcre2-8.so.0.10.4',
    'sshd        456                   root  cwd       DIR  259,2     4096       2 /',
    'nginx      5677               www-data  cwd       DIR  259,2     4096       2 /',
    'mysqld     9012                  mysql  cwd       DIR  259,2     4096  524290 /var/lib/mysql',
  ];
});

export {};

