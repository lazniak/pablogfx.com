// Package management commands (apt, dpkg, etc.)

import { ParsedCommand } from '../commandParser';
import { registerCommand, getCommandHandler } from './registry';
import { generateAptProgress, generateInstallProgress } from '../progressBar';

// Storage for installed packages
function getInstalledPackages(): string[] {
  if (typeof window === 'undefined') return [];
  const packages = localStorage.getItem('terminal_packages');
  return packages ? JSON.parse(packages) : ['base-files', 'bash', 'coreutils', 'grep', 'sed', 'gawk', 'tar', 'gzip', 'bzip2'];
}

function addPackage(pkg: string): void {
  if (typeof window === 'undefined') return;
  const packages = getInstalledPackages();
  if (!packages.includes(pkg)) {
    packages.push(pkg);
    localStorage.setItem('terminal_packages', JSON.stringify(packages));
  }
}

function removePackage(pkg: string): void {
  if (typeof window === 'undefined') return;
  const packages = getInstalledPackages().filter(p => p !== pkg);
  localStorage.setItem('terminal_packages', JSON.stringify(packages));
}

// apt command
registerCommand('apt', async (parsed: ParsedCommand) => {
  const subcommand = parsed.args[0];
  
  if (!subcommand) {
    return `apt 2.7.14 (amd64)
Usage: apt [options] command

apt is a commandline package manager and provides commands for
searching and managing as well as querying information about packages.
It provides the same functionality as the specialized APT tools,
like apt-get and apt-cache, but enables options more suitable for
interactive use by default.

Most used commands:
  list - list packages based on package names
  search - search in package descriptions
  show - show package details
  install - install packages
  reinstall - reinstall packages
  remove - remove packages
  autoremove - Remove automatically all unused packages
  update - update list of available packages
  upgrade - upgrade the system by installing/upgrading packages
  full-upgrade - upgrade the system by removing/installing/upgrading packages
  edit-sources - edit the source information file
  satisfy - satisfy dependency strings

See apt(8) for more information about the available commands.`;
  }
  
  switch (subcommand) {
    case 'update':
      return generateAptProgress([], 'update');
    
    case 'upgrade':
      return generateAptProgress([], 'upgrade');
    
    case 'install':
      const packages = parsed.args.slice(1);
      if (packages.length === 0) {
        return 'E: Unable to locate package';
      }
      packages.forEach(pkg => addPackage(pkg));
      return generateAptProgress(packages, 'install');
    
    case 'remove':
    case 'purge':
      const toRemove = parsed.args.slice(1);
      if (toRemove.length === 0) {
        return 'E: Unable to locate package';
      }
      toRemove.forEach(pkg => removePackage(pkg));
      return generateAptProgress(toRemove, 'remove');
    
    case 'autoremove':
      return [
        'Reading package lists... Done',
        'Building dependency tree... Done',
        'Reading state information... Done',
        '0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.',
      ];
    
    case 'search':
      const query = parsed.args[1] || '';
      if (!query) {
        return 'E: You must give at least one search pattern';
      }
      return [
        `Sorting... Done`,
        `Full Text Search... Done`,
        `${query}/jammy 1.0.0-1 amd64`,
        `  ${query} - A useful package`,
        ``,
        `lib${query}/jammy 1.0.0-1 amd64`,
        `  ${query} library`,
        ``,
        `${query}-dev/jammy 1.0.0-1 amd64`,
        `  ${query} development files`,
      ];
    
    case 'show':
      const showPkg = parsed.args[1];
      if (!showPkg) {
        return 'E: Unable to locate package';
      }
      return [
        `Package: ${showPkg}`,
        `Version: 1.0.0-1ubuntu1`,
        `Priority: optional`,
        `Section: utils`,
        `Origin: Ubuntu`,
        `Maintainer: Ubuntu Developers <ubuntu-devel-discuss@lists.ubuntu.com>`,
        `Bugs: https://bugs.launchpad.net/ubuntu/+filebug`,
        `Installed-Size: ${Math.floor(Math.random() * 10000 + 1000)} kB`,
        `Depends: libc6 (>= 2.34), libgcc-s1 (>= 3.0)`,
        `Homepage: https://example.com/${showPkg}`,
        `Download-Size: ${Math.floor(Math.random() * 5000 + 500)} kB`,
        `APT-Sources: http://archive.ubuntu.com/ubuntu jammy/main amd64 Packages`,
        `Description: ${showPkg} package`,
        ` This is a package that provides ${showPkg} functionality.`,
        ` It is very useful for many things.`,
      ];
    
    case 'list':
      const installed = parsed.flags['installed'];
      if (installed) {
        const pkgs = getInstalledPackages();
        return [
          'Listing... Done',
          ...pkgs.map(p => `${p}/jammy,now 1.0.0-1 amd64 [installed]`),
        ];
      }
      return [
        'Listing... Done',
        ...getInstalledPackages().slice(0, 10).map(p => `${p}/jammy 1.0.0-1 amd64`),
        '... and more packages available',
      ];
    
    case 'clean':
      return '';
    
    case 'autoclean':
      return [
        'Reading package lists... Done',
        'Building dependency tree... Done',
        'Reading state information... Done',
      ];
    
    default:
      return `E: Invalid operation ${subcommand}`;
  }
});

// apt-get command (alias for apt)
registerCommand('apt-get', async (parsed: ParsedCommand) => {
  // Same as apt for most cases
  const handler = getCommandHandler('apt');
  if (handler) {
    return handler(parsed, '');
  }
  return 'apt-get: command not found';
});

// apt-cache command
registerCommand('apt-cache', async (parsed: ParsedCommand) => {
  const subcommand = parsed.args[0];
  
  if (!subcommand) {
    return `apt-cache - query the APT cache

Usage: apt-cache [options] command
       apt-cache [options] show pkg1 [pkg2 ...]

Commands:
  show - Show package records
  search - Search the package list for a regex pattern
  showpkg - Show some general information for a single package
  policy - Show policy settings`;
  }
  
  switch (subcommand) {
    case 'show':
      const pkg = parsed.args[1];
      if (!pkg) {
        return 'E: Unable to locate package';
      }
      return [
        `Package: ${pkg}`,
        `Version: 1.0.0-1`,
        `Architecture: amd64`,
        `Maintainer: Ubuntu Developers <ubuntu-devel@lists.ubuntu.com>`,
        `Installed-Size: ${Math.floor(Math.random() * 5000 + 500)}`,
        `Depends: libc6 (>= 2.34)`,
        `Description-en: ${pkg} package`,
        ` A useful package for various purposes.`,
        `Homepage: https://example.com/${pkg}`,
      ];
    
    case 'search':
      const query = parsed.args[1] || '';
      return [
        `${query} - A useful package`,
        `lib${query} - ${query} library`,
        `${query}-dev - Development files for ${query}`,
        `${query}-doc - Documentation for ${query}`,
      ];
    
    case 'policy':
      const policyPkg = parsed.args[1];
      if (!policyPkg) {
        return [
          'Package files:',
          ' 100 /var/lib/dpkg/status',
          '     release a=now',
          ' 500 http://archive.ubuntu.com/ubuntu jammy/main amd64 Packages',
          '     release v=22.04,o=Ubuntu,a=jammy,n=jammy,l=Ubuntu,c=main,b=amd64',
          'Pinned packages:',
        ];
      }
      return [
        `${policyPkg}:`,
        `  Installed: 1.0.0-1`,
        `  Candidate: 1.0.0-1`,
        `  Version table:`,
        ` *** 1.0.0-1 500`,
        `        500 http://archive.ubuntu.com/ubuntu jammy/main amd64 Packages`,
        `        100 /var/lib/dpkg/status`,
      ];
    
    default:
      return `E: Invalid operation ${subcommand}`;
  }
});

// dpkg command
registerCommand('dpkg', async (parsed: ParsedCommand) => {
  const listFlag = parsed.flags['l'] || parsed.flags['list'];
  const installFlag = parsed.flags['i'] || parsed.flags['install'];
  const removeFlag = parsed.flags['r'] || parsed.flags['remove'];
  const purgeFlag = parsed.flags['P'] || parsed.flags['purge'];
  const statusFlag = parsed.flags['s'] || parsed.flags['status'];
  const infoFlag = parsed.flags['I'] || parsed.flags['info'];
  
  if (listFlag) {
    const packages = getInstalledPackages();
    const lines = [
      'Desired=Unknown/Install/Remove/Purge/Hold',
      '| Status=Not/Inst/Conf-files/Unpacked/halF-conf/Half-inst/trig-aWait/Trig-pend',
      '|/ Err?=(none)/Reinst-required (Status,Err: uppercase=bad)',
      '||/ Name                           Version                Architecture Description',
      '+++-==============================-======================-============-========================================',
    ];
    packages.forEach(pkg => {
      lines.push(`ii  ${pkg.padEnd(30)} 1.0.0-1                amd64        ${pkg} package`);
    });
    return lines;
  }
  
  if (installFlag) {
    const debFile = parsed.args[0];
    if (!debFile) {
      return 'dpkg: error: --install needs at least one package archive file argument';
    }
    const pkgName = debFile.replace('.deb', '').replace(/[^a-zA-Z0-9-]/g, '');
    addPackage(pkgName);
    return [
      `Selecting previously unselected package ${pkgName}.`,
      `(Reading database ... 150000 files and directories currently installed.)`,
      `Preparing to unpack ${debFile} ...`,
      `Unpacking ${pkgName} (1.0.0) ...`,
      `Setting up ${pkgName} (1.0.0) ...`,
    ];
  }
  
  if (removeFlag || purgeFlag) {
    const pkg = parsed.args[0];
    if (!pkg) {
      return 'dpkg: error: --remove needs at least one package name argument';
    }
    removePackage(pkg);
    return [
      `(Reading database ... 150000 files and directories currently installed.)`,
      `Removing ${pkg} (1.0.0) ...`,
      purgeFlag ? `Purging configuration files for ${pkg} (1.0.0) ...` : '',
    ].filter(Boolean);
  }
  
  if (statusFlag) {
    const pkg = parsed.args[0];
    if (!pkg) {
      return 'dpkg-query: error: --status needs a valid package name';
    }
    const installed = getInstalledPackages().includes(pkg);
    if (!installed) {
      return `dpkg-query: package '${pkg}' is not installed and no information is available`;
    }
    return [
      `Package: ${pkg}`,
      `Status: install ok installed`,
      `Priority: optional`,
      `Section: utils`,
      `Installed-Size: ${Math.floor(Math.random() * 5000 + 500)}`,
      `Maintainer: Ubuntu Developers <ubuntu-devel@lists.ubuntu.com>`,
      `Architecture: amd64`,
      `Version: 1.0.0-1`,
      `Description: ${pkg} package`,
      ` A useful package.`,
    ];
  }
  
  if (infoFlag) {
    const debFile = parsed.args[0];
    if (!debFile) {
      return 'dpkg-deb: error: need a .deb filename argument';
    }
    return [
      ` new Debian package, version 2.0.`,
      ` size ${Math.floor(Math.random() * 1000000 + 100000)} bytes: control archive=${Math.floor(Math.random() * 10000 + 1000)} bytes.`,
      `     ${Math.floor(Math.random() * 1000 + 100)} bytes,    10 lines      control              `,
      `     ${Math.floor(Math.random() * 500 + 50)} bytes,     5 lines      md5sums              `,
      ` Package: ${debFile.replace('.deb', '')}`,
      ` Version: 1.0.0`,
      ` Architecture: amd64`,
      ` Maintainer: Package Maintainer <maintainer@example.com>`,
      ` Installed-Size: ${Math.floor(Math.random() * 5000 + 500)}`,
      ` Section: utils`,
      ` Priority: optional`,
      ` Description: A useful package`,
    ];
  }
  
  return `dpkg, a package manager.
Usage: dpkg [<option>...] <command>

Commands:
  -i, --install       Install a package
  -r, --remove        Remove a package
  -P, --purge         Purge a package
  -l, --list          List packages
  -s, --status        Display package status
  -I, --info          Show info about .deb file`;
});

// dpkg-query command
registerCommand('dpkg-query', async (parsed: ParsedCommand) => {
  const listFlag = parsed.flags['l'] || parsed.flags['list'];
  const statusFlag = parsed.flags['s'] || parsed.flags['status'];
  const showFlag = parsed.flags['W'] || parsed.flags['show'];
  
  if (listFlag) {
    const handler = getCommandHandler('dpkg');
    if (handler) {
      return handler({ ...parsed, flags: { l: true } }, '');
    }
  }
  
  if (statusFlag) {
    const handler = getCommandHandler('dpkg');
    if (handler) {
      return handler({ ...parsed, flags: { s: true } }, '');
    }
  }
  
  if (showFlag) {
    const packages = getInstalledPackages();
    return packages.map(p => `${p}\t1.0.0-1`).join('\n');
  }
  
  return 'dpkg-query: error: need a valid action';
});

// pip command (enhanced)
registerCommand('pip', async (parsed: ParsedCommand) => {
  const subcommand = parsed.args[0];
  
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    return `
Usage:   
  pip <command> [options]

Commands:
  install                     Install packages.
  download                    Download packages.
  uninstall                   Uninstall packages.
  freeze                      Output installed packages in requirements format.
  inspect                     Inspect the python environment.
  list                        List installed packages.
  show                        Show information about installed packages.
  check                       Verify installed packages have compatible dependencies.
  config                      Manage local and global configuration.
  search                      Search PyPI for packages.
  cache                       Inspect and manage pip's wheel cache.
  index                       Inspect information available from package indexes.
  wheel                       Build wheels from your requirements.
  hash                        Compute hashes of package archives.
  completion                  A helper command used for command completion.
  debug                       Show information useful for debugging.
  help                        Show help for commands.`;
  }
  
  switch (subcommand) {
    case 'install':
      const packages = parsed.args.slice(1);
      if (packages.length === 0) {
        return 'ERROR: You must give at least one requirement to install';
      }
      const result: string[] = [];
      for (const pkg of packages) {
        result.push(...generateInstallProgress(pkg));
      }
      return result;
    
    case 'uninstall':
      const toRemove = parsed.args.slice(1);
      if (toRemove.length === 0) {
        return 'ERROR: You must give at least one requirement to uninstall';
      }
      return [
        `Found existing installation: ${toRemove[0]} 1.0.0`,
        `Uninstalling ${toRemove[0]}-1.0.0:`,
        `  Would remove:`,
        `    /usr/local/lib/python3.11/dist-packages/${toRemove[0]}/*`,
        `Proceed (Y/n)? y`,
        `  Successfully uninstalled ${toRemove[0]}-1.0.0`,
      ];
    
    case 'list':
      return [
        'Package                  Version',
        '------------------------ --------',
        'pip                      23.3.1',
        'setuptools               68.2.2',
        'wheel                    0.41.2',
        'numpy                    1.26.2',
        'pandas                   2.1.3',
        'requests                 2.31.0',
      ];
    
    case 'show':
      const showPkg = parsed.args[1];
      if (!showPkg) {
        return 'ERROR: Please provide a package name';
      }
      return [
        `Name: ${showPkg}`,
        `Version: 1.0.0`,
        `Summary: A Python package`,
        `Home-page: https://pypi.org/project/${showPkg}/`,
        `Author: Package Author`,
        `Author-email: author@example.com`,
        `License: MIT`,
        `Location: /usr/local/lib/python3.11/dist-packages`,
        `Requires: `,
        `Required-by: `,
      ];
    
    case 'freeze':
      return [
        'certifi==2023.11.17',
        'charset-normalizer==3.3.2',
        'idna==3.6',
        'numpy==1.26.2',
        'pandas==2.1.3',
        'pip==23.3.1',
        'python-dateutil==2.8.2',
        'pytz==2023.3.post1',
        'requests==2.31.0',
        'setuptools==68.2.2',
        'six==1.16.0',
        'tzdata==2023.3',
        'urllib3==2.1.0',
        'wheel==0.41.2',
      ];
    
    case 'search':
      return 'NOTICE: XMLRPC request failed [code: -32500]\nPyPI no longer supports "pip search". Please use https://pypi.org/search';
    
    default:
      return `ERROR: unknown command "${subcommand}"`;
  }
});

// pip3 command (alias for pip)
registerCommand('pip3', async (parsed: ParsedCommand) => {
  const handler = getCommandHandler('pip');
  if (handler) {
    return handler(parsed, '');
  }
  return 'pip3: command not found';
});

// npm command
registerCommand('npm', async (parsed: ParsedCommand) => {
  const subcommand = parsed.args[0];
  
  if (!subcommand) {
    return `
Usage: npm <command>

where <command> is one of:
    access, adduser, audit, bugs, cache, ci, completion,
    config, dedupe, deprecate, diff, dist-tag, docs, doctor,
    edit, exec, explain, explore, find-dupes, fund, get, help,
    hook, init, install, install-ci-test, install-test, link,
    ll, login, logout, ls, org, outdated, owner, pack, ping,
    pkg, prefix, profile, prune, publish, query, rebuild, repo,
    restart, root, run-script, search, set, shrinkwrap, star,
    stars, start, stop, team, test, token, uninstall, unpublish,
    unstar, update, version, view, whoami

npm@10.2.4 /usr/lib/node_modules/npm`;
  }
  
  switch (subcommand) {
    case 'install':
    case 'i':
      const packages = parsed.args.slice(1);
      if (packages.length === 0) {
        return [
          '',
          'added 0 packages in 1s',
          '',
          '0 packages are looking for funding',
          '  run `npm fund` for details',
        ];
      }
      const lines: string[] = [];
      for (const pkg of packages) {
        lines.push(`npm WARN deprecated ${pkg}@1.0.0: Please upgrade to the latest version`);
      }
      lines.push('');
      lines.push(`added ${packages.length} packages in ${(Math.random() * 5 + 1).toFixed(1)}s`);
      lines.push('');
      lines.push(`${Math.floor(Math.random() * 10 + 1)} packages are looking for funding`);
      lines.push('  run `npm fund` for details');
      return lines;
    
    case 'uninstall':
    case 'remove':
    case 'rm':
      const toRemove = parsed.args.slice(1);
      if (toRemove.length === 0) {
        return 'npm ERR! Must provide a package name to remove.';
      }
      return [
        '',
        `removed ${toRemove.length} packages in ${(Math.random() * 2 + 0.5).toFixed(1)}s`,
      ];
    
    case 'list':
    case 'ls':
      return [
        'project@1.0.0 /home/user/project',
        '├── express@4.18.2',
        '├── lodash@4.17.21',
        '├── moment@2.29.4',
        '├── react@18.2.0',
        '├── react-dom@18.2.0',
        '└── typescript@5.3.2',
      ];
    
    case 'run':
      const script = parsed.args[1];
      if (!script) {
        return [
          'Lifecycle scripts included in project@1.0.0:',
          '  start',
          '    node server.js',
          '  test',
          '    jest',
          '',
          'available via `npm run-script`:',
          '  build',
          '    tsc && vite build',
          '  dev',
          '    vite',
          '  lint',
          '    eslint .',
        ];
      }
      return `> project@1.0.0 ${script}\n> Running ${script}...`;
    
    case 'init':
      return [
        'This utility will walk you through creating a package.json file.',
        'Press ^C at any time to quit.',
        'package name: (project) ',
        'version: (1.0.0) ',
        'description: ',
        'entry point: (index.js) ',
        'test command: ',
        'git repository: ',
        'keywords: ',
        'author: ',
        'license: (ISC) ',
        'Wrote to /home/user/project/package.json',
      ];
    
    case 'version':
    case '-v':
    case '--version':
      return '10.2.4';
    
    default:
      return `npm ERR! Unknown command "${subcommand}"`;
  }
});

// yarn command
registerCommand('yarn', async (parsed: ParsedCommand) => {
  const subcommand = parsed.args[0];
  
  if (!subcommand || subcommand === 'install') {
    return [
      'yarn install v1.22.21',
      '[1/4] Resolving packages...',
      '[2/4] Fetching packages...',
      '[3/4] Linking dependencies...',
      '[4/4] Building fresh packages...',
      'Done in 3.45s.',
    ];
  }
  
  switch (subcommand) {
    case 'add':
      const packages = parsed.args.slice(1);
      if (packages.length === 0) {
        return 'error Missing list of packages to add to your project.';
      }
      return [
        'yarn add v1.22.21',
        '[1/4] Resolving packages...',
        '[2/4] Fetching packages...',
        '[3/4] Linking dependencies...',
        '[4/4] Building fresh packages...',
        `success Saved ${packages.length} new dependencies.`,
        ...packages.map(p => `info Direct dependencies: ${p}@^1.0.0`),
        `Done in ${(Math.random() * 5 + 1).toFixed(2)}s.`,
      ];
    
    case 'remove':
      const toRemove = parsed.args.slice(1);
      if (toRemove.length === 0) {
        return 'error Missing list of packages to remove from your project.';
      }
      return [
        'yarn remove v1.22.21',
        '[1/2] Removing module...',
        '[2/2] Regenerating lockfile and installing missing dependencies...',
        `success Uninstalled packages.`,
        `Done in ${(Math.random() * 2 + 0.5).toFixed(2)}s.`,
      ];
    
    case '-v':
    case '--version':
      return '1.22.21';
    
    default:
      return `error Unknown command: "${subcommand}"`;
  }
});

export {};

