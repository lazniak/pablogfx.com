// System management commands (systemctl, service, shutdown, etc.)

import { ParsedCommand } from '../commandParser';
import { registerCommand } from './index';

// Service list for simulation
const SERVICES = [
  { name: 'ssh', status: 'running', enabled: true, description: 'OpenBSD Secure Shell server' },
  { name: 'nginx', status: 'running', enabled: true, description: 'A high performance web server and a reverse proxy server' },
  { name: 'mysql', status: 'running', enabled: true, description: 'MySQL Community Server' },
  { name: 'postgresql', status: 'running', enabled: true, description: 'PostgreSQL RDBMS' },
  { name: 'redis-server', status: 'running', enabled: true, description: 'Advanced key-value store' },
  { name: 'docker', status: 'running', enabled: true, description: 'Docker Application Container Engine' },
  { name: 'cron', status: 'running', enabled: true, description: 'Regular background program processing daemon' },
  { name: 'ufw', status: 'inactive', enabled: false, description: 'Uncomplicated firewall' },
  { name: 'apache2', status: 'inactive', enabled: false, description: 'The Apache HTTP Server' },
  { name: 'pm2', status: 'running', enabled: true, description: 'PM2 process manager' },
];

// systemctl command
registerCommand('systemctl', async (parsed: ParsedCommand) => {
  const command = parsed.args[0];
  const service = parsed.args[1];
  
  if (!command) {
    return `systemctl - Control the systemd system and service manager

Usage: systemctl [OPTIONS...] COMMAND [UNIT...]

Commands:
  start UNIT...             Start (activate) one or more units
  stop UNIT...              Stop (deactivate) one or more units
  restart UNIT...           Restart one or more units
  reload UNIT...            Reload one or more units
  status [UNIT...]          Show runtime status of one or more units
  enable UNIT...            Enable one or more unit files
  disable UNIT...           Disable one or more unit files
  is-active UNIT...         Check if unit is active
  is-enabled UNIT...        Check if unit is enabled
  list-units                List all loaded units
  list-unit-files           List installed unit files
  daemon-reload             Reload systemd manager configuration`;
  }
  
  switch (command) {
    case 'status':
      if (!service) {
        // Show all services
        const lines = [
          '● prod-srv-42',
          '    State: running',
          '     Jobs: 0 queued',
          '   Failed: 0 units',
          `    Since: ${new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toUTCString()}`,
          '',
          '  Loaded units listed: ' + SERVICES.length,
        ];
        return lines;
      }
      
      const svc = SERVICES.find(s => s.name === service || s.name === service.replace('.service', ''));
      if (!svc) {
        return `Unit ${service}.service could not be found.`;
      }
      
      const isRunning = svc.status === 'running';
      const dot = isRunning ? '●' : '○';
      const color = isRunning ? 'active (running)' : 'inactive (dead)';
      const pid = Math.floor(Math.random() * 10000) + 1000;
      
      return [
        `${dot} ${svc.name}.service - ${svc.description}`,
        `     Loaded: loaded (/lib/systemd/system/${svc.name}.service; ${svc.enabled ? 'enabled' : 'disabled'}; vendor preset: enabled)`,
        `     Active: ${color} since ${new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toUTCString()}`,
        isRunning ? `   Main PID: ${pid} (${svc.name})` : '',
        `      Tasks: ${Math.floor(Math.random() * 20) + 1} (limit: 4915)`,
        `     Memory: ${(Math.random() * 100 + 10).toFixed(1)}M`,
        `        CPU: ${(Math.random() * 10).toFixed(3)}s`,
        `     CGroup: /system.slice/${svc.name}.service`,
        isRunning ? `             └─${pid} /usr/sbin/${svc.name}` : '',
      ].filter(Boolean);
    
    case 'start':
      if (!service) return 'Too few arguments.';
      return '';
    
    case 'stop':
      if (!service) return 'Too few arguments.';
      return '';
    
    case 'restart':
      if (!service) return 'Too few arguments.';
      return '';
    
    case 'reload':
      if (!service) return 'Too few arguments.';
      return '';
    
    case 'enable':
      if (!service) return 'Too few arguments.';
      return `Created symlink /etc/systemd/system/multi-user.target.wants/${service}.service → /lib/systemd/system/${service}.service.`;
    
    case 'disable':
      if (!service) return 'Too few arguments.';
      return `Removed /etc/systemd/system/multi-user.target.wants/${service}.service.`;
    
    case 'is-active':
      if (!service) return 'Too few arguments.';
      const activeCheck = SERVICES.find(s => s.name === service);
      return activeCheck?.status === 'running' ? 'active' : 'inactive';
    
    case 'is-enabled':
      if (!service) return 'Too few arguments.';
      const enabledCheck = SERVICES.find(s => s.name === service);
      return enabledCheck?.enabled ? 'enabled' : 'disabled';
    
    case 'list-units':
    case 'list-unit-files':
      const lines = [
        'UNIT FILE                                  STATE           VENDOR PRESET',
      ];
      SERVICES.forEach(s => {
        lines.push(`${s.name}.service`.padEnd(42) + (s.enabled ? 'enabled' : 'disabled').padEnd(16) + 'enabled');
      });
      lines.push('');
      lines.push(`${SERVICES.length} unit files listed.`);
      return lines;
    
    case 'daemon-reload':
      return '';
    
    default:
      return `Unknown command: ${command}`;
  }
});

// service command (legacy)
registerCommand('service', async (parsed: ParsedCommand) => {
  const service = parsed.args[0];
  const action = parsed.args[1];
  
  if (!service) {
    return `Usage: service <option> | --status-all | [ service_name [ command | --full-restart ] ]`;
  }
  
  if (service === '--status-all') {
    return SERVICES.map(s => 
      ` [ ${s.status === 'running' ? '+' : '-'} ]  ${s.name}`
    );
  }
  
  if (!action) {
    return `Usage: service ${service} {start|stop|restart|status}`;
  }
  
  switch (action) {
    case 'status':
      const svc = SERVICES.find(s => s.name === service);
      if (!svc) {
        return `${service}: unrecognized service`;
      }
      return `● ${svc.name} is ${svc.status}`;
    
    case 'start':
    case 'stop':
    case 'restart':
    case 'reload':
      return '';
    
    default:
      return `Usage: service ${service} {start|stop|restart|status}`;
  }
});

// shutdown command
registerCommand('shutdown', async (parsed: ParsedCommand) => {
  const haltFlag = parsed.flags['h'] || parsed.flags['halt'];
  const rebootFlag = parsed.flags['r'] || parsed.flags['reboot'];
  const cancelFlag = parsed.flags['c'] || parsed.flags['cancel'];
  const time = parsed.args[0] || 'now';
  const message = parsed.args.slice(1).join(' ');
  
  if (cancelFlag) {
    return 'Shutdown cancelled.';
  }
  
  const action = rebootFlag ? 'reboot' : 'power-off';
  
  if (time === 'now') {
    return [
      `Shutdown scheduled for ${new Date(Date.now() + 60000).toUTCString()}, use 'shutdown -c' to cancel.`,
      '',
      `Broadcast message from root@prod-srv-42:`,
      '',
      message || `The system is going down for ${action} NOW!`,
    ];
  }
  
  return [
    `Shutdown scheduled for ${time}, use 'shutdown -c' to cancel.`,
    '',
    `Broadcast message from root@prod-srv-42:`,
    '',
    message || `The system is going down for ${action} at ${time}!`,
  ];
});

// reboot command
registerCommand('reboot', async () => {
  return [
    'Broadcast message from root@prod-srv-42:',
    '',
    'The system is going down for reboot NOW!',
    '',
    'Connection to prod-srv-42 closed by remote host.',
    'Connection to prod-srv-42 closed.',
  ];
});

// poweroff command
registerCommand('poweroff', async () => {
  return [
    'Broadcast message from root@prod-srv-42:',
    '',
    'The system is going down for power-off NOW!',
    '',
    'Connection to prod-srv-42 closed by remote host.',
    'Connection to prod-srv-42 closed.',
  ];
});

// halt command
registerCommand('halt', async () => {
  return [
    'Broadcast message from root@prod-srv-42:',
    '',
    'The system is going down for halt NOW!',
  ];
});

// uptime command
registerCommand('uptime', async () => {
  const days = Math.floor(Math.random() * 60) + 1;
  const hours = Math.floor(Math.random() * 24);
  const minutes = Math.floor(Math.random() * 60);
  const users = Math.floor(Math.random() * 5) + 1;
  const load = [(Math.random() * 1).toFixed(2), (Math.random() * 0.8).toFixed(2), (Math.random() * 0.5).toFixed(2)];
  
  return ` ${new Date().toTimeString().split(' ')[0]} up ${days} days, ${hours}:${String(minutes).padStart(2, '0')},  ${users} user,  load average: ${load.join(', ')}`;
});

// dmesg command
registerCommand('dmesg', async (parsed: ParsedCommand) => {
  const tailFlag = parsed.flags['T'] || parsed.flags['ctime'];
  const lines = [
    '[    0.000000] Linux version 5.15.0-91-generic (buildd@lcy02-amd64-024) (gcc (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0, GNU ld (GNU Binutils for Ubuntu) 2.38) #101-Ubuntu SMP Tue Nov 14 13:30:08 UTC 2023 (Ubuntu 5.15.0-91.101-generic 5.15.131)',
    '[    0.000000] Command line: BOOT_IMAGE=/vmlinuz-5.15.0-91-generic root=/dev/sda1 ro quiet splash',
    '[    0.000000] KERNEL supported cpus:',
    '[    0.000000]   Intel GenuineIntel',
    '[    0.000000]   AMD AuthenticAMD',
    '[    0.000000] x86/fpu: Supporting XSAVE feature 0x001: \'x87 floating point registers\'',
    '[    0.000000] x86/fpu: Supporting XSAVE feature 0x002: \'SSE registers\'',
    '[    0.000000] x86/fpu: Supporting XSAVE feature 0x004: \'AVX registers\'',
    '[    0.000000] x86/fpu: xstate_offset[2]:  576, xstate_sizes[2]:  256',
    '[    0.000000] x86/fpu: Enabled xstate features 0x7, context size is 832 bytes, using \'compacted\' format.',
    '[    0.000000] signal: max sigframe size: 1776',
    '[    0.000000] BIOS-provided physical RAM map:',
    '[    0.000000] BIOS-e820: [mem 0x0000000000000000-0x000000000009fbff] usable',
    '[    0.000000] BIOS-e820: [mem 0x000000000009fc00-0x000000000009ffff] reserved',
    '[    0.523456] smpboot: CPU0: Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz (family: 0x6, model: 0x4f, stepping: 0x1)',
    '[    0.789012] smpboot: Total of 4 processors activated (19200.00 BogoMIPS)',
    '[    1.234567] NET: Registered PF_INET protocol family',
    '[    1.345678] NET: Registered PF_INET6 protocol family',
    '[    2.456789] EXT4-fs (sda1): mounted filesystem with ordered data mode. Opts: (null)',
    '[    3.567890] systemd[1]: Detected virtualization kvm.',
    '[    3.678901] systemd[1]: Detected architecture x86-64.',
    '[    3.789012] systemd[1]: Hostname set to <prod-srv-42>.',
  ];
  
  return parsed.flags['T'] ? lines.map(l => {
    const time = new Date(Date.now() - Math.random() * 86400000).toISOString();
    return l.replace(/\[\s*[\d.]+\]/, `[${time}]`);
  }) : lines;
});

// lscpu command
registerCommand('lscpu', async () => {
  return [
    'Architecture:                    x86_64',
    'CPU op-mode(s):                  32-bit, 64-bit',
    'Address sizes:                   46 bits physical, 48 bits virtual',
    'Byte Order:                      Little Endian',
    'CPU(s):                          4',
    'On-line CPU(s) list:             0-3',
    'Vendor ID:                       GenuineIntel',
    'Model name:                      Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz',
    'CPU family:                      6',
    'Model:                           79',
    'Thread(s) per core:              1',
    'Core(s) per socket:              4',
    'Socket(s):                       1',
    'Stepping:                        1',
    'BogoMIPS:                        4800.00',
    'Flags:                           fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush mmx fxsr sse sse2 ss ht syscall nx pdpe1gb rdtscp lm constant_tsc arch_perfmon rep_good nopl xtopology cpuid tsc_known_freq pni pclmulqdq ssse3 fma cx16 pcid sse4_1 sse4_2 x2apic movbe popcnt tsc_deadline_timer aes xsave avx f16c rdrand hypervisor lahf_lm abm 3dnowprefetch cpuid_fault invpcid_single pti ssbd ibrs ibpb stibp fsgsbase tsc_adjust bmi1 avx2 smep bmi2 erms invpcid rdseed adx smap xsaveopt arat umip arch_capabilities',
    'Virtualization:                  VT-x',
    'Hypervisor vendor:               KVM',
    'Virtualization type:             full',
    'L1d cache:                       128 KiB (4 instances)',
    'L1i cache:                       128 KiB (4 instances)',
    'L2 cache:                        1 MiB (4 instances)',
    'L3 cache:                        35 MiB (1 instance)',
    'NUMA node(s):                    1',
    'NUMA node0 CPU(s):               0-3',
  ];
});

// lsblk command
registerCommand('lsblk', async () => {
  return [
    'NAME   MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS',
    'sda      8:0    0   100G  0 disk ',
    '├─sda1   8:1    0    99G  0 part /',
    '└─sda2   8:2    0     1G  0 part [SWAP]',
    'sr0     11:0    1  1024M  0 rom  ',
  ];
});

// lsusb command
registerCommand('lsusb', async () => {
  return [
    'Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub',
    'Bus 001 Device 002: ID 0627:0001 Adomax Technology Co., Ltd QEMU USB Tablet',
    'Bus 002 Device 001: ID 1d6b:0001 Linux Foundation 1.1 root hub',
  ];
});

// lspci command
registerCommand('lspci', async () => {
  return [
    '00:00.0 Host bridge: Intel Corporation 440FX - 82441FX PMC [Natoma] (rev 02)',
    '00:01.0 ISA bridge: Intel Corporation 82371SB PIIX3 ISA [Natoma/Triton II]',
    '00:01.1 IDE interface: Intel Corporation 82371SB PIIX3 IDE [Natoma/Triton II]',
    '00:01.3 Bridge: Intel Corporation 82371AB/EB/MB PIIX4 ACPI (rev 03)',
    '00:02.0 VGA compatible controller: Red Hat, Inc. Virtio GPU (rev 01)',
    '00:03.0 Ethernet controller: Red Hat, Inc. Virtio network device',
    '00:04.0 SCSI storage controller: Red Hat, Inc. Virtio block device',
    '00:05.0 Unclassified device [00ff]: Red Hat, Inc. Virtio memory balloon',
  ];
});

// dmidecode command
registerCommand('dmidecode', async (parsed: ParsedCommand) => {
  const typeFlag = parsed.flags['t'] || parsed.flags['type'];
  
  if (typeFlag === 'memory' || typeFlag === '17') {
    return [
      '# dmidecode 3.3',
      'Getting SMBIOS data from sysfs.',
      'SMBIOS 2.8 present.',
      '',
      'Handle 0x1100, DMI type 17, 40 bytes',
      'Memory Device',
      '        Array Handle: 0x1000',
      '        Error Information Handle: Not Provided',
      '        Total Width: 64 bits',
      '        Data Width: 64 bits',
      '        Size: 16 GB',
      '        Form Factor: DIMM',
      '        Set: None',
      '        Locator: DIMM 0',
      '        Bank Locator: Not Specified',
      '        Type: RAM',
      '        Type Detail: Other',
      '        Speed: Unknown',
      '        Manufacturer: QEMU',
      '        Serial Number: Not Specified',
      '        Asset Tag: Not Specified',
      '        Part Number: Not Specified',
      '        Rank: Unknown',
      '        Configured Memory Speed: Unknown',
    ];
  }
  
  return [
    '# dmidecode 3.3',
    'Getting SMBIOS data from sysfs.',
    'SMBIOS 2.8 present.',
    '',
    'Handle 0x0000, DMI type 0, 24 bytes',
    'BIOS Information',
    '        Vendor: SeaBIOS',
    '        Version: 1.15.0-1',
    '        Release Date: 04/01/2014',
    '        Address: 0xE8000',
    '        Runtime Size: 96 kB',
    '        ROM Size: 64 kB',
    '',
    'Handle 0x0100, DMI type 1, 27 bytes',
    'System Information',
    '        Manufacturer: QEMU',
    '        Product Name: Standard PC (i440FX + PIIX, 1996)',
    '        Version: pc-i440fx-6.2',
    '        Serial Number: Not Specified',
    '        UUID: 12345678-1234-1234-1234-123456789012',
    '        Wake-up Type: Power Switch',
    '        SKU Number: Not Specified',
    '        Family: Not Specified',
  ];
});

// hostnamectl command
registerCommand('hostnamectl', async (parsed: ParsedCommand) => {
  const setHostname = parsed.args[0] === 'set-hostname';
  
  if (setHostname) {
    const newHostname = parsed.args[1];
    if (!newHostname) {
      return 'hostnamectl: missing argument';
    }
    return '';
  }
  
  return [
    ' Static hostname: prod-srv-42',
    '       Icon name: computer-vm',
    '         Chassis: vm',
    '      Machine ID: ' + Array(32).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
    '         Boot ID: ' + Array(32).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
    '  Virtualization: kvm',
    'Operating System: Ubuntu 22.04.3 LTS',
    '          Kernel: Linux 5.15.0-91-generic',
    '    Architecture: x86-64',
    ' Hardware Vendor: QEMU',
    '  Hardware Model: Standard PC (i440FX + PIIX, 1996)',
  ];
});

// timedatectl command
registerCommand('timedatectl', async () => {
  const now = new Date();
  return [
    `               Local time: ${now.toUTCString().replace('GMT', '')}UTC`,
    `           Universal time: ${now.toUTCString().replace('GMT', '')}UTC`,
    `                 RTC time: ${now.toUTCString().replace('GMT', '')}`,
    '                Time zone: Etc/UTC (UTC, +0000)',
    'System clock synchronized: yes',
    '              NTP service: active',
    '          RTC in local TZ: no',
  ];
});

// journalctl command
registerCommand('journalctl', async (parsed: ParsedCommand) => {
  const unitFlag = parsed.flags['u'] || parsed.flags['unit'];
  const followFlag = parsed.flags['f'] || parsed.flags['follow'];
  const linesFlag = parsed.flags['n'] || parsed.flags['lines'];
  
  const numLines = linesFlag ? parseInt(String(linesFlag)) : 10;
  
  const logs = [
    'Nov 28 10:15:23 prod-srv-42 systemd[1]: Started OpenBSD Secure Shell server.',
    'Nov 28 10:15:24 prod-srv-42 sshd[1234]: Server listening on 0.0.0.0 port 22.',
    'Nov 28 10:15:24 prod-srv-42 sshd[1234]: Server listening on :: port 22.',
    'Nov 28 10:20:15 prod-srv-42 nginx[5678]: nginx/1.18.0 started',
    'Nov 28 10:20:16 prod-srv-42 nginx[5678]: *1 client 192.168.1.100 connected',
    'Nov 28 10:25:00 prod-srv-42 CRON[9012]: (root) CMD (test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily ))',
    'Nov 28 10:30:45 prod-srv-42 sshd[3456]: Accepted publickey for root from 192.168.1.100 port 54321',
    'Nov 28 10:30:46 prod-srv-42 sshd[3456]: pam_unix(sshd:session): session opened for user root',
    'Nov 28 10:35:00 prod-srv-42 systemd[1]: Starting Daily apt download activities...',
    'Nov 28 10:35:05 prod-srv-42 systemd[1]: Finished Daily apt download activities.',
    'Nov 28 10:40:12 prod-srv-42 kernel: [12345.678901] eth0: link up, 1000Mbps, full-duplex',
    'Nov 28 10:45:00 prod-srv-42 systemd[1]: Starting Cleanup of Temporary Directories...',
  ];
  
  if (followFlag) {
    return [
      ...logs.slice(-numLines),
      '',
      '(Following journal - press Ctrl+C to exit)',
    ];
  }
  
  if (unitFlag) {
    return logs.filter(l => l.includes(String(unitFlag))).slice(-numLines);
  }
  
  return [
    '-- Journal begins at ' + new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toUTCString() + ' --',
    ...logs.slice(-numLines),
  ];
});

// sysctl command
registerCommand('sysctl', async (parsed: ParsedCommand) => {
  const allFlag = parsed.flags['a'] || parsed.flags['all'];
  const param = parsed.args[0];
  
  const params: { [key: string]: string } = {
    'kernel.hostname': 'prod-srv-42',
    'kernel.ostype': 'Linux',
    'kernel.osrelease': '5.15.0-91-generic',
    'kernel.version': '#101-Ubuntu SMP Tue Nov 14 13:30:08 UTC 2023',
    'vm.swappiness': '60',
    'vm.dirty_ratio': '20',
    'vm.dirty_background_ratio': '10',
    'net.ipv4.ip_forward': '1',
    'net.ipv4.tcp_syncookies': '1',
    'net.core.somaxconn': '128',
    'fs.file-max': '9223372036854775807',
    'fs.nr_open': '1048576',
  };
  
  if (allFlag) {
    return Object.entries(params).map(([k, v]) => `${k} = ${v}`);
  }
  
  if (param) {
    if (param.includes('=')) {
      // Setting value
      return '';
    }
    const value = params[param];
    if (value) {
      return `${param} = ${value}`;
    }
    return `sysctl: cannot stat /proc/sys/${param.replace(/\./g, '/')}: No such file or directory`;
  }
  
  return 'usage: sysctl [options] [variable[=value] ...]';
});

// modprobe command
registerCommand('modprobe', async (parsed: ParsedCommand) => {
  const module = parsed.args[0];
  const removeFlag = parsed.flags['r'] || parsed.flags['remove'];
  
  if (!module) {
    return 'modprobe: missing module name';
  }
  
  return '';
});

// lsmod command
registerCommand('lsmod', async () => {
  return [
    'Module                  Size  Used by',
    'vboxsf                 81920  1',
    'vboxguest             344064  2 vboxsf',
    'intel_rapl_msr         20480  0',
    'intel_rapl_common      24576  1 intel_rapl_msr',
    'rapl                   20480  0',
    'kvm_intel             282624  0',
    'kvm                   663552  1 kvm_intel',
    'crct10dif_pclmul       16384  1',
    'crc32_pclmul           16384  0',
    'ghash_clmulni_intel    16384  0',
    'aesni_intel           372736  0',
    'crypto_simd            16384  1 aesni_intel',
    'cryptd                 24576  2 crypto_simd,ghash_clmulni_intel',
    'snd_intel8x0           45056  2',
    'snd_ac97_codec        131072  1 snd_intel8x0',
  ];
});

export {};

