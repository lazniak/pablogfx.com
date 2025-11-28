// User management commands (useradd, passwd, sudo, etc.)

import { ParsedCommand } from '../commandParser';
import { registerCommand } from './index';

// Storage for users
function getUsers(): Array<{name: string, uid: number, gid: number, home: string, shell: string, groups: string[]}> {
  if (typeof window === 'undefined') return [];
  const usersData = localStorage.getItem('terminal_users');
  return usersData ? JSON.parse(usersData) : [
    { name: 'root', uid: 0, gid: 0, home: '/root', shell: '/bin/bash', groups: ['root', 'sudo', 'wheel'] },
    { name: 'www-data', uid: 33, gid: 33, home: '/var/www', shell: '/usr/sbin/nologin', groups: ['www-data'] },
    { name: 'mysql', uid: 27, gid: 27, home: '/var/lib/mysql', shell: '/bin/false', groups: ['mysql'] },
    { name: 'postgres', uid: 26, gid: 26, home: '/var/lib/postgresql', shell: '/bin/bash', groups: ['postgres'] },
    { name: 'redis', uid: 110, gid: 117, home: '/var/lib/redis', shell: '/usr/sbin/nologin', groups: ['redis'] },
    { name: 'node', uid: 1000, gid: 1000, home: '/home/node', shell: '/bin/bash', groups: ['node', 'sudo'] },
  ];
}

function saveUsers(users: ReturnType<typeof getUsers>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('terminal_users', JSON.stringify(users));
}

function getGroups(): Array<{name: string, gid: number, members: string[]}> {
  if (typeof window === 'undefined') return [];
  const groupsData = localStorage.getItem('terminal_groups');
  return groupsData ? JSON.parse(groupsData) : [
    { name: 'root', gid: 0, members: ['root'] },
    { name: 'sudo', gid: 27, members: ['root', 'node'] },
    { name: 'wheel', gid: 10, members: ['root'] },
    { name: 'www-data', gid: 33, members: ['www-data'] },
    { name: 'mysql', gid: 27, members: ['mysql'] },
    { name: 'postgres', gid: 26, members: ['postgres'] },
    { name: 'redis', gid: 117, members: ['redis'] },
    { name: 'node', gid: 1000, members: ['node'] },
    { name: 'docker', gid: 998, members: ['root', 'node'] },
    { name: 'adm', gid: 4, members: ['root'] },
  ];
}

function saveGroups(groups: ReturnType<typeof getGroups>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('terminal_groups', JSON.stringify(groups));
}

// useradd command
registerCommand('useradd', async (parsed: ParsedCommand) => {
  const username = parsed.args[parsed.args.length - 1];
  
  if (!username) {
    return 'Usage: useradd [options] LOGIN\n\nuseradd: missing operand';
  }
  
  const users = getUsers();
  
  if (users.find(u => u.name === username)) {
    return `useradd: user '${username}' already exists`;
  }
  
  const homeDir = parsed.flags['d'] || parsed.flags['home'] || `/home/${username}`;
  const shell = parsed.flags['s'] || parsed.flags['shell'] || '/bin/bash';
  const uid = parsed.flags['u'] ? parseInt(String(parsed.flags['u'])) : Math.max(...users.map(u => u.uid)) + 1;
  const gid = parsed.flags['g'] ? parseInt(String(parsed.flags['g'])) : uid;
  
  users.push({
    name: username,
    uid,
    gid,
    home: String(homeDir),
    shell: String(shell),
    groups: [username],
  });
  
  saveUsers(users);
  
  // Also add group
  const groups = getGroups();
  groups.push({ name: username, gid, members: [username] });
  saveGroups(groups);
  
  return '';
});

// userdel command
registerCommand('userdel', async (parsed: ParsedCommand) => {
  const username = parsed.args[0];
  
  if (!username) {
    return 'Usage: userdel [options] LOGIN\n\nuserdel: missing operand';
  }
  
  if (username === 'root') {
    return 'userdel: cannot remove entry \'root\'';
  }
  
  const users = getUsers();
  const userIndex = users.findIndex(u => u.name === username);
  
  if (userIndex === -1) {
    return `userdel: user '${username}' does not exist`;
  }
  
  users.splice(userIndex, 1);
  saveUsers(users);
  
  // Also remove from groups
  const groups = getGroups();
  groups.forEach(g => {
    g.members = g.members.filter(m => m !== username);
  });
  saveGroups(groups);
  
  return '';
});

// usermod command
registerCommand('usermod', async (parsed: ParsedCommand) => {
  const username = parsed.args[parsed.args.length - 1];
  
  if (!username) {
    return 'Usage: usermod [options] LOGIN\n\nusermod: missing operand';
  }
  
  const users = getUsers();
  const user = users.find(u => u.name === username);
  
  if (!user) {
    return `usermod: user '${username}' does not exist`;
  }
  
  // Add to group
  const addGroup = parsed.flags['a'] && (parsed.flags['G'] || parsed.flags['groups']);
  if (addGroup) {
    const groupName = String(parsed.flags['G'] || parsed.flags['groups']);
    if (!user.groups.includes(groupName)) {
      user.groups.push(groupName);
    }
    
    const groups = getGroups();
    const group = groups.find(g => g.name === groupName);
    if (group && !group.members.includes(username)) {
      group.members.push(username);
      saveGroups(groups);
    }
  }
  
  // Change shell
  if (parsed.flags['s'] || parsed.flags['shell']) {
    user.shell = String(parsed.flags['s'] || parsed.flags['shell']);
  }
  
  // Change home
  if (parsed.flags['d'] || parsed.flags['home']) {
    user.home = String(parsed.flags['d'] || parsed.flags['home']);
  }
  
  saveUsers(users);
  return '';
});

// groupadd command
registerCommand('groupadd', async (parsed: ParsedCommand) => {
  const groupname = parsed.args[0];
  
  if (!groupname) {
    return 'Usage: groupadd [options] GROUP\n\ngroupadd: missing operand';
  }
  
  const groups = getGroups();
  
  if (groups.find(g => g.name === groupname)) {
    return `groupadd: group '${groupname}' already exists`;
  }
  
  const gid = parsed.flags['g'] ? parseInt(String(parsed.flags['g'])) : Math.max(...groups.map(g => g.gid)) + 1;
  
  groups.push({ name: groupname, gid, members: [] });
  saveGroups(groups);
  
  return '';
});

// groupdel command
registerCommand('groupdel', async (parsed: ParsedCommand) => {
  const groupname = parsed.args[0];
  
  if (!groupname) {
    return 'Usage: groupdel [options] GROUP\n\ngroupdel: missing operand';
  }
  
  if (['root', 'sudo', 'wheel'].includes(groupname)) {
    return `groupdel: cannot remove the primary group of user 'root'`;
  }
  
  const groups = getGroups();
  const groupIndex = groups.findIndex(g => g.name === groupname);
  
  if (groupIndex === -1) {
    return `groupdel: group '${groupname}' does not exist`;
  }
  
  groups.splice(groupIndex, 1);
  saveGroups(groups);
  
  return '';
});

// passwd command
registerCommand('passwd', async (parsed: ParsedCommand) => {
  const username = parsed.args[0] || 'root';
  
  const users = getUsers();
  const user = users.find(u => u.name === username);
  
  if (!user) {
    return `passwd: user '${username}' does not exist`;
  }
  
  return [
    `Changing password for ${username}.`,
    'Current password: ',
    'New password: ',
    'Retype new password: ',
    `passwd: password updated successfully`,
  ];
});

// su command
registerCommand('su', async (parsed: ParsedCommand) => {
  const username = parsed.args[0] || 'root';
  const loginShell = parsed.flags['l'] || parsed.flags['-'] || parsed.args.includes('-');
  
  const users = getUsers();
  const user = users.find(u => u.name === username);
  
  if (!user) {
    return `su: user ${username} does not exist or the user entry does not contain all the required fields`;
  }
  
  if (loginShell) {
    return `${username}@prod-srv-42:${user.home}$`;
  }
  
  return '';
});

// sudo command
registerCommand('sudo', async (parsed: ParsedCommand) => {
  const cmd = parsed.args.join(' ');
  
  if (!cmd) {
    return 'usage: sudo -h | -K | -k | -V\nusage: sudo -v [-ABknS] [-g group] [-h host] [-p prompt] [-u user]\nusage: sudo -l [-ABknS] [-g group] [-h host] [-p prompt] [-U user] [-u user] [command]\nusage: sudo [-ABbEHknPS] [-r role] [-t type] [-C num] [-D directory] [-g group] [-h host] [-p prompt] [-R directory] [-T timeout] [-u user] [VAR=value] [-i|-s] [<command>]\nusage: sudo -e [-ABknS] [-r role] [-t type] [-C num] [-D directory] [-g group] [-h host] [-p prompt] [-R directory] [-T timeout] [-u user] file ...';
  }
  
  if (parsed.flags['l'] || parsed.flags['list']) {
    return `Matching Defaults entries for root on prod-srv-42:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\\:/usr/local/bin\\:/usr/sbin\\:/usr/bin\\:/sbin\\:/bin\\:/snap/bin

User root may run the following commands on prod-srv-42:
    (ALL : ALL) ALL`;
  }
  
  // Just execute the command as if we had root access
  return '';
});

// id command
registerCommand('id', async (parsed: ParsedCommand) => {
  const username = parsed.args[0] || 'root';
  
  const users = getUsers();
  const user = users.find(u => u.name === username);
  
  if (!user) {
    return `id: '${username}': no such user`;
  }
  
  const groups = getGroups();
  const userGroups = groups
    .filter(g => g.members.includes(username) || g.name === user.groups[0])
    .map(g => `${g.gid}(${g.name})`)
    .join(',');
  
  return `uid=${user.uid}(${user.name}) gid=${user.gid}(${user.groups[0]}) groups=${userGroups}`;
});

// groups command
registerCommand('groups', async (parsed: ParsedCommand) => {
  const username = parsed.args[0] || 'root';
  
  const users = getUsers();
  const user = users.find(u => u.name === username);
  
  if (!user) {
    return `groups: '${username}': no such user`;
  }
  
  return `${username} : ${user.groups.join(' ')}`;
});

// whoami command (override from index.ts)
registerCommand('whoami', async () => {
  return 'root';
});

// who command
registerCommand('who', async () => {
  const tty = `pts/${Math.floor(Math.random() * 5)}`;
  const date = new Date();
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const ip = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
  
  return `root     ${tty}         ${dateStr} ${timeStr} (${ip})`;
});

// w command
registerCommand('w', async () => {
  const uptime = `${Math.floor(Math.random() * 30) + 1} days, ${Math.floor(Math.random() * 24)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
  const users = Math.floor(Math.random() * 3) + 1;
  const load = [(Math.random() * 1).toFixed(2), (Math.random() * 0.8).toFixed(2), (Math.random() * 0.5).toFixed(2)];
  
  const lines = [
    ` ${new Date().toTimeString().split(' ')[0]} up ${uptime},  ${users} user,  load average: ${load.join(', ')}`,
    'USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT',
    `root     pts/0    192.168.1.${Math.floor(Math.random() * 254) + 1}     ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}    0.00s  0.${String(Math.floor(Math.random() * 99)).padStart(2, '0')}s  0.00s w`,
  ];
  
  if (users > 1) {
    lines.push(`node     pts/1    192.168.1.${Math.floor(Math.random() * 254) + 1}     ${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}    ${Math.floor(Math.random() * 60)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}   0.${String(Math.floor(Math.random() * 99)).padStart(2, '0')}s  0.00s -bash`);
  }
  
  return lines;
});

// last command
registerCommand('last', async (parsed: ParsedCommand) => {
  const lines = [
    'root     pts/0        192.168.1.100    ' + new Date().toDateString().substring(4) + ' ' + new Date().toTimeString().split(' ')[0] + '   still logged in',
    'root     pts/0        192.168.1.100    ' + new Date(Date.now() - 86400000).toDateString().substring(4) + ' 14:23   - 18:45  (04:22)',
    'root     pts/1        192.168.1.101    ' + new Date(Date.now() - 172800000).toDateString().substring(4) + ' 09:15   - 12:30  (03:15)',
    'node     pts/0        192.168.1.102    ' + new Date(Date.now() - 259200000).toDateString().substring(4) + ' 10:00   - 17:00  (07:00)',
    'reboot   system boot  5.15.0-91-generi ' + new Date(Date.now() - 604800000).toDateString().substring(4) + ' 00:00   still running',
    '',
    'wtmp begins ' + new Date(Date.now() - 2592000000).toDateString(),
  ];
  
  return lines;
});

// lastlog command
registerCommand('lastlog', async () => {
  const lines = [
    'Username         Port     From             Latest',
    'root             pts/0    192.168.1.100    ' + new Date().toUTCString(),
    'daemon                                     **Never logged in**',
    'bin                                        **Never logged in**',
    'sys                                        **Never logged in**',
    'www-data                                   **Never logged in**',
    'mysql                                      **Never logged in**',
    'node             pts/1    192.168.1.102    ' + new Date(Date.now() - 86400000).toUTCString(),
  ];
  
  return lines;
});

// chage command
registerCommand('chage', async (parsed: ParsedCommand) => {
  const listFlag = parsed.flags['l'] || parsed.flags['list'];
  const username = parsed.args[parsed.args.length - 1];
  
  if (!username) {
    return 'Usage: chage [options] LOGIN';
  }
  
  if (listFlag) {
    const lastChange = new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    return [
      `Last password change                                    : ${lastChange}`,
      `Password expires                                        : never`,
      `Password inactive                                       : never`,
      `Account expires                                         : never`,
      `Minimum number of days between password change          : 0`,
      `Maximum number of days between password change          : 99999`,
      `Number of days of warning before password expires       : 7`,
    ];
  }
  
  return '';
});

// finger command
registerCommand('finger', async (parsed: ParsedCommand) => {
  const username = parsed.args[0];
  
  if (!username) {
    return [
      'Login     Name       Tty      Idle  Login Time   Office     Office Phone',
      'root      root       pts/0          ' + new Date().toDateString().substring(4) + ' ' + new Date().toTimeString().split(' ')[0],
    ];
  }
  
  const users = getUsers();
  const user = users.find(u => u.name === username);
  
  if (!user) {
    return `finger: ${username}: no such user.`;
  }
  
  return [
    `Login: ${user.name}              Name: ${user.name}`,
    `Directory: ${user.home}          Shell: ${user.shell}`,
    `On since ${new Date().toDateString()} on pts/0 from 192.168.1.100`,
    `No mail.`,
    `No Plan.`,
  ];
});

// newgrp command
registerCommand('newgrp', async (parsed: ParsedCommand) => {
  const groupname = parsed.args[0];
  
  if (!groupname) {
    return '';
  }
  
  const groups = getGroups();
  const group = groups.find(g => g.name === groupname);
  
  if (!group) {
    return `newgrp: group '${groupname}' does not exist`;
  }
  
  return '';
});

// getent command
registerCommand('getent', async (parsed: ParsedCommand) => {
  const database = parsed.args[0];
  const key = parsed.args[1];
  
  if (!database) {
    return 'Usage: getent [option]... database [key ...]';
  }
  
  switch (database) {
    case 'passwd':
      const users = getUsers();
      if (key) {
        const user = users.find(u => u.name === key);
        if (!user) return '';
        return `${user.name}:x:${user.uid}:${user.gid}:${user.name}:${user.home}:${user.shell}`;
      }
      return users.map(u => `${u.name}:x:${u.uid}:${u.gid}:${u.name}:${u.home}:${u.shell}`).join('\n');
    
    case 'group':
      const groups = getGroups();
      if (key) {
        const group = groups.find(g => g.name === key);
        if (!group) return '';
        return `${group.name}:x:${group.gid}:${group.members.join(',')}`;
      }
      return groups.map(g => `${g.name}:x:${g.gid}:${g.members.join(',')}`).join('\n');
    
    case 'hosts':
      if (key) {
        const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        return `${ip}       ${key}`;
      }
      return '127.0.0.1       localhost';
    
    case 'services':
      return [
        'ssh                   22/tcp',
        'http                  80/tcp',
        'https                 443/tcp',
        'mysql                 3306/tcp',
        'postgresql            5432/tcp',
        'redis                 6379/tcp',
      ].join('\n');
    
    default:
      return `getent: unknown database: ${database}`;
  }
});

export {};

