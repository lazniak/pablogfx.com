# SSH Terminal Emulator

A realistic Ubuntu SSH terminal emulator powered by Google Gemini Flash 2.5.

## Features

- Realistic SSH login with password authentication (3 attempts)
- Full Linux command simulation (ls, cd, cat, vim, mc, pip install, etc.)
- Virtual file system stored in browser localStorage
- LLM-powered responses that adapt to user expertise level
- Hacking-themed experience with `hackit` command
- Classic Ubuntu terminal appearance

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Usage

- On first visit, you'll be prompted for a password
- After 3 attempts, any password will work and be saved
- Use standard Linux commands
- Type `hackit -h` for hacking tools help
- Type `help` for available commands
- Type `exit` to logout

## Commands

- **Basic**: ls, cd, pwd, cat, echo, whoami, hostname, date
- **File ops**: touch, mkdir, rm, rmdir, cp, mv
- **Text editors**: vim, nano (simulated)
- **File manager**: mc (Midnight Commander)
- **Search**: grep, find
- **System**: ps, top, df, du, free, uname
- **Package manager**: pip install <package>
- **Network**: wget, curl
- **Custom**: hackit (use hackit -h for help)

## Storage

All data is stored in browser localStorage:
- Password (after 3rd attempt)
- File system structure
- Disk usage
- Command history
- User level detection
- Installed packages

