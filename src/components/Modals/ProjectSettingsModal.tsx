import React, { useState, useEffect } from 'react';
import { X, Settings, Database, Trash2, Download, HardDrive } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { dbService } from '../../services/db';

export const ProjectSettingsModal: React.FC = () => {
  const {
    project,
    setProject,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    exportProjectJSON
  } = useEditor();

  const [storageInfo, setStorageInfo] = useState<{ usedMb: number; quotaMb: number; percent: number }>({
    usedMb: 0,
    quotaMb: 2048,
    percent: 0
  });

  useEffect(() => {
    if (isSettingsModalOpen) {
      dbService.getStorageEstimate().then((info) => setStorageInfo(info));
    }
  }, [isSettingsModalOpen]);

  if (!isSettingsModalOpen) return null;

  const handleClearCache = async () => {
    if (confirm('Clear local browser cache? This will reset stored temporary media.')) {
      await dbService.clearAllData();
      alert('Local storage cleared.');
      setIsSettingsModalOpen(false);
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-xs text-zinc-300">
        <div className="h-14 border-b border-zinc-800 px-6 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            <h2 className="font-semibold text-zinc-100 text-sm">Project Settings & Storage</h2>
          </div>
          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="text-zinc-500 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Project Details */}
          <div className="space-y-3">
            <div>
              <label className="block text-zinc-400 font-medium mb-1">Project Name</label>
              <input
                type="text"
                value={project.name}
                onChange={(e) => setProject((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-200 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-zinc-400 font-medium mb-1">Canvas Width</label>
                <input
                  type="number"
                  value={project.settings.width}
                  readOnly
                  className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded px-3 py-1.5 text-xs text-zinc-400 outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-400 font-medium mb-1">Canvas Height</label>
                <input
                  type="number"
                  value={project.settings.height}
                  readOnly
                  className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded px-3 py-1.5 text-xs text-zinc-400 outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-800" />

          {/* Storage Quota */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="font-semibold flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-indigo-400" />
                Browser Storage (IndexedDB)
              </span>
              <span className="font-mono text-zinc-400">
                {storageInfo.usedMb} MB / {storageInfo.quotaMb} MB
              </span>
            </div>

            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-cyan-500 rounded-full"
                style={{ width: `${Math.min(100, storageInfo.percent)}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-500">
              Projects and clips are stored securely inside your browser with no remote upload required.
            </p>
          </div>

          {/* Backup & Clear actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={exportProjectJSON}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 rounded flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Download Project Backup (.nova.json)</span>
            </button>

            <button
              onClick={handleClearCache}
              className="w-full py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 rounded flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Local Storage Cache</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
