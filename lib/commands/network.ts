// Network commands (ping, ssh, nmap, ifconfig, etc.)

import { ParsedCommand } from '../commandParser';
import { registerCommand, getCommandHandler } from './registry';
import { generatePingOutput, generateTracerouteOutput, generateNmapProgress } from '../progressBar';

// ifconfig command
registerCommand('ifconfig', async (parsed: ParsedCommand) => {
  const iface = parsed.args[0];
  
  const eth0 = `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.${Math.floor(Math.random() * 254) + 1}  netmask 255.255.255.0  broadcast 192.168.1.255
        inet6 fe80::${Math.floor(Math.random() * 9999).toString(16)}:${Math.floor(Math.random() * 9999).toString(16)}:${Math.floor(Math.random() * 9999).toString(16)}:${Math.floor(Math.random() * 9999).toString(16)}  prefixlen 64  scopeid 0x20<link>
        ether ${Array(6).fill(0).map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':')}  txqueuelen 1000  (Ethernet)
        RX packets ${Math.floor(Math.random() * 1000000)}  bytes ${Math.floor(Math.random() * 1000000000)} (${(Math.random() * 900 + 100).toFixed(1)} MiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets ${Math.floor(Math.random() * 500000)}  bytes ${Math.floor(Math.random() * 500000000)} (${(Math.random() * 500 + 50).toFixed(1)} MiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0`;

  const lo = `lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)
        RX packets ${Math.floor(Math.random() * 100000)}  bytes ${Math.floor(Math.random() * 10000000)} (${(Math.random() * 10 + 1).toFixed(1)} MiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets ${Math.floor(Math.random() * 100000)}  bytes ${Math.floor(Math.random() * 10000000)} (${(Math.random() * 10 + 1).toFixed(1)} MiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0`;

  if (iface === 'eth0') {
    return eth0;
  } else if (iface === 'lo') {
    return lo;
  }
  
  return eth0 + '\n\n' + lo;
});

// ip command
registerCommand('ip', async (parsed: ParsedCommand) => {
  const subcommand = parsed.args[0];
  
  if (!subcommand) {
    return `Usage: ip [ OPTIONS ] OBJECT { COMMAND | help }
       ip [ -force ] -batch filename
where  OBJECT := { address | addrlabel | fou | help | ila | ioam | l2tp |
                   link | macsec | maddress | monitor | mptcp | mroute |
                   mrule | neighbor | neighbour | netconf | netns | nexthop |
                   ntable | ntbl | route | rule | sr | tap | tcpmetrics |
                   token | tunnel | tuntap | vrf | xfrm }`;
  }
  
  switch (subcommand) {
    case 'addr':
    case 'address':
    case 'a':
      return `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host 
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether ${Array(6).fill(0).map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':')} brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.${Math.floor(Math.random() * 254) + 1}/24 brd 192.168.1.255 scope global dynamic eth0
       valid_lft 86400sec preferred_lft 86400sec
    inet6 fe80::${Math.floor(Math.random() * 9999).toString(16)}:${Math.floor(Math.random() * 9999).toString(16)}:${Math.floor(Math.random() * 9999).toString(16)}:${Math.floor(Math.random() * 9999).toString(16)}/64 scope link 
       valid_lft forever preferred_lft forever`;
    
    case 'route':
    case 'r':
      return `default via 192.168.1.1 dev eth0 proto dhcp metric 100 
192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.${Math.floor(Math.random() * 254) + 1} metric 100`;
    
    case 'link':
    case 'l':
      return `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP mode DEFAULT group default qlen 1000
    link/ether ${Array(6).fill(0).map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':')} brd ff:ff:ff:ff:ff:ff`;
    
    case 'neigh':
    case 'neighbour':
      return `192.168.1.1 dev eth0 lladdr ${Array(6).fill(0).map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':')} REACHABLE
192.168.1.${Math.floor(Math.random() * 254) + 1} dev eth0 lladdr ${Array(6).fill(0).map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':')} STALE`;
    
    default:
      return `Object "${subcommand}" is unknown, try "ip help".`;
  }
});

// netstat command
registerCommand('netstat', async (parsed: ParsedCommand) => {
  const tulpn = parsed.flags['t'] || parsed.flags['u'] || parsed.flags['l'] || parsed.flags['p'] || parsed.flags['n'];
  
  const connections = [
    { proto: 'tcp', local: '0.0.0.0:22', foreign: '0.0.0.0:*', state: 'LISTEN', pid: '1234/sshd' },
    { proto: 'tcp', local: '0.0.0.0:80', foreign: '0.0.0.0:*', state: 'LISTEN', pid: '5678/nginx' },
    { proto: 'tcp', local: '0.0.0.0:443', foreign: '0.0.0.0:*', state: 'LISTEN', pid: '5678/nginx' },
    { proto: 'tcp', local: '127.0.0.1:3306', foreign: '0.0.0.0:*', state: 'LISTEN', pid: '9012/mysqld' },
    { proto: 'tcp', local: '127.0.0.1:6379', foreign: '0.0.0.0:*', state: 'LISTEN', pid: '3456/redis-server' },
    { proto: 'tcp', local: `192.168.1.${Math.floor(Math.random() * 254) + 1}:22`, foreign: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}:${Math.floor(Math.random() * 60000) + 1024}`, state: 'ESTABLISHED', pid: '7890/sshd' },
    { proto: 'udp', local: '0.0.0.0:68', foreign: '0.0.0.0:*', state: '', pid: '123/dhclient' },
  ];
  
  const lines = [
    'Active Internet connections (only servers)',
    'Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name',
  ];
  
  connections.forEach(c => {
    lines.push(`${c.proto.padEnd(5)} 0      0      ${c.local.padEnd(23)} ${c.foreign.padEnd(23)} ${c.state.padEnd(11)} ${c.pid}`);
  });
  
  return lines;
});

// ss command
registerCommand('ss', async (parsed: ParsedCommand) => {
  const lines = [
    'Netid  State   Recv-Q  Send-Q    Local Address:Port      Peer Address:Port  Process',
    'tcp    LISTEN  0       128             0.0.0.0:22             0.0.0.0:*      users:(("sshd",pid=1234,fd=3))',
    'tcp    LISTEN  0       511             0.0.0.0:80             0.0.0.0:*      users:(("nginx",pid=5678,fd=6))',
    'tcp    LISTEN  0       511             0.0.0.0:443            0.0.0.0:*      users:(("nginx",pid=5678,fd=7))',
    'tcp    LISTEN  0       151           127.0.0.1:3306           0.0.0.0:*      users:(("mysqld",pid=9012,fd=22))',
    'tcp    LISTEN  0       128           127.0.0.1:6379           0.0.0.0:*      users:(("redis-server",pid=3456,fd=6))',
    `tcp    ESTAB   0       0       192.168.1.${Math.floor(Math.random() * 254) + 1}:22    ${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}:${Math.floor(Math.random() * 60000) + 1024}   users:(("sshd",pid=7890,fd=4))`,
  ];
  
  return lines;
});

// ping command
registerCommand('ping', async (parsed: ParsedCommand) => {
  const host = parsed.args[0];
  
  if (!host) {
    return 'ping: usage error: Destination address required';
  }
  
  const count = parsed.flags['c'] ? parseInt(String(parsed.flags['c'])) : 4;
  return generatePingOutput(host, Math.min(count, 10));
});

// traceroute command
registerCommand('traceroute', async (parsed: ParsedCommand) => {
  const host = parsed.args[0];
  
  if (!host) {
    return 'Usage: traceroute [OPTION...] HOST';
  }
  
  return generateTracerouteOutput(host);
});

// tracepath command (similar to traceroute)
registerCommand('tracepath', async (parsed: ParsedCommand) => {
  const host = parsed.args[0];
  
  if (!host) {
    return 'Usage: tracepath [-n] [-b] [-l pktlen] [-m max_hops] [-p port] destination';
  }
  
  const lines = [`1?: [LOCALHOST]                       pmtu 1500`];
  const hops = Math.floor(Math.random() * 10) + 5;
  
  for (let i = 1; i <= hops; i++) {
    const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const time = (Math.random() * 50 + 1).toFixed(3);
    lines.push(` ${i}:  ${ip}                             ${time}ms`);
  }
  
  lines.push(`     Resume: pmtu 1500 hops ${hops} back ${hops}`);
  return lines;
});

// nslookup command
registerCommand('nslookup', async (parsed: ParsedCommand) => {
  const domain = parsed.args[0];
  
  if (!domain) {
    return 'Usage: nslookup [-option] [name | -] [server]';
  }
  
  const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  
  return [
    'Server:		127.0.0.53',
    'Address:	127.0.0.53#53',
    '',
    'Non-authoritative answer:',
    `Name:	${domain}`,
    `Address: ${ip}`,
    `Name:	${domain}`,
    `Address: 2606:4700:${Math.floor(Math.random() * 9999).toString(16)}:${Math.floor(Math.random() * 9999).toString(16)}::${Math.floor(Math.random() * 9999).toString(16)}`,
  ];
});

// dig command
registerCommand('dig', async (parsed: ParsedCommand) => {
  const domain = parsed.args[0];
  
  if (!domain) {
    return `; <<>> DiG 9.18.18-0ubuntu0.22.04.1-Ubuntu <<>>
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: ${Math.floor(Math.random() * 65535)}
;; flags: qr rd ra; QUERY: 1, ANSWER: 0, AUTHORITY: 0, ADDITIONAL: 1`;
  }
  
  const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  const ttl = Math.floor(Math.random() * 3600) + 300;
  
  return [
    `; <<>> DiG 9.18.18-0ubuntu0.22.04.1-Ubuntu <<>> ${domain}`,
    ';; global options: +cmd',
    ';; Got answer:',
    `;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: ${Math.floor(Math.random() * 65535)}`,
    ';; flags: qr rd ra; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 1',
    '',
    ';; OPT PSEUDOSECTION:',
    '; EDNS: version: 0, flags:; udp: 65494',
    ';; QUESTION SECTION:',
    `;${domain}.			IN	A`,
    '',
    ';; ANSWER SECTION:',
    `${domain}.		${ttl}	IN	A	${ip}`,
    `${domain}.		${ttl}	IN	A	${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    '',
    `;; Query time: ${Math.floor(Math.random() * 50) + 5} msec`,
    ';; SERVER: 127.0.0.53#53(127.0.0.53) (UDP)',
    `;; WHEN: ${new Date().toUTCString()}`,
    `;; MSG SIZE  rcvd: ${Math.floor(Math.random() * 100) + 60}`,
  ];
});

// host command
registerCommand('host', async (parsed: ParsedCommand) => {
  const domain = parsed.args[0];
  
  if (!domain) {
    return 'Usage: host [-aCdilrTvVw] [-c class] [-N ndots] [-t type] [-W time]\n            [-R number] [-m flag] [-4] [-6] hostname [server]';
  }
  
  const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  
  return [
    `${domain} has address ${ip}`,
    `${domain} has address ${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    `${domain} has IPv6 address 2606:4700:${Math.floor(Math.random() * 9999).toString(16)}:${Math.floor(Math.random() * 9999).toString(16)}::${Math.floor(Math.random() * 9999).toString(16)}`,
    `${domain} mail is handled by 10 mail.${domain}.`,
  ];
});

// ssh command (simulated)
registerCommand('ssh', async (parsed: ParsedCommand) => {
  const target = parsed.args[0];
  
  if (!target) {
    return 'usage: ssh [-46AaCfGgKkMNnqsTtVvXxYy] [-B bind_interface]\n           [-b bind_address] [-c cipher_spec] [-D [bind_address:]port]\n           [-E log_file] [-e escape_char] [-F configfile] [-I pkcs11]\n           [-i identity_file] [-J [user@]host[:port]] [-L address]\n           [-l login_name] [-m mac_spec] [-O ctl_cmd] [-o option] [-p port]\n           [-Q query_option] [-R address] [-S ctl_path] [-W host:port]\n           [-w local_tun[:remote_tun]] destination [command [argument ...]]';
  }
  
  const user = target.includes('@') ? target.split('@')[0] : 'root';
  const host = target.includes('@') ? target.split('@')[1] : target;
  
  return [
    `The authenticity of host '${host} (${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)})' can't be established.`,
    `ED25519 key fingerprint is SHA256:${Array(43).fill(0).map(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'[Math.floor(Math.random() * 64)]).join('')}.`,
    `This key is not known by any other names.`,
    `Are you sure you want to continue connecting (yes/no/[fingerprint])? yes`,
    `Warning: Permanently added '${host}' (ED25519) to the list of known hosts.`,
    `${user}@${host}'s password: `,
    `Connection to ${host} closed.`,
  ];
});

// scp command (simulated)
registerCommand('scp', async (parsed: ParsedCommand) => {
  const args = parsed.args;
  
  if (args.length < 2) {
    return 'usage: scp [-346ABCOpqRrsTv] [-c cipher] [-D sftp_server_path] [-F ssh_config]\n           [-i identity_file] [-J destination] [-l limit] [-o ssh_option]\n           [-P port] [-S program] [-X sftp_option] source ... target';
  }
  
  const src = args[0];
  const dst = args[1];
  const filename = src.split('/').pop() || 'file';
  const size = Math.floor(Math.random() * 10000) + 100;
  
  const lines: string[] = [];
  for (let i = 0; i <= 10; i++) {
    const percent = i * 10;
    const width = 25;
    const filled = Math.round((i / 10) * width);
    const bar = '*'.repeat(filled) + ' '.repeat(width - filled);
    const speed = (Math.random() * 10 + 1).toFixed(1);
    lines.push(`${filename}          ${percent}% |${bar}| ${(size * i / 10).toFixed(0)}KB  ${speed}MB/s    ${10 - i}:00 ETA`);
  }
  lines.push(`${filename}          100% |${'*'.repeat(25)}| ${size}KB  ${(Math.random() * 10 + 5).toFixed(1)}MB/s    0:00`);
  
  return lines;
});

// rsync command (simulated)
registerCommand('rsync', async (parsed: ParsedCommand) => {
  const args = parsed.args;
  
  if (args.length < 2) {
    return 'rsync  version 3.2.7  protocol version 31\nUsage: rsync [OPTION]... SRC [SRC]... DEST\n  or   rsync [OPTION]... SRC [SRC]... [USER@]HOST:DEST';
  }
  
  const src = args[0];
  const dst = args[1];
  
  const files = [
    'config.json',
    'package.json',
    'src/index.ts',
    'src/utils.ts',
    'src/components/App.tsx',
    'public/index.html',
    'README.md',
  ];
  
  const lines = [
    'sending incremental file list',
  ];
  
  let totalSize = 0;
  files.forEach(f => {
    const size = Math.floor(Math.random() * 50000) + 1000;
    totalSize += size;
    lines.push(f);
  });
  
  lines.push('');
  lines.push(`sent ${totalSize} bytes  received ${Math.floor(totalSize * 0.01)} bytes  ${(totalSize * 2).toFixed(2)} bytes/sec`);
  lines.push(`total size is ${totalSize}  speedup is ${(Math.random() * 10 + 1).toFixed(2)}`);
  
  return lines;
});

// nc (netcat) command
registerCommand('nc', async (parsed: ParsedCommand) => {
  const listenFlag = parsed.flags['l'];
  const verboseFlag = parsed.flags['v'];
  
  if (listenFlag) {
    const port = parsed.args[0] || '8080';
    return [
      `Listening on 0.0.0.0 ${port}`,
      `Connection received from ${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}:${Math.floor(Math.random() * 60000) + 1024}`,
    ];
  }
  
  const host = parsed.args[0];
  const port = parsed.args[1];
  
  if (!host || !port) {
    return 'usage: nc [-46CDdFhklNnrStUuvZz] [-I length] [-i interval] [-M ttl]\n          [-m minttl] [-O length] [-P proxy_username] [-p source_port]\n          [-q seconds] [-s sourceaddr] [-T keyword] [-V rtable] [-W recvlimit]\n          [-w timeout] [-X proxy_protocol] [-x proxy_address[:port]]\n          [destination] [port]';
  }
  
  if (verboseFlag) {
    return [
      `Connection to ${host} ${port} port [tcp/*] succeeded!`,
    ];
  }
  
  return '';
});

// netcat alias
registerCommand('netcat', async (parsed: ParsedCommand) => {
  const handler = getCommandHandler('nc');
  if (handler) {
    return handler(parsed, '');
  }
  return 'netcat: command not found';
});

// nmap command
registerCommand('nmap', async (parsed: ParsedCommand) => {
  const target = parsed.args[0];
  
  if (!target) {
    return `Nmap 7.94 ( https://nmap.org )
Usage: nmap [Scan Type(s)] [Options] {target specification}
TARGET SPECIFICATION:
  Can pass hostnames, IP addresses, networks, etc.
  Ex: scanme.nmap.org, microsoft.com/24, 192.168.0.1; 10.0.0-255.1-254
SCAN TECHNIQUES:
  -sS/sT/sA/sW/sM: TCP SYN/Connect()/ACK/Window/Maimon scans
  -sU: UDP Scan
  -sN/sF/sX: TCP Null, FIN, and Xmas scans
  -sV: Probe open ports to determine service/version info
EXAMPLES:
  nmap -v -A scanme.nmap.org
  nmap -v -sn 192.168.0.0/16 10.0.0.0/8
  nmap -v -iR 10000 -Pn -p 80`;
  }
  
  return generateNmapProgress(target);
});

// wget command (enhanced)
registerCommand('wget', async (parsed: ParsedCommand) => {
  const url = parsed.args[0];
  
  if (!url) {
    return 'wget: missing URL\nUsage: wget [OPTION]... [URL]...';
  }
  
  const filename = url.split('/').pop() || 'index.html';
  const size = Math.floor(Math.random() * 5000000) + 100000;
  const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  
  const lines: string[] = [
    `--${new Date().toISOString().replace('T', ' ').split('.')[0]}--  ${url}`,
    `Resolving ${new URL(url).hostname}... ${ip}`,
    `Connecting to ${new URL(url).hostname}|${ip}|:${url.startsWith('https') ? '443' : '80'}... connected.`,
    'HTTP request sent, awaiting response... 200 OK',
    `Length: ${size} (${(size / 1024 / 1024).toFixed(1)}M) [${filename.endsWith('.html') ? 'text/html' : 'application/octet-stream'}]`,
    `Saving to: '${filename}'`,
    '',
  ];
  
  for (let i = 1; i <= 10; i++) {
    const percent = i * 10;
    const width = 50;
    const filled = Math.round((i / 10) * width);
    const bar = '='.repeat(filled - 1) + '>' + ' '.repeat(width - filled);
    const speed = (Math.random() * 5 + 1).toFixed(2);
    const eta = 10 - i;
    lines.push(`${filename.substring(0, 20).padEnd(20)} ${percent}%[${bar}] ${((size * i) / 10 / 1024).toFixed(0)}K  ${speed}MB/s  eta ${eta}s`);
  }
  
  lines.push('');
  lines.push(`${new Date().toISOString().replace('T', ' ').split('.')[0]} (${(Math.random() * 5 + 2).toFixed(2)} MB/s) - '${filename}' saved [${size}/${size}]`);
  
  return lines;
});

// curl command (enhanced)
registerCommand('curl', async (parsed: ParsedCommand) => {
  const url = parsed.args[0];
  const headFlag = parsed.flags['I'] || parsed.flags['head'];
  const silentFlag = parsed.flags['s'] || parsed.flags['silent'];
  const outputFlag = parsed.flags['o'] || parsed.flags['output'];
  const verboseFlag = parsed.flags['v'] || parsed.flags['verbose'];
  
  if (!url) {
    return 'curl: try \'curl --help\' for more information';
  }
  
  if (headFlag) {
    return [
      'HTTP/2 200',
      `date: ${new Date().toUTCString()}`,
      'content-type: text/html; charset=utf-8',
      `content-length: ${Math.floor(Math.random() * 50000) + 5000}`,
      'server: nginx/1.18.0',
      'x-powered-by: Next.js',
      'cache-control: public, max-age=3600',
      'etag: "abc123def456"',
      '',
    ];
  }
  
  if (verboseFlag) {
    const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    return [
      `*   Trying ${ip}:443...`,
      '* Connected to ' + (url.includes('://') ? new URL(url).hostname : url) + ` (${ip}) port 443 (#0)`,
      '* ALPN: offers h2,http/1.1',
      '* TLSv1.3 (OUT), TLS handshake, Client hello (1):',
      '* TLSv1.3 (IN), TLS handshake, Server hello (2):',
      '* TLSv1.3 (IN), TLS handshake, Encrypted Extensions (8):',
      '* TLSv1.3 (IN), TLS handshake, Certificate (11):',
      '* TLSv1.3 (IN), TLS handshake, CERT verify (15):',
      '* TLSv1.3 (IN), TLS handshake, Finished (20):',
      '* TLSv1.3 (OUT), TLS handshake, Finished (20):',
      '* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384',
      '> GET / HTTP/2',
      `> Host: ${url.includes('://') ? new URL(url).hostname : url}`,
      '> User-Agent: curl/8.4.0',
      '> Accept: */*',
      '>',
      '< HTTP/2 200',
      `< date: ${new Date().toUTCString()}`,
      '< content-type: text/html; charset=utf-8',
      '<',
      '<!DOCTYPE html><html>...</html>',
      '* Connection #0 left intact',
    ];
  }
  
  return `<!DOCTYPE html>
<html>
<head>
  <title>Welcome</title>
</head>
<body>
  <h1>Response from ${url}</h1>
  <p>This is a simulated response.</p>
</body>
</html>`;
});

// arp command
registerCommand('arp', async (parsed: ParsedCommand) => {
  const aFlag = parsed.flags['a'];
  const nFlag = parsed.flags['n'];
  
  const entries = [
    { ip: '192.168.1.1', hw: 'ether', mac: Array(6).fill(0).map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':'), iface: 'eth0' },
    { ip: `192.168.1.${Math.floor(Math.random() * 254) + 2}`, hw: 'ether', mac: Array(6).fill(0).map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':'), iface: 'eth0' },
    { ip: `192.168.1.${Math.floor(Math.random() * 254) + 2}`, hw: 'ether', mac: Array(6).fill(0).map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':'), iface: 'eth0' },
  ];
  
  if (aFlag || nFlag) {
    return entries.map(e => `? (${e.ip}) at ${e.mac} [${e.hw}] on ${e.iface}`);
  }
  
  const lines = [
    'Address                  HWtype  HWaddress           Flags Mask            Iface',
  ];
  entries.forEach(e => {
    lines.push(`${e.ip.padEnd(24)} ${e.hw.padEnd(7)} ${e.mac}   C                     ${e.iface}`);
  });
  
  return lines;
});

// route command
registerCommand('route', async (parsed: ParsedCommand) => {
  const nFlag = parsed.flags['n'];
  
  const lines = [
    'Kernel IP routing table',
    'Destination     Gateway         Genmask         Flags Metric Ref    Use Iface',
    'default         192.168.1.1     0.0.0.0         UG    100    0        0 eth0',
    '192.168.1.0     0.0.0.0         255.255.255.0   U     100    0        0 eth0',
  ];
  
  return lines;
});

// hostname command
registerCommand('hostname', async (parsed: ParsedCommand) => {
  const iFlag = parsed.flags['i'] || parsed.flags['I'];
  const fFlag = parsed.flags['f'] || parsed.flags['fqdn'];
  
  if (iFlag) {
    return `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
  }
  
  if (fFlag) {
    return 'prod-srv-42.localdomain';
  }
  
  return 'prod-srv-42';
});

export {};

