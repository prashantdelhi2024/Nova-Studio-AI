import React, { useState } from 'react';
import {
  Film,
  Undo2,
  Redo2,
  Download,
  HelpCircle,
  Settings,
  Sparkles,
  RefreshCw,
  Check,
  CheckCircle2,
  FolderOpen,
  LayoutTemplate
} from 'lucide-react';
import { useEditor } from '../context/EditorContext';
import { AspectRatio } from '../types/editor';

export const Header: React.FC = () => {
  const {
    project,
    setProject,
    canUndo,
    canRedo,
    undo,
    redo,
    autosaveStatus,
    changeAspectRatio,
    loadStarterProject,
    setIsExportModalOpen,
    setIsShortcutsModalOpen,
    setIsSettingsModalOpen,
    exportProjectJSON,
    importProjectJSON
  } = useEditor();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(project.name);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleValue.trim()) {
      setProject((prev) => ({ ...prev, name: titleValue.trim() }));
    }
  };

  const handleBackupUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        if (text) importProjectJSON(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <header className="h-14 bg-zinc-950 border-b border-zinc-800/80 px-4 flex items-center justify-between select-none z-30">
      {/* Brand & Project Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 via-indigo-600 to-violet-500 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-zinc-950 rounded-[6px] flex items-center justify-center">
              <Film className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-bold text-sm tracking-wider text-zinc-100 flex items-center gap-1">
              NOVA <span className="text-cyan-400 font-extrabold">STUDIO</span>
              <span className="text-[10px] text-zinc-400 font-mono tracking-widest bg-zinc-900 border border-zinc-700/60 px-1 py-0.2 rounded ml-1">AI</span>
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-zinc-800 mx-1 hidden sm:block" />

        {/* Editable Project Name */}
        {isEditingTitle ? (
          <input
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
            autoFocus
            className="bg-zinc-900 border border-cyan-500/50 rounded px-2 py-0.5 text-xs text-zinc-200 outline-none w-44"
          />
        ) : (
          <button
            onClick={() => {
              setTitleValue(project.name);
              setIsEditingTitle(true);
            }}
            className="text-xs font-medium text-zinc-300 hover:text-white px-2 py-1 rounded hover:bg-zinc-900 transition-colors flex items-center gap-1.5 max-w-[160px] sm:max-w-[220px] truncate"
            title="Click to rename project"
          >
            <span className="truncate">{project.name}</span>
          </button>
        )}

        {/* Autosave Status */}
        <div className="hidden md:flex items-center gap-1.5 text-[11px] text-zinc-400 pl-1">
          {autosaveStatus === 'saving' ? (
            <>
              <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
              <span className="text-zinc-400">Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-zinc-400">Browser saved</span>
            </>
          )}
        </div>
      </div>

      {/* Center Controls: Aspect Ratio & History */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center bg-zinc-900/80 border border-zinc-800 rounded-md p-0.5">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:hover:text-zinc-400 rounded transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            className="p-1.5 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:hover:text-zinc-400 rounded transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="hidden sm:flex items-center bg-zinc-900/80 border border-zinc-800 rounded-md px-2 py-1 text-xs">
          <span className="text-zinc-400 mr-2 text-[11px]">Ratio:</span>
          <select
            value={project.settings.aspectRatio}
            onChange={(e) => changeAspectRatio(e.target.value as AspectRatio)}
            aria-label="Select aspect ratio"
            className="bg-transparent text-zinc-200 text-xs outline-none cursor-pointer font-medium"
          >
            <option value="16:9" className="bg-zinc-900">16:9 Landscape (YouTube)</option>
            <option value="9:16" className="bg-zinc-900">9:16 Vertical (Shorts/Reels)</option>
            <option value="1:1" className="bg-zinc-900">1:1 Square (Instagram)</option>
            <option value="4:5" className="bg-zinc-900">4:5 Social Portrait</option>
            <option value="21:9" className="bg-zinc-900">21:9 Cinematic Anamorphic</option>
          </select>
        </div>

        {/* Sample Project Reload */}
        <button
          onClick={loadStarterProject}
          title="Reload showcase starter project"
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-300 hover:text-white bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 rounded-md transition-colors"
        >
          <LayoutTemplate className="w-3.5 h-3.5 text-indigo-400" />
          <span>Sample Project</span>
        </button>
      </div>

      {/* Right Controls: Project Tools & Export */}
      <div className="flex items-center gap-2">
        {/* Project backup download/upload */}
        <button
          onClick={exportProjectJSON}
          title="Export project backup (.nova.json)"
          className="hidden md:flex p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-md transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>

        <label
          title="Import project backup (.nova.json)"
          className="hidden md:flex p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-md transition-colors cursor-pointer"
        >
          <FolderOpen className="w-4 h-4" />
          <input
            type="file"
            accept=".json,.nova"
            onChange={handleBackupUpload}
            className="hidden"
          />
        </label>

        {/* Shortcuts */}
        <button
          onClick={() => setIsShortcutsModalOpen(true)}
          title="Keyboard shortcuts & Help"
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-md transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Settings */}
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          title="Project settings & Storage"
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-md transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Primary Export Button */}
        <button
          onClick={() => setIsExportModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-medium text-xs rounded-md shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
