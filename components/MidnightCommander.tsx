'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getNodeAtPath, createDirectory, writeFile, readFile, deleteNode } from '@/lib/filesystem';
import { getCurrentDir } from '@/lib/storage';

interface MCProps {
  onExit: () => void;
}

interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modified: string;
  permissions: string;
}

interface Panel {
  path: string;
  files: FileEntry[];
  selectedIndex: number;
  scrollOffset: number;
}

export default function MidnightCommander({ onExit }: MCProps) {
  const [leftPanel, setLeftPanel] = useState<Panel>({
    path: '/root',
    files: [],
    selectedIndex: 0,
    scrollOffset: 0,
  });
  const [rightPanel, setRightPanel] = useState<Panel>({
    path: '/tmp',
    files: [],
    selectedIndex: 0,
    scrollOffset: 0,
  });
  const [activePanel, setActivePanel] = useState<'left' | 'right'>('left');
  const [statusMessage, setStatusMessage] = useState('');
  const [inputMode, setInputMode] = useState<'none' | 'mkdir' | 'view' | 'edit' | 'confirm-delete'>('none');
  const [inputValue, setInputValue] = useState('');
  const [viewContent, setViewContent] = useState('');
  const [editContent, setEditContent] = useState('');
  const [deleteTarget, setDeleteTarget] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  const VISIBLE_ROWS = 18;

  const loadDirectory = useCallback((path: string): FileEntry[] => {
    const node = getNodeAtPath(path, '/');
    if (!node || node.type !== 'directory' || !node.children) {
      return [];
    }
    
    const entries: FileEntry[] = [];
    
    // Add parent directory entry (unless at root)
    if (path !== '/') {
      entries.push({
        name: '..',
        type: 'directory',
        size: 4096,
        modified: new Date().toISOString().split('T')[0],
        permissions: 'drwxr-xr-x',
      });
    }
    
    // Add directories first, then files
    const dirs: FileEntry[] = [];
    const files: FileEntry[] = [];
    
    for (const [name, child] of Object.entries(node.children)) {
      // Treat symlinks as files for display purposes
      const displayType: 'file' | 'directory' = child.type === 'directory' ? 'directory' : 'file';
      const entry: FileEntry = {
        name,
        type: displayType,
        size: child.type === 'file' || child.type === 'symlink' ? (child.content?.length || 0) : 4096,
        modified: new Date().toISOString().split('T')[0],
        permissions: child.type === 'directory' ? 'drwxr-xr-x' : child.type === 'symlink' ? 'lrwxrwxrwx' : '-rw-r--r--',
      };
      
      if (child.type === 'directory') {
        dirs.push(entry);
      } else {
        files.push(entry);
      }
    }
    
    // Sort alphabetically
    dirs.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));
    
    return [...entries, ...dirs, ...files];
  }, []);

  const refreshPanels = useCallback(() => {
    setLeftPanel(prev => ({
      ...prev,
      files: loadDirectory(prev.path),
    }));
    setRightPanel(prev => ({
      ...prev,
      files: loadDirectory(prev.path),
    }));
  }, [loadDirectory]);

  useEffect(() => {
    refreshPanels();
    containerRef.current?.focus();
  }, [refreshPanels]);

  const getActivePanel = () => activePanel === 'left' ? leftPanel : rightPanel;
  const setActiveData = (updater: (prev: Panel) => Panel) => {
    if (activePanel === 'left') {
      setLeftPanel(updater);
    } else {
      setRightPanel(updater);
    }
  };

  const navigateToDir = (panel: 'left' | 'right', newPath: string) => {
    const files = loadDirectory(newPath);
    const updater = (prev: Panel): Panel => ({
      ...prev,
      path: newPath,
      files,
      selectedIndex: 0,
      scrollOffset: 0,
    });
    
    if (panel === 'left') {
      setLeftPanel(updater);
    } else {
      setRightPanel(updater);
    }
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.preventDefault();
    
    // Handle input modes
    if (inputMode === 'mkdir') {
      if (e.key === 'Escape') {
        setInputMode('none');
        setInputValue('');
        return;
      }
      if (e.key === 'Enter') {
        const panel = getActivePanel();
        const newPath = panel.path === '/' ? `/${inputValue}` : `${panel.path}/${inputValue}`;
        const success = createDirectory(newPath);
        if (success) {
          setStatusMessage(`Created directory: ${inputValue}`);
          refreshPanels();
        } else {
          setStatusMessage(`Failed to create: ${inputValue}`);
        }
        setInputMode('none');
        setInputValue('');
        return;
      }
      if (e.key === 'Backspace') {
        setInputValue(prev => prev.slice(0, -1));
        return;
      }
      if (e.key.length === 1) {
        setInputValue(prev => prev + e.key);
        return;
      }
      return;
    }
    
    if (inputMode === 'view') {
      if (e.key === 'Escape' || e.key === 'q' || e.key === 'F3' || e.key === 'F10') {
        setInputMode('none');
        setViewContent('');
      }
      return;
    }
    
    if (inputMode === 'edit') {
      if (e.key === 'Escape' || e.key === 'F10') {
        setInputMode('none');
        setEditContent('');
        return;
      }
      if (e.key === 'F2') {
        // Save file
        const panel = getActivePanel();
        const selected = panel.files[panel.selectedIndex];
        if (selected && selected.type === 'file') {
          const filePath = panel.path === '/' ? `/${selected.name}` : `${panel.path}/${selected.name}`;
          writeFile(filePath, editContent);
          setStatusMessage(`Saved: ${selected.name}`);
          refreshPanels();
        }
        setInputMode('none');
        setEditContent('');
        return;
      }
      if (e.key === 'Backspace') {
        setEditContent(prev => prev.slice(0, -1));
        return;
      }
      if (e.key === 'Enter') {
        setEditContent(prev => prev + '\n');
        return;
      }
      if (e.key.length === 1) {
        setEditContent(prev => prev + e.key);
        return;
      }
      return;
    }
    
    if (inputMode === 'confirm-delete') {
      if (e.key === 'y' || e.key === 'Y') {
        const panel = getActivePanel();
        const selected = panel.files[panel.selectedIndex];
        if (selected) {
          const targetPath = panel.path === '/' ? `/${selected.name}` : `${panel.path}/${selected.name}`;
          const success = deleteNode(targetPath);
          if (success) {
            setStatusMessage(`Deleted: ${selected.name}`);
            refreshPanels();
          } else {
            setStatusMessage(`Failed to delete: ${selected.name}`);
          }
        }
        setInputMode('none');
        setDeleteTarget('');
        return;
      }
      if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
        setInputMode('none');
        setDeleteTarget('');
        setStatusMessage('Delete cancelled');
        return;
      }
      return;
    }
    
    const panel = getActivePanel();
    
    // Navigation
    if (e.key === 'ArrowUp') {
      setActiveData(prev => {
        const newIndex = Math.max(0, prev.selectedIndex - 1);
        const newOffset = newIndex < prev.scrollOffset ? newIndex : prev.scrollOffset;
        return { ...prev, selectedIndex: newIndex, scrollOffset: newOffset };
      });
      return;
    }
    
    if (e.key === 'ArrowDown') {
      setActiveData(prev => {
        const newIndex = Math.min(prev.files.length - 1, prev.selectedIndex + 1);
        const newOffset = newIndex >= prev.scrollOffset + VISIBLE_ROWS 
          ? newIndex - VISIBLE_ROWS + 1 
          : prev.scrollOffset;
        return { ...prev, selectedIndex: newIndex, scrollOffset: newOffset };
      });
      return;
    }
    
    if (e.key === 'PageUp') {
      setActiveData(prev => {
        const newIndex = Math.max(0, prev.selectedIndex - VISIBLE_ROWS);
        return { ...prev, selectedIndex: newIndex, scrollOffset: Math.max(0, newIndex) };
      });
      return;
    }
    
    if (e.key === 'PageDown') {
      setActiveData(prev => {
        const newIndex = Math.min(prev.files.length - 1, prev.selectedIndex + VISIBLE_ROWS);
        const newOffset = Math.max(0, newIndex - VISIBLE_ROWS + 1);
        return { ...prev, selectedIndex: newIndex, scrollOffset: Math.min(newOffset, prev.files.length - VISIBLE_ROWS) };
      });
      return;
    }
    
    if (e.key === 'Home') {
      setActiveData(prev => ({ ...prev, selectedIndex: 0, scrollOffset: 0 }));
      return;
    }
    
    if (e.key === 'End') {
      setActiveData(prev => ({
        ...prev,
        selectedIndex: prev.files.length - 1,
        scrollOffset: Math.max(0, prev.files.length - VISIBLE_ROWS),
      }));
      return;
    }
    
    // Switch panels
    if (e.key === 'Tab') {
      setActivePanel(prev => prev === 'left' ? 'right' : 'left');
      return;
    }
    
    // Enter directory or view file
    if (e.key === 'Enter') {
      const selected = panel.files[panel.selectedIndex];
      if (!selected) return;
      
      if (selected.type === 'directory') {
        let newPath: string;
        if (selected.name === '..') {
          const parts = panel.path.split('/').filter(Boolean);
          parts.pop();
          newPath = '/' + parts.join('/');
        } else {
          newPath = panel.path === '/' ? `/${selected.name}` : `${panel.path}/${selected.name}`;
        }
        navigateToDir(activePanel, newPath);
      } else {
        // View file
        const filePath = panel.path === '/' ? `/${selected.name}` : `${panel.path}/${selected.name}`;
        const content = readFile(filePath);
        setViewContent(content || '(empty file)');
        setInputMode('view');
      }
      return;
    }
    
    // Function keys
    if (e.key === 'F1') {
      setStatusMessage('F1=Help F2=Menu F3=View F4=Edit F5=Copy F6=Move F7=Mkdir F8=Delete F9=Menu F10=Quit');
      return;
    }
    
    if (e.key === 'F3') {
      const selected = panel.files[panel.selectedIndex];
      if (selected && selected.type === 'file') {
        const filePath = panel.path === '/' ? `/${selected.name}` : `${panel.path}/${selected.name}`;
        const content = readFile(filePath);
        setViewContent(content || '(empty file)');
        setInputMode('view');
      }
      return;
    }
    
    if (e.key === 'F4') {
      const selected = panel.files[panel.selectedIndex];
      if (selected && selected.type === 'file') {
        const filePath = panel.path === '/' ? `/${selected.name}` : `${panel.path}/${selected.name}`;
        const content = readFile(filePath) || '';
        setEditContent(content);
        setInputMode('edit');
      }
      return;
    }
    
    if (e.key === 'F5') {
      // Copy
      const selected = panel.files[panel.selectedIndex];
      if (selected && selected.name !== '..') {
        const sourcePath = panel.path === '/' ? `/${selected.name}` : `${panel.path}/${selected.name}`;
        const targetPanel = activePanel === 'left' ? rightPanel : leftPanel;
        const targetPath = targetPanel.path === '/' ? `/${selected.name}` : `${targetPanel.path}/${selected.name}`;
        
        if (selected.type === 'file') {
          const content = readFile(sourcePath);
          writeFile(targetPath, content || '');
          setStatusMessage(`Copied: ${selected.name} -> ${targetPanel.path}`);
        } else {
          createDirectory(targetPath);
          setStatusMessage(`Copied directory: ${selected.name} -> ${targetPanel.path}`);
        }
        refreshPanels();
      }
      return;
    }
    
    if (e.key === 'F6') {
      // Move
      const selected = panel.files[panel.selectedIndex];
      if (selected && selected.name !== '..') {
        const sourcePath = panel.path === '/' ? `/${selected.name}` : `${panel.path}/${selected.name}`;
        const targetPanel = activePanel === 'left' ? rightPanel : leftPanel;
        const targetPath = targetPanel.path === '/' ? `/${selected.name}` : `${targetPanel.path}/${selected.name}`;
        
        if (selected.type === 'file') {
          const content = readFile(sourcePath);
          writeFile(targetPath, content || '');
          deleteNode(sourcePath);
          setStatusMessage(`Moved: ${selected.name} -> ${targetPanel.path}`);
        } else {
          createDirectory(targetPath);
          deleteNode(sourcePath);
          setStatusMessage(`Moved directory: ${selected.name} -> ${targetPanel.path}`);
        }
        refreshPanels();
      }
      return;
    }
    
    if (e.key === 'F7') {
      setInputMode('mkdir');
      setInputValue('');
      return;
    }
    
    if (e.key === 'F8') {
      const selected = panel.files[panel.selectedIndex];
      if (selected && selected.name !== '..') {
        setDeleteTarget(selected.name);
        setInputMode('confirm-delete');
      }
      return;
    }
    
    if (e.key === 'F10' || e.key === 'Escape') {
      onExit();
      return;
    }
  }, [activePanel, leftPanel, rightPanel, inputMode, inputValue, getActivePanel, setActiveData, 
      navigateToDir, refreshPanels, onExit, loadDirectory, editContent]);

  const renderPanel = (panel: Panel, isActive: boolean, side: 'left' | 'right') => {
    const visibleFiles = panel.files.slice(panel.scrollOffset, panel.scrollOffset + VISIBLE_ROWS);
    const width = 45;
    
    return (
      <div className={`mc-panel ${isActive ? 'active' : ''}`}>
        <div className="mc-panel-header">
          {panel.path.length > width - 4 ? '...' + panel.path.slice(-(width - 7)) : panel.path}
        </div>
        <div className="mc-panel-columns">
          <span className="col-name">Name</span>
          <span className="col-size">Size</span>
          <span className="col-date">Modify</span>
        </div>
        <div className="mc-panel-content">
          {visibleFiles.map((file, idx) => {
            const actualIdx = panel.scrollOffset + idx;
            const isSelected = actualIdx === panel.selectedIndex;
            const isDir = file.type === 'directory';
            
            return (
              <div 
                key={`${file.name}-${idx}`} 
                className={`mc-file-row ${isSelected && isActive ? 'selected' : ''} ${isDir ? 'directory' : ''}`}
              >
                <span className="col-name">
                  {isDir && file.name !== '..' ? '/' : ''}{file.name.substring(0, 25)}
                </span>
                <span className="col-size">
                  {isDir ? '<DIR>' : file.size > 1024 ? `${(file.size/1024).toFixed(1)}K` : file.size}
                </span>
                <span className="col-date">{file.modified}</span>
              </div>
            );
          })}
          {/* Fill empty rows */}
          {Array(Math.max(0, VISIBLE_ROWS - visibleFiles.length)).fill(null).map((_, idx) => (
            <div key={`empty-${idx}`} className="mc-file-row empty"> </div>
          ))}
        </div>
        <div className="mc-panel-footer">
          {panel.files.length} files
        </div>
      </div>
    );
  };

  return (
    <div 
      className="mc-container" 
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* View mode overlay */}
      {inputMode === 'view' && (
        <div className="mc-overlay">
          <div className="mc-viewer">
            <div className="mc-viewer-header">View File - Press ESC or F10 to close</div>
            <pre className="mc-viewer-content">{viewContent}</pre>
          </div>
        </div>
      )}
      
      {/* Edit mode overlay */}
      {inputMode === 'edit' && (
        <div className="mc-overlay">
          <div className="mc-editor">
            <div className="mc-editor-header">Edit File - F2=Save F10=Cancel</div>
            <textarea 
              className="mc-editor-content" 
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      )}
      
      {/* Delete confirmation */}
      {inputMode === 'confirm-delete' && (
        <div className="mc-dialog">
          <div className="mc-dialog-box">
            <div className="mc-dialog-title">Delete</div>
            <div className="mc-dialog-content">
              Delete "{deleteTarget}"?
              <br />
              <span className="mc-dialog-hint">(Y)es / (N)o</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Mkdir dialog */}
      {inputMode === 'mkdir' && (
        <div className="mc-dialog">
          <div className="mc-dialog-box">
            <div className="mc-dialog-title">Create directory</div>
            <div className="mc-dialog-content">
              <input 
                type="text" 
                value={inputValue} 
                className="mc-dialog-input"
                autoFocus
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="mc-header">
        <span className="mc-title">GNU Midnight Commander 4.8.31</span>
      </div>
      
      <div className="mc-panels">
        {renderPanel(leftPanel, activePanel === 'left', 'left')}
        {renderPanel(rightPanel, activePanel === 'right', 'right')}
      </div>
      
      <div className="mc-command-line">
        <span className="mc-prompt">root@prod-srv-42:{getActivePanel().path}#</span>
      </div>
      
      <div className="mc-status">
        {statusMessage || 'Hint: Use Tab to switch panels, F-keys for operations'}
      </div>
      
      <div className="mc-function-bar">
        <span className="mc-fkey"><b>1</b>Help</span>
        <span className="mc-fkey"><b>2</b>Menu</span>
        <span className="mc-fkey"><b>3</b>View</span>
        <span className="mc-fkey"><b>4</b>Edit</span>
        <span className="mc-fkey"><b>5</b>Copy</span>
        <span className="mc-fkey"><b>6</b>RenMov</span>
        <span className="mc-fkey"><b>7</b>Mkdir</span>
        <span className="mc-fkey"><b>8</b>Delete</span>
        <span className="mc-fkey"><b>9</b>PullDn</span>
        <span className="mc-fkey"><b>10</b>Quit</span>
      </div>
      
      <style jsx>{`
        .mc-container {
          width: 100%;
          height: 100vh;
          background: #000080;
          color: #00ffff;
          font-family: 'Fira Code', 'Source Code Pro', 'Consolas', monospace;
          font-size: 13px;
          display: flex;
          flex-direction: column;
          outline: none;
          overflow: hidden;
        }
        
        .mc-header {
          background: #000080;
          color: #ffffff;
          text-align: center;
          padding: 2px 0;
          border-bottom: 1px solid #00ffff;
        }
        
        .mc-title {
          font-weight: bold;
        }
        
        .mc-panels {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        
        .mc-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          border: 1px solid #00ffff;
          margin: 1px;
          background: #000080;
        }
        
        .mc-panel.active {
          border-color: #ffff00;
        }
        
        .mc-panel-header {
          background: #008080;
          color: #ffffff;
          padding: 2px 5px;
          text-align: center;
          font-weight: bold;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .mc-panel.active .mc-panel-header {
          background: #00aaaa;
        }
        
        .mc-panel-columns {
          display: flex;
          background: #000080;
          color: #ffff00;
          padding: 1px 2px;
          border-bottom: 1px solid #00ffff;
          font-size: 12px;
        }
        
        .mc-panel-content {
          flex: 1;
          overflow: hidden;
        }
        
        .mc-file-row {
          display: flex;
          padding: 0 2px;
          height: 18px;
          line-height: 18px;
        }
        
        .mc-file-row.selected {
          background: #008080;
          color: #ffffff;
        }
        
        .mc-file-row.directory {
          color: #ffffff;
          font-weight: bold;
        }
        
        .mc-file-row.directory.selected {
          background: #008080;
        }
        
        .mc-file-row.empty {
          height: 18px;
        }
        
        .col-name {
          flex: 2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .col-size {
          width: 60px;
          text-align: right;
          padding-right: 5px;
        }
        
        .col-date {
          width: 80px;
          text-align: right;
        }
        
        .mc-panel-footer {
          background: #000080;
          color: #00ffff;
          padding: 2px 5px;
          border-top: 1px solid #00ffff;
          text-align: center;
          font-size: 12px;
        }
        
        .mc-command-line {
          background: #000000;
          color: #ffffff;
          padding: 2px 5px;
        }
        
        .mc-prompt {
          color: #00ff00;
        }
        
        .mc-status {
          background: #000080;
          color: #ffff00;
          padding: 2px 5px;
          text-align: center;
          font-size: 12px;
        }
        
        .mc-function-bar {
          display: flex;
          background: #008080;
          color: #000000;
        }
        
        .mc-fkey {
          flex: 1;
          text-align: center;
          padding: 2px;
          background: #00aaaa;
          border-right: 1px solid #000080;
          font-size: 12px;
        }
        
        .mc-fkey b {
          color: #ffffff;
        }
        
        .mc-fkey:last-child {
          border-right: none;
        }
        
        .mc-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        
        .mc-viewer, .mc-editor {
          width: 80%;
          height: 80%;
          background: #000080;
          border: 2px solid #00ffff;
          display: flex;
          flex-direction: column;
        }
        
        .mc-viewer-header, .mc-editor-header {
          background: #008080;
          color: #ffffff;
          padding: 5px;
          text-align: center;
          font-weight: bold;
        }
        
        .mc-viewer-content {
          flex: 1;
          overflow: auto;
          padding: 10px;
          margin: 0;
          color: #00ffff;
          font-family: monospace;
          white-space: pre-wrap;
        }
        
        .mc-editor-content {
          flex: 1;
          background: #000000;
          color: #00ff00;
          border: none;
          padding: 10px;
          font-family: monospace;
          resize: none;
          outline: none;
        }
        
        .mc-dialog {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        
        .mc-dialog-box {
          background: #000080;
          border: 2px solid #ffffff;
          padding: 0;
          min-width: 300px;
        }
        
        .mc-dialog-title {
          background: #aa0000;
          color: #ffffff;
          padding: 5px 10px;
          font-weight: bold;
          text-align: center;
        }
        
        .mc-dialog-content {
          padding: 15px;
          text-align: center;
          color: #ffffff;
        }
        
        .mc-dialog-hint {
          color: #ffff00;
          font-size: 12px;
        }
        
        .mc-dialog-input {
          background: #000000;
          color: #00ffff;
          border: 1px solid #00ffff;
          padding: 5px;
          width: 80%;
          font-family: monospace;
          outline: none;
        }
      `}</style>
    </div>
  );
}

