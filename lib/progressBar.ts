// Progress bar animation system for terminal commands

export interface ProgressOptions {
  total: number;
  width?: number;
  style?: 'bar' | 'hash' | 'dots' | 'spinner';
  showPercent?: boolean;
  showSpeed?: boolean;
  showEta?: boolean;
  label?: string;
}

export interface ProgressState {
  current: number;
  total: number;
  startTime: number;
  label?: string;
}

const SPINNER_FRAMES = ['|', '/', '-', '\\'];
const BAR_CHARS = { filled: '=', empty: ' ', arrow: '>' };
const HASH_CHARS = { filled: '#', empty: ' ' };

export function createProgressBar(
  current: number,
  total: number,
  options: ProgressOptions
): string {
  const width = options.width || 30;
  const percent = Math.min(100, Math.round((current / total) * 100));
  const filled = Math.round((current / total) * width);
  
  let bar = '';
  
  switch (options.style) {
    case 'hash':
      bar = '[' + HASH_CHARS.filled.repeat(filled) + HASH_CHARS.empty.repeat(width - filled) + ']';
      break;
    case 'dots':
      bar = '.' + '.'.repeat(Math.min(filled, width));
      break;
    case 'spinner':
      const frame = SPINNER_FRAMES[current % SPINNER_FRAMES.length];
      bar = `[${frame}]`;
      break;
    case 'bar':
    default:
      const arrow = filled < width ? BAR_CHARS.arrow : BAR_CHARS.filled;
      bar = '[' + BAR_CHARS.filled.repeat(Math.max(0, filled - 1)) + 
            (filled > 0 ? arrow : '') + 
            BAR_CHARS.empty.repeat(width - filled) + ']';
      break;
  }
  
  let result = bar;
  
  if (options.showPercent !== false) {
    result += ` ${percent.toString().padStart(3)}%`;
  }
  
  if (options.showSpeed) {
    const speed = (Math.random() * 2 + 0.5).toFixed(1);
    result += ` ${speed} MB/s`;
  }
  
  if (options.showEta && percent < 100) {
    const eta = Math.max(0, Math.ceil((100 - percent) / 10));
    result += ` eta 0:${eta.toString().padStart(2, '0')}`;
  }
  
  if (options.label) {
    result = options.label + ' ' + result;
  }
  
  return result;
}

export function generateProgressFrames(
  total: number,
  steps: number,
  options: Omit<ProgressOptions, 'total'>
): string[] {
  const frames: string[] = [];
  const increment = total / steps;
  
  for (let i = 0; i <= steps; i++) {
    const current = Math.min(total, Math.round(i * increment));
    frames.push(createProgressBar(current, total, { ...options, total }));
  }
  
  return frames;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

export function formatSpeed(bytesPerSecond: number): string {
  return formatBytes(bytesPerSecond) + '/s';
}

export function generateDownloadProgress(
  filename: string,
  size: number,
  steps: number = 10
): string[] {
  const lines: string[] = [];
  const sizeStr = formatBytes(size);
  
  lines.push(`Downloading ${filename} (${sizeStr})`);
  
  for (let i = 1; i <= steps; i++) {
    const percent = Math.round((i / steps) * 100);
    const downloaded = Math.round((i / steps) * size);
    const speed = (Math.random() * 3 + 1).toFixed(1);
    const eta = Math.max(0, steps - i);
    
    const width = 40;
    const filled = Math.round((i / steps) * width);
    const bar = '='.repeat(filled - 1) + (filled < width ? '>' : '=') + ' '.repeat(width - filled);
    
    lines.push(`     [${bar}] ${percent}% ${speed} MB/s eta 0:${eta.toString().padStart(2, '0')}`);
  }
  
  return lines;
}

export function generateInstallProgress(
  packageName: string,
  steps: number = 5
): string[] {
  const lines: string[] = [];
  const size = Math.floor(Math.random() * 50 + 10) * 100; // 1-6 MB in KB
  const sizeStr = (size / 1024).toFixed(1);
  
  lines.push(`Collecting ${packageName}`);
  lines.push(`  Downloading ${packageName}-1.0.0-py3-none-any.whl (${sizeStr} MB)`);
  
  for (let i = 1; i <= steps; i++) {
    const percent = Math.round((i / steps) * 100);
    const width = 30;
    const filled = Math.round((i / steps) * width);
    const bar = '='.repeat(filled - 1) + (filled < width ? '>' : '=') + ' '.repeat(width - filled);
    const speed = (Math.random() * 2 + 0.5).toFixed(1);
    
    if (i < steps) {
      lines.push(`     [${bar}] ${percent}% ${speed} MB/s`);
    } else {
      lines.push(`     [${bar}] 100%`);
    }
  }
  
  lines.push(`Installing collected packages: ${packageName}`);
  lines.push(`Successfully installed ${packageName}-1.0.0`);
  
  return lines;
}

export function generateAptProgress(
  packages: string[],
  action: 'install' | 'remove' | 'update' | 'upgrade'
): string[] {
  const lines: string[] = [];
  
  if (action === 'update') {
    const repos = [
      'http://archive.ubuntu.com/ubuntu jammy InRelease',
      'http://archive.ubuntu.com/ubuntu jammy-updates InRelease',
      'http://archive.ubuntu.com/ubuntu jammy-backports InRelease',
      'http://security.ubuntu.com/ubuntu jammy-security InRelease',
      'https://download.docker.com/linux/ubuntu jammy InRelease',
    ];
    
    lines.push('Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease');
    repos.forEach((repo, i) => {
      const action = Math.random() > 0.3 ? 'Hit' : 'Get';
      lines.push(`${action}:${i + 1} ${repo}`);
    });
    lines.push('Reading package lists... Done');
    lines.push(`Building dependency tree... Done`);
    lines.push(`Reading state information... Done`);
    lines.push(`${Math.floor(Math.random() * 50 + 10)} packages can be upgraded. Run 'apt list --upgradable' to see them.`);
  } else if (action === 'install') {
    const size = Math.floor(Math.random() * 100 + 20);
    lines.push('Reading package lists... Done');
    lines.push('Building dependency tree... Done');
    lines.push('Reading state information... Done');
    lines.push(`The following NEW packages will be installed:`);
    lines.push(`  ${packages.join(' ')}`);
    lines.push(`0 upgraded, ${packages.length} newly installed, 0 to remove and ${Math.floor(Math.random() * 20)} not upgraded.`);
    lines.push(`Need to get ${size}.${Math.floor(Math.random() * 10)} MB of archives.`);
    lines.push(`After this operation, ${size * 3}.${Math.floor(Math.random() * 10)} MB of additional disk space will be used.`);
    
    packages.forEach((pkg, i) => {
      const pkgSize = Math.floor(Math.random() * 50 + 5);
      lines.push(`Get:${i + 1} http://archive.ubuntu.com/ubuntu jammy/main amd64 ${pkg} amd64 1.0.0 [${pkgSize}.${Math.floor(Math.random() * 10)} MB]`);
    });
    
    lines.push(`Fetched ${size}.${Math.floor(Math.random() * 10)} MB in ${Math.floor(Math.random() * 10 + 2)}s (${(size / (Math.random() * 5 + 2)).toFixed(1)} MB/s)`);
    lines.push('Selecting previously unselected package.');
    lines.push('(Reading database ... 150000 files and directories currently installed.)');
    lines.push(`Preparing to unpack .../${packages[0]}_1.0.0_amd64.deb ...`);
    lines.push(`Unpacking ${packages[0]} (1.0.0) ...`);
    lines.push(`Setting up ${packages[0]} (1.0.0) ...`);
    lines.push('Processing triggers for man-db (2.10.2-1) ...');
  } else if (action === 'upgrade') {
    const count = Math.floor(Math.random() * 20 + 5);
    lines.push('Reading package lists... Done');
    lines.push('Building dependency tree... Done');
    lines.push('Reading state information... Done');
    lines.push('Calculating upgrade... Done');
    lines.push(`The following packages will be upgraded:`);
    lines.push(`  linux-headers-generic linux-image-generic base-files coreutils`);
    lines.push(`${count} upgraded, 0 newly installed, 0 to remove and 0 not upgraded.`);
    lines.push(`Need to get ${Math.floor(Math.random() * 200 + 50)} MB of archives.`);
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      lines.push(`(Reading database ... ${150000 + i * 100} files and directories currently installed.)`);
      lines.push(`Preparing to unpack .../package_${i}_amd64.deb ...`);
      lines.push(`Unpacking package-${i} (1.${i}.0) over (1.${i - 1}.0) ...`);
    }
    lines.push('Setting up packages...');
    lines.push('Processing triggers...');
  } else if (action === 'remove') {
    lines.push('Reading package lists... Done');
    lines.push('Building dependency tree... Done');
    lines.push('Reading state information... Done');
    lines.push(`The following packages will be REMOVED:`);
    lines.push(`  ${packages.join(' ')}`);
    lines.push(`0 upgraded, 0 newly installed, ${packages.length} to remove and 0 not upgraded.`);
    lines.push(`After this operation, ${Math.floor(Math.random() * 100 + 10)} MB disk space will be freed.`);
    packages.forEach(pkg => {
      lines.push(`(Reading database ... 150000 files and directories currently installed.)`);
      lines.push(`Removing ${pkg} (1.0.0) ...`);
    });
    lines.push('Processing triggers for man-db (2.10.2-1) ...');
  }
  
  return lines;
}

export function generateNmapProgress(target: string): string[] {
  const lines: string[] = [];
  const startTime = new Date().toISOString().replace('T', ' ').split('.')[0];
  
  lines.push(`Starting Nmap 7.94 ( https://nmap.org ) at ${startTime} UTC`);
  lines.push(`Nmap scan report for ${target}`);
  lines.push(`Host is up (0.00${Math.floor(Math.random() * 99)}s latency).`);
  lines.push('');
  lines.push('PORT      STATE    SERVICE        VERSION');
  
  const ports = [
    { port: 22, service: 'ssh', version: 'OpenSSH 8.9p1 Ubuntu 3ubuntu0.4' },
    { port: 80, service: 'http', version: 'nginx 1.18.0' },
    { port: 443, service: 'https', version: 'nginx 1.18.0' },
    { port: 3306, service: 'mysql', version: 'MySQL 8.0.35' },
    { port: 5432, service: 'postgresql', version: 'PostgreSQL 15.4' },
    { port: 6379, service: 'redis', version: 'Redis 7.2.3' },
    { port: 8080, service: 'http-proxy', version: 'Apache Tomcat 9.0.82' },
    { port: 27017, service: 'mongodb', version: 'MongoDB 7.0.4' },
  ];
  
  const openPorts = ports.filter(() => Math.random() > 0.5).slice(0, Math.floor(Math.random() * 5) + 2);
  
  openPorts.forEach(p => {
    const state = Math.random() > 0.1 ? 'open' : 'filtered';
    lines.push(`${p.port}/tcp   ${state.padEnd(8)} ${p.service.padEnd(14)} ${p.version}`);
  });
  
  lines.push('');
  lines.push(`Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .`);
  lines.push(`Nmap done: 1 IP address (1 host up) scanned in ${(Math.random() * 10 + 5).toFixed(2)} seconds`);
  
  return lines;
}

export function generatePingOutput(host: string, count: number = 4): string[] {
  const lines: string[] = [];
  const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  
  lines.push(`PING ${host} (${ip}) 56(84) bytes of data.`);
  
  let totalTime = 0;
  let minTime = Infinity;
  let maxTime = 0;
  
  for (let i = 0; i < count; i++) {
    const time = Math.random() * 50 + 10;
    totalTime += time;
    minTime = Math.min(minTime, time);
    maxTime = Math.max(maxTime, time);
    lines.push(`64 bytes from ${ip}: icmp_seq=${i + 1} ttl=${64 - Math.floor(Math.random() * 10)} time=${time.toFixed(1)} ms`);
  }
  
  lines.push('');
  lines.push(`--- ${host} ping statistics ---`);
  lines.push(`${count} packets transmitted, ${count} received, 0% packet loss, time ${Math.floor(totalTime)}ms`);
  lines.push(`rtt min/avg/max/mdev = ${minTime.toFixed(3)}/${(totalTime / count).toFixed(3)}/${maxTime.toFixed(3)}/${((maxTime - minTime) / 2).toFixed(3)} ms`);
  
  return lines;
}

export function generateTracerouteOutput(host: string): string[] {
  const lines: string[] = [];
  const hops = Math.floor(Math.random() * 10) + 8;
  
  lines.push(`traceroute to ${host} (${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}), 30 hops max, 60 byte packets`);
  
  for (let i = 1; i <= hops; i++) {
    const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const times = [
      (Math.random() * 20 + 1).toFixed(3),
      (Math.random() * 20 + 1).toFixed(3),
      (Math.random() * 20 + 1).toFixed(3),
    ];
    
    if (Math.random() > 0.9) {
      lines.push(` ${i.toString().padStart(2)}  * * *`);
    } else {
      lines.push(` ${i.toString().padStart(2)}  ${ip}  ${times[0]} ms  ${times[1]} ms  ${times[2]} ms`);
    }
  }
  
  return lines;
}

export function generateDdProgress(inputFile: string, outputFile: string, blockSize: string = '1M', count: number = 100): string[] {
  const lines: string[] = [];
  const totalBytes = count * 1024 * 1024;
  
  for (let i = 1; i <= 5; i++) {
    const records = Math.floor((i / 5) * count);
    const bytes = records * 1024 * 1024;
    const speed = (Math.random() * 100 + 50).toFixed(1);
    lines.push(`${records}+0 records in`);
    lines.push(`${records}+0 records out`);
    lines.push(`${bytes} bytes (${(bytes / 1024 / 1024).toFixed(1)} MB, ${(bytes / 1024 / 1024).toFixed(1)} MiB) copied, ${(i * 0.5).toFixed(1)} s, ${speed} MB/s`);
  }
  
  return lines;
}

