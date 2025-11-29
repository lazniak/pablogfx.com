// AGQ-ASSISTANT Tool Definitions
// These tools are used by the assistant to create animated terminal sequences

/**
 * Available tool types for AGQ sequences
 */
export type ToolType =
  | 'progress'      // Progress bars (npm, wget, spinner, dots, bar)
  | 'text'          // Text with animation (typewriter, reveal, instant, glitch)
  | 'process'       // Process simulation (loading, scanning, compiling, decrypt)
  | 'section'       // Section with border/header
  | 'table'         // Data table
  | 'wait'          // Delay/pause
  | 'prompt'        // User prompt (yes/no, input)
  | 'clear-line'    // Clear last line (for animations)
  | 'matrix'        // Matrix-style falling characters
  | 'ascii-art'     // ASCII art display
  | 'status'        // Status line [OK], [FAIL], [WARN]
  | 'tree'          // Tree structure display
  | 'code'          // Code block with syntax hints
  | 'quantum-stream' // Control video stream (play, pause, seek, volume)

/**
 * Progress bar styles
 */
export type ProgressStyle = 'npm' | 'wget' | 'spinner' | 'dots' | 'bar' | 'pulse' | 'blocks';

/**
 * Text animation styles
 */
export type TextAnimation = 'typewriter' | 'reveal' | 'instant' | 'glitch' | 'fade-in';

/**
 * Text style/color
 */
export type TextStyle = 'normal' | 'success' | 'error' | 'warning' | 'info' | 'dim' | 'highlight' | 'quantum';

/**
 * Process simulation types
 */
export type ProcessType = 'loading' | 'scanning' | 'compiling' | 'decrypt' | 'upload' | 'download' | 'analyze' | 'sync';

/**
 * Status types
 */
export type StatusType = 'ok' | 'fail' | 'warn' | 'info' | 'skip' | 'done';

// Step interfaces for each tool type

export interface ProgressStep {
  tool: 'progress';
  style: ProgressStyle;
  text?: string;
  duration: number;        // ms
  percent?: number;        // 0-100, if undefined = indeterminate
  showPercent?: boolean;
}

export interface TextStep {
  tool: 'text';
  content: string;
  animation?: TextAnimation;
  style?: TextStyle;
  speed?: number;          // ms per character for typewriter
  delay?: number;          // delay before starting
}

export interface ProcessStep {
  tool: 'process';
  type: ProcessType;
  text: string;
  duration: number;
  stages?: string[];       // Multiple stages to show
  showSpinner?: boolean;
}

export interface SectionStep {
  tool: 'section';
  title: string;
  content: string | string[];
  style?: 'box' | 'line' | 'minimal';
  color?: TextStyle;
}

export interface TableStep {
  tool: 'table';
  headers: string[];
  rows: string[][];
  style?: 'simple' | 'box' | 'minimal';
}

export interface WaitStep {
  tool: 'wait';
  duration: number;        // ms
}

export interface PromptStep {
  tool: 'prompt';
  type: 'yesno' | 'input' | 'choice';
  question: string;
  options?: string[];
  default?: string;
}

export interface ClearLineStep {
  tool: 'clear-line';
  count?: number;          // Number of lines to clear, default 1
}

export interface MatrixStep {
  tool: 'matrix';
  duration: number;
  density?: number;        // 1-10
  message?: string;        // Message to reveal
}

export interface AsciiArtStep {
  tool: 'ascii-art';
  art: string;
  animation?: 'none' | 'typewriter' | 'reveal';
  color?: TextStyle;
}

export interface StatusStep {
  tool: 'status';
  type: StatusType;
  text: string;
  prefix?: string;
}

export interface TreeStep {
  tool: 'tree';
  data: TreeNode;
  expanded?: boolean;
}

export interface TreeNode {
  name: string;
  children?: TreeNode[];
}

export interface CodeStep {
  tool: 'code';
  content: string;
  language?: string;
  highlight?: number[];    // Line numbers to highlight
}

export interface QuantumStreamStep {
  tool: 'quantum-stream';
  action: 'play' | 'pause' | 'stop' | 'seek' | 'volume' | 'mute' | 'unmute' | 'status';
  value?: number;          // For seek (seconds) or volume (0-100)
  message?: string;        // Optional message to display
}

/**
 * Union type of all step types
 */
export type AGQStep =
  | ProgressStep
  | TextStep
  | ProcessStep
  | SectionStep
  | TableStep
  | WaitStep
  | PromptStep
  | ClearLineStep
  | MatrixStep
  | AsciiArtStep
  | StatusStep
  | TreeStep
  | CodeStep
  | QuantumStreamStep;

/**
 * A sequence of steps to execute
 */
export interface AGQSequence {
  id: string;
  interruptible: boolean;  // Can be cancelled with CTRL+C
  steps: AGQStep[];
  metadata?: {
    initiationLevel?: number;
    context?: string;
  };
}

/**
 * Response from AGQ Assistant
 */
export interface AGQResponse {
  sequence: AGQSequence;
  nextPrompt?: string;     // Suggested next action
  stateUpdate?: {
    initiationLevel?: number;
    unlockedTopics?: string[];
  };
}

/**
 * AGQ Context for conversations
 */
export interface AGQContext {
  sessionId: string;
  initiationLevel: number; // 0-100
  failedCommands: string[];
  conversationHistory: AGQMessage[];
  unlockedTopics: string[];
  lastInteraction: number;
}

export interface AGQMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/**
 * Spinner frames for various styles
 */
export const SPINNERS = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['|', '/', '-', '\\'],
  pulse: ['█', '▓', '▒', '░', '▒', '▓'],
  blocks: ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'],
  quantum: ['◐', '◓', '◑', '◒'],
  braille: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
};

/**
 * Color codes for terminal (ANSI-like but for our renderer)
 */
export const COLORS = {
  normal: '',
  success: '{{c:32}}',    // Green
  error: '{{c:31}}',      // Red
  warning: '{{c:33}}',    // Yellow
  info: '{{c:36}}',       // Cyan
  dim: '{{c:90}}',        // Gray
  highlight: '{{c:97}}',  // Bright white
  quantum: '{{c:35}}',    // Magenta/Purple
  reset: '{{c:0}}',
};

/**
 * Status prefixes
 */
export const STATUS_PREFIXES = {
  ok: '{{c:32}}[  OK  ]{{c:0}}',
  fail: '{{c:31}}[ FAIL ]{{c:0}}',
  warn: '{{c:33}}[ WARN ]{{c:0}}',
  info: '{{c:36}}[ INFO ]{{c:0}}',
  skip: '{{c:90}}[ SKIP ]{{c:0}}',
  done: '{{c:32}}[ DONE ]{{c:0}}',
};

