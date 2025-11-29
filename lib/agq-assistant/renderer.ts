// AGQ Sequence Renderer
// Interprets AGQ JSON sequences and renders animated terminal output

import {
  AGQSequence,
  AGQStep,
  ProgressStep,
  TextStep,
  ProcessStep,
  SectionStep,
  TableStep,
  WaitStep,
  StatusStep,
  MatrixStep,
  AsciiArtStep,
  TreeStep,
  TreeNode,
  CodeStep,
  QuantumStreamStep,
  QuantumScanStep,
  SPINNERS,
  COLORS,
  STATUS_PREFIXES,
} from './tools';

export interface RenderCallbacks {
  onOutput: (line: string) => void;
  onUpdateLastLine: (line: string) => void;
  onClearLastLines: (count: number) => void;
  isAborted: () => boolean;
  onQuantumStream?: (action: string, value?: number) => void;
}

/**
 * Renders an AGQ sequence with animations
 */
export async function renderSequence(
  sequence: AGQSequence,
  callbacks: RenderCallbacks
): Promise<boolean> {
  for (const step of sequence.steps) {
    if (callbacks.isAborted()) {
      callbacks.onOutput('{{c:33}}^C{{c:0}}');
      return false;
    }
    
    await renderStep(step, callbacks);
  }
  return true;
}

/**
 * Renders a single step
 */
async function renderStep(
  step: AGQStep,
  callbacks: RenderCallbacks
): Promise<void> {
  switch (step.tool) {
    case 'progress':
      await renderProgress(step, callbacks);
      break;
    case 'text':
      await renderText(step, callbacks);
      break;
    case 'process':
      await renderProcess(step, callbacks);
      break;
    case 'section':
      await renderSection(step, callbacks);
      break;
    case 'table':
      await renderTable(step, callbacks);
      break;
    case 'wait':
      await renderWait(step, callbacks);
      break;
    case 'status':
      await renderStatus(step, callbacks);
      break;
    case 'matrix':
      await renderMatrix(step, callbacks);
      break;
    case 'ascii-art':
      await renderAsciiArt(step, callbacks);
      break;
    case 'tree':
      await renderTree(step, callbacks);
      break;
    case 'code':
      await renderCode(step, callbacks);
      break;
    case 'clear-line':
      callbacks.onClearLastLines(step.count || 1);
      break;
    case 'quantum-stream':
      await renderQuantumStream(step, callbacks);
      break;
    case 'quantum-scan':
      await renderQuantumScan(step, callbacks);
      break;
  }
}

/**
 * Render progress bar
 */
async function renderProgress(
  step: ProgressStep,
  callbacks: RenderCallbacks
): Promise<void> {
  const { style, text, duration, percent, showPercent } = step;
  const frames = duration / 80; // ~12.5 fps
  const startTime = Date.now();
  
  // Initial output
  callbacks.onOutput('');
  
  for (let i = 0; i <= frames; i++) {
    if (callbacks.isAborted()) return;
    
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const currentPercent = percent !== undefined ? percent : Math.round(progress * 100);
    
    let line = '';
    
    switch (style) {
      case 'npm': {
        const width = 40;
        const filled = Math.round(progress * width);
        const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
        line = `${text || 'Loading'} [${bar}]${showPercent !== false ? ` ${currentPercent}%` : ''}`;
        break;
      }
      case 'wget': {
        const width = 50;
        const filled = Math.round(progress * width);
        const bar = '='.repeat(Math.max(0, filled - 1)) + (filled > 0 ? '>' : '') + ' '.repeat(width - filled);
        const speed = ((Math.random() * 5 + 1) * progress).toFixed(2);
        line = `${text || 'Downloading'} ${currentPercent}%[${bar}] ${speed}MB/s`;
        break;
      }
      case 'spinner': {
        const spinnerFrames = SPINNERS.dots;
        const frame = spinnerFrames[Math.floor(i) % spinnerFrames.length];
        line = `${frame} ${text || 'Processing...'}`;
        break;
      }
      case 'dots': {
        const dots = '.'.repeat((Math.floor(i / 5) % 4));
        line = `${text || 'Loading'}${dots.padEnd(3)}`;
        break;
      }
      case 'bar': {
        const width = 30;
        const filled = Math.round(progress * width);
        const bar = '▓'.repeat(filled) + '░'.repeat(width - filled);
        line = `[${bar}] ${currentPercent}%`;
        break;
      }
      case 'pulse': {
        const pulseFrames = SPINNERS.pulse;
        const frame = pulseFrames[Math.floor(i) % pulseFrames.length];
        line = `${frame} ${text || 'Processing...'}`;
        break;
      }
      case 'blocks': {
        const width = 20;
        const blockFrames = SPINNERS.blocks;
        const blocks = Array(width).fill('░').map((_, idx) => {
          const phase = (progress * width - idx);
          if (phase > 0 && phase < 1) {
            return blockFrames[Math.floor(phase * blockFrames.length)];
          }
          return phase >= 1 ? '█' : '░';
        }).join('');
        line = `[${blocks}] ${text || ''}`;
        break;
      }
    }
    
    callbacks.onUpdateLastLine(line);
    await sleep(80);
  }
}

/**
 * Render text with animation
 */
async function renderText(
  step: TextStep,
  callbacks: RenderCallbacks
): Promise<void> {
  const { content, animation = 'instant', style = 'normal', speed = 30, delay = 0 } = step;
  
  if (delay > 0) {
    await sleep(delay);
  }
  
  const colorCode = COLORS[style] || '';
  const resetCode = style !== 'normal' ? COLORS.reset : '';
  
  switch (animation) {
    case 'typewriter': {
      callbacks.onOutput('');
      for (let i = 0; i <= content.length; i++) {
        if (callbacks.isAborted()) return;
        const partial = content.substring(0, i);
        callbacks.onUpdateLastLine(`${colorCode}${partial}${resetCode}`);
        await sleep(speed);
      }
      break;
    }
    case 'reveal': {
      callbacks.onOutput('');
      for (let i = 0; i <= content.length; i++) {
        if (callbacks.isAborted()) return;
        const revealed = content.substring(0, i);
        const hidden = content.substring(i).replace(/./g, '█');
        callbacks.onUpdateLastLine(`${colorCode}${revealed}${COLORS.dim}${hidden}${resetCode}`);
        await sleep(speed * 2);
      }
      break;
    }
    case 'glitch': {
      const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      callbacks.onOutput('');
      
      for (let i = 0; i <= content.length + 5; i++) {
        if (callbacks.isAborted()) return;
        
        let result = '';
        for (let j = 0; j < content.length; j++) {
          if (j < i - 5) {
            result += content[j];
          } else if (j < i) {
            result += glitchChars[Math.floor(Math.random() * glitchChars.length)];
          } else {
            result += ' ';
          }
        }
        callbacks.onUpdateLastLine(`${colorCode}${result}${resetCode}`);
        await sleep(speed);
      }
      callbacks.onUpdateLastLine(`${colorCode}${content}${resetCode}`);
      break;
    }
    case 'fade-in': {
      const fadeChars = ['░', '▒', '▓', '█'];
      callbacks.onOutput('');
      
      for (let phase = 0; phase < fadeChars.length + 1; phase++) {
        if (callbacks.isAborted()) return;
        
        if (phase === fadeChars.length) {
          callbacks.onUpdateLastLine(`${colorCode}${content}${resetCode}`);
        } else {
          callbacks.onUpdateLastLine(`${COLORS.dim}${fadeChars[phase].repeat(content.length)}${COLORS.reset}`);
        }
        await sleep(100);
      }
      break;
    }
    case 'instant':
    default:
      callbacks.onOutput(`${colorCode}${content}${resetCode}`);
      break;
  }
}

/**
 * Render process simulation
 */
async function renderProcess(
  step: ProcessStep,
  callbacks: RenderCallbacks
): Promise<void> {
  const { type, text, duration, stages, showSpinner = true } = step;
  const spinnerFrames = SPINNERS.quantum;
  const stageTexts = stages || [text];
  const stageTime = duration / stageTexts.length;
  
  for (const stageText of stageTexts) {
    if (callbacks.isAborted()) return;
    
    callbacks.onOutput('');
    const startTime = Date.now();
    let i = 0;
    
    while (Date.now() - startTime < stageTime) {
      if (callbacks.isAborted()) return;
      
      const spinner = showSpinner ? `${spinnerFrames[i % spinnerFrames.length]} ` : '';
      const progress = Math.round(((Date.now() - startTime) / stageTime) * 100);
      
      let statusText = stageText;
      switch (type) {
        case 'decrypt':
          statusText = `${stageText} [${progress}%]`;
          break;
        case 'scanning':
          statusText = `${stageText} ${'·'.repeat(i % 4)}`;
          break;
        case 'sync':
          statusText = `${stageText} ↔ ${progress}%`;
          break;
      }
      
      callbacks.onUpdateLastLine(`${COLORS.info}${spinner}${statusText}${COLORS.reset}`);
      await sleep(80);
      i++;
    }
    
    // Complete stage
    callbacks.onUpdateLastLine(`${COLORS.success}✓${COLORS.reset} ${stageText}`);
  }
}

/**
 * Render section with border
 */
async function renderSection(
  step: SectionStep,
  callbacks: RenderCallbacks
): Promise<void> {
  const { title, content, style = 'box', color = 'info' } = step;
  const colorCode = COLORS[color] || '';
  const lines = Array.isArray(content) ? content : [content];
  const maxWidth = Math.max(title.length, ...lines.map(l => l.length)) + 4;
  
  switch (style) {
    case 'box': {
      callbacks.onOutput(`${colorCode}╔${'═'.repeat(maxWidth)}╗${COLORS.reset}`);
      callbacks.onOutput(`${colorCode}║${COLORS.reset} ${title.padEnd(maxWidth - 1)}${colorCode}║${COLORS.reset}`);
      callbacks.onOutput(`${colorCode}╠${'═'.repeat(maxWidth)}╣${COLORS.reset}`);
      for (const line of lines) {
        callbacks.onOutput(`${colorCode}║${COLORS.reset} ${line.padEnd(maxWidth - 1)}${colorCode}║${COLORS.reset}`);
      }
      callbacks.onOutput(`${colorCode}╚${'═'.repeat(maxWidth)}╝${COLORS.reset}`);
      break;
    }
    case 'line': {
      callbacks.onOutput(`${colorCode}── ${title} ${'─'.repeat(Math.max(0, maxWidth - title.length - 4))}${COLORS.reset}`);
      for (const line of lines) {
        callbacks.onOutput(`  ${line}`);
      }
      break;
    }
    case 'minimal': {
      callbacks.onOutput(`${colorCode}[${title}]${COLORS.reset}`);
      for (const line of lines) {
        callbacks.onOutput(`  ${line}`);
      }
      break;
    }
  }
}

/**
 * Render table
 */
async function renderTable(
  step: TableStep,
  callbacks: RenderCallbacks
): Promise<void> {
  const { headers, rows, style = 'simple' } = step;
  
  // Calculate column widths
  const colWidths = headers.map((h, i) => {
    const dataWidths = rows.map(r => (r[i] || '').length);
    return Math.max(h.length, ...dataWidths);
  });
  
  const totalWidth = colWidths.reduce((a, b) => a + b, 0) + (colWidths.length - 1) * 3;
  
  switch (style) {
    case 'box': {
      // Header
      callbacks.onOutput(`┌${'─'.repeat(totalWidth + 2)}┐`);
      const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join(' │ ');
      callbacks.onOutput(`│ ${headerLine} │`);
      callbacks.onOutput(`├${'─'.repeat(totalWidth + 2)}┤`);
      
      // Rows
      for (const row of rows) {
        const rowLine = row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join(' │ ');
        callbacks.onOutput(`│ ${rowLine} │`);
      }
      callbacks.onOutput(`└${'─'.repeat(totalWidth + 2)}┘`);
      break;
    }
    case 'simple':
    default: {
      // Header
      const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join('  ');
      callbacks.onOutput(`${COLORS.highlight}${headerLine}${COLORS.reset}`);
      callbacks.onOutput('─'.repeat(totalWidth));
      
      // Rows
      for (const row of rows) {
        const rowLine = row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join('  ');
        callbacks.onOutput(rowLine);
      }
      break;
    }
  }
}

/**
 * Render wait/delay
 */
async function renderWait(
  step: WaitStep,
  callbacks: RenderCallbacks
): Promise<void> {
  const { duration } = step;
  const start = Date.now();
  
  while (Date.now() - start < duration) {
    if (callbacks.isAborted()) return;
    await sleep(50);
  }
}

/**
 * Render status line
 */
async function renderStatus(
  step: StatusStep,
  callbacks: RenderCallbacks
): Promise<void> {
  const { type, text, prefix } = step;
  const statusPrefix = STATUS_PREFIXES[type] || STATUS_PREFIXES.info;
  const prefixText = prefix ? `${prefix} ` : '';
  
  callbacks.onOutput(`${statusPrefix} ${prefixText}${text}`);
}

/**
 * Render matrix effect
 */
async function renderMatrix(
  step: MatrixStep,
  callbacks: RenderCallbacks
): Promise<void> {
  const { duration, density = 5, message } = step;
  const chars = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789';
  const width = 60;
  const frames = duration / 100;
  
  callbacks.onOutput('');
  
  for (let f = 0; f < frames; f++) {
    if (callbacks.isAborted()) return;
    
    let line = '';
    for (let i = 0; i < width; i++) {
      if (Math.random() < density / 20) {
        line += `${COLORS.success}${chars[Math.floor(Math.random() * chars.length)]}${COLORS.reset}`;
      } else {
        line += ' ';
      }
    }
    
    callbacks.onUpdateLastLine(line);
    await sleep(100);
  }
  
  if (message) {
    const padding = Math.floor((width - message.length) / 2);
    callbacks.onUpdateLastLine(`${' '.repeat(padding)}${COLORS.highlight}${message}${COLORS.reset}`);
  }
}

/**
 * Render ASCII art
 */
async function renderAsciiArt(
  step: AsciiArtStep,
  callbacks: RenderCallbacks
): Promise<void> {
  const { art, animation = 'none', color = 'normal' } = step;
  const colorCode = COLORS[color] || '';
  const lines = art.split('\n');
  
  switch (animation) {
    case 'typewriter':
      for (const line of lines) {
        if (callbacks.isAborted()) return;
        callbacks.onOutput('');
        for (let i = 0; i <= line.length; i++) {
          if (callbacks.isAborted()) return;
          callbacks.onUpdateLastLine(`${colorCode}${line.substring(0, i)}${COLORS.reset}`);
          await sleep(5);
        }
      }
      break;
    case 'reveal':
      for (let i = 0; i < lines.length; i++) {
        if (callbacks.isAborted()) return;
        callbacks.onOutput(`${colorCode}${lines[i]}${COLORS.reset}`);
        await sleep(50);
      }
      break;
    default:
      for (const line of lines) {
        callbacks.onOutput(`${colorCode}${line}${COLORS.reset}`);
      }
  }
}

/**
 * Render tree structure
 */
async function renderTree(
  step: TreeStep,
  callbacks: RenderCallbacks
): Promise<void> {
  const { data } = step;
  
  function renderNode(node: TreeNode, prefix: string = '', isLast: boolean = true): void {
    const connector = isLast ? '└── ' : '├── ';
    const extension = isLast ? '    ' : '│   ';
    
    callbacks.onOutput(`${prefix}${connector}${node.name}`);
    
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        renderNode(node.children[i], prefix + extension, i === node.children.length - 1);
      }
    }
  }
  
  callbacks.onOutput(data.name);
  if (data.children) {
    for (let i = 0; i < data.children.length; i++) {
      renderNode(data.children[i], '', i === data.children.length - 1);
    }
  }
}

/**
 * Render code block
 */
async function renderCode(
  step: CodeStep,
  callbacks: RenderCallbacks
): Promise<void> {
  const { content, highlight = [] } = step;
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const lineNum = String(i + 1).padStart(3, ' ');
    const isHighlighted = highlight.includes(i + 1);
    const lineColor = isHighlighted ? COLORS.highlight : COLORS.dim;
    const codeColor = isHighlighted ? COLORS.warning : '';
    
    callbacks.onOutput(`${lineColor}${lineNum}${COLORS.reset} │ ${codeColor}${lines[i]}${COLORS.reset}`);
  }
}

/**
 * Render quantum stream control
 */
async function renderQuantumStream(
  step: QuantumStreamStep,
  callbacks: RenderCallbacks
): Promise<void> {
  const { action, value, message } = step;
  
  // Call the video control callback if available
  if (callbacks.onQuantumStream) {
    callbacks.onQuantumStream(action, value);
  }
  
  // Display message if provided
  if (message) {
    callbacks.onOutput(`${COLORS.quantum}[QuantumStream]${COLORS.reset} ${message}`);
  } else {
    // Default messages for actions
    const actionMessages: { [key: string]: string } = {
      'play': 'Stream activated',
      'pause': 'Stream paused',
      'stop': 'Stream terminated',
      'mute': 'Audio channel muted',
      'unmute': 'Audio channel restored',
      'seek': `Temporal position: ${value}s`,
      'volume': `Audio level: ${value}%`,
      'status': 'Checking stream status...',
    };
    callbacks.onOutput(`${COLORS.quantum}[QuantumStream]${COLORS.reset} ${actionMessages[action] || action}`);
  }
}

/**
 * Render quantum scan - dimensional viewport
 */
async function renderQuantumScan(
  step: QuantumScanStep,
  callbacks: RenderCallbacks
): Promise<void> {
  const { target, dimension, classification = 'CLASSIFIED', timestamp } = step;
  
  // Show scanning sequence
  callbacks.onOutput(`${COLORS.quantum}[AGQ-16.7.9v]${COLORS.reset} Inicjalizacja skanera kwantowego...`);
  callbacks.onOutput('');
  
  // Progress animation
  const progressSteps = [
    'Kalibracja viewport\'u temporalnego...',
    'Synchronizacja z wymiarami równoległymi...',
    'Filtrowanie interferencji kwantowej...',
  ];
  
  for (const progressText of progressSteps) {
    if (callbacks.isAborted()) return;
    
    callbacks.onOutput('');
    const spinnerFrames = SPINNERS.quantum;
    let i = 0;
    const duration = 800;
    const startTime = Date.now();
    
    while (Date.now() - startTime < duration) {
      if (callbacks.isAborted()) return;
      const spinner = spinnerFrames[i % spinnerFrames.length];
      callbacks.onUpdateLastLine(`${COLORS.info}${spinner}${COLORS.reset} ${progressText}`);
      await sleep(100);
      i++;
    }
    
    callbacks.onUpdateLastLine(`${COLORS.success}✓${COLORS.reset} ${progressText}`);
  }
  
  // Animated extraction phase - measure actual API time
  callbacks.onOutput('');
  const extractionSpinner = SPINNERS.quantum;
  let extractionIdx = 0;
  const extractionStartTime = Date.now();
  
  // Start API call and measure time
  let responseData: any = null;
  let responseError: any = null;
  let responseReceived = false;
  
  const scanPromise = fetch('/api/agq-scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target,
      dimension,
      classification,
      timestamp,
    }),
  }).then(async (res) => {
    if (!res.ok) throw new Error('Scan failed');
    return await res.json();
  });
  
  // Wait for response in background
  scanPromise
    .then((data) => {
      responseData = data;
      responseReceived = true;
    })
    .catch((err) => {
      responseError = err;
      responseReceived = true;
    });
  
  // Animate until response arrives (with minimum duration)
  const minDuration = 1500; // Minimum 1.5s animation
  while (!responseReceived || (Date.now() - extractionStartTime < minDuration)) {
    if (callbacks.isAborted()) return;
    
    const elapsed = Date.now() - extractionStartTime;
    const spinner = extractionSpinner[extractionIdx % extractionSpinner.length];
    
    // Calculate progress - if response received, go to 100%, otherwise estimate
    let progress: number;
    if (responseReceived && elapsed >= minDuration) {
      progress = 1;
    } else if (responseReceived) {
      // Response received but min duration not met - interpolate
      progress = Math.min(0.99, elapsed / minDuration);
    } else {
      // Estimate based on elapsed time (assume max 10 seconds)
      progress = Math.min(0.99, elapsed / 10000);
    }
    const percent = Math.min(99, Math.round(progress * 100));
    
    // Show progress with scanning effect
    const scanChars = ['█', '▓', '▒', '░'];
    const scanBar = Array(20).fill(0).map((_, i) => {
      const phase = (progress * 20 - i) * 2;
      if (phase > 0 && phase < 1) return scanChars[Math.floor(phase * scanChars.length)];
      return phase >= 1 ? '█' : '░';
    }).join('');
    
    callbacks.onUpdateLastLine(`${COLORS.info}${spinner}${COLORS.reset} Ekstrakcja obrazu z archiwum... [${scanBar}] ${percent}%`);
    await sleep(80);
    extractionIdx++;
  }
  
  // Final 100% update
  const scanBar = '█'.repeat(20);
  callbacks.onUpdateLastLine(`${COLORS.info}${extractionSpinner[extractionIdx % extractionSpinner.length]}${COLORS.reset} Ekstrakcja obrazu z archiwum... [${scanBar}] 100%`);
  await sleep(200);
  
  // Process response
  try {
    if (responseError) {
      throw responseError;
    }
    
    if (!responseData) {
      throw new Error('No data received');
    }
    
    const data = responseData;
    
    // Display metadata
    callbacks.onUpdateLastLine(`${COLORS.success}✓${COLORS.reset} Ekstrakcja obrazu z archiwum...`);
    callbacks.onOutput('');
    callbacks.onOutput(`${COLORS.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
    callbacks.onOutput(`${COLORS.highlight}QUANTUM SCAN RESULT${COLORS.reset}`);
    callbacks.onOutput(`${COLORS.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
    callbacks.onOutput(`${COLORS.info}Classification:${COLORS.reset} ${data.metadata.classification}`);
    callbacks.onOutput(`${COLORS.info}Date:${COLORS.reset} ${data.metadata.dateCreated} (${data.metadata.year})`);
    callbacks.onOutput(`${COLORS.info}Dimension:${COLORS.reset} ${data.metadata.dimension}`);
    callbacks.onOutput(`${COLORS.info}Hex Code:${COLORS.reset} ${data.metadata.hexCode}`);
    callbacks.onOutput(`${COLORS.info}Source:${COLORS.reset} ${data.metadata.source}`);
    callbacks.onOutput('');
    
    // Display image with progressive reveal marker
    const imageUrl = `data:${data.mimeType};base64,${data.image}`;
    callbacks.onOutput(`[QUANTUM_SCAN_IMAGE:${imageUrl}]`); // Special marker for progressive reveal
    callbacks.onOutput(`${COLORS.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
    callbacks.onOutput(`${COLORS.warning}Uwaga: Obraz może być zniekształcony przez interferencję wymiarową.${COLORS.reset}`);
    
  } catch (error: any) {
    callbacks.onUpdateLastLine(`${COLORS.error}[FAIL]${COLORS.reset} Ekstrakcja nieudana`);
    callbacks.onOutput(`${COLORS.error}Skan nieudany: ${error.message}${COLORS.reset}`);
  }
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates default callbacks for Terminal component
 */
export function createTerminalCallbacks(
  setOutput: React.Dispatch<React.SetStateAction<string[]>>,
  abortSignal: { aborted: boolean },
  onQuantumStream?: (action: string, value?: number) => void
): RenderCallbacks {
  return {
    onOutput: (line: string) => {
      setOutput(prev => [...prev, line]);
    },
    onUpdateLastLine: (line: string) => {
      setOutput(prev => {
        const newOutput = [...prev];
        if (newOutput.length > 0) {
          newOutput[newOutput.length - 1] = line;
        } else {
          newOutput.push(line);
        }
        return newOutput;
      });
    },
    onClearLastLines: (count: number) => {
      setOutput(prev => prev.slice(0, -count));
    },
    isAborted: () => abortSignal.aborted,
    onQuantumStream,
  };
}

