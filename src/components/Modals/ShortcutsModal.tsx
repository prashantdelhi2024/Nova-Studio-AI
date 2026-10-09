import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';

export const ShortcutsModal: React.FC = () => {
  const { isShortcutsModalOpen, setIsShortcutsModalOpen } = useEditor();

  if (!isShortcutsModalOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause timeline playback' },
    { key: 'S or C', desc: 'Split selected clip at playhead' },
    { key: 'Delete / Backspace', desc: 'Ripple delete selected clip' },
    { key: 'Ctrl + D / Cmd + D', desc: 'Duplicate selected clip' },
    { key: 'Ctrl + Z / Cmd + Z', desc: 'Undo last action' },
    { key: 'Ctrl + Shift + Z', desc: 'Redo previously undone action' },
    { key: 'Left / Right Arrow', desc: 'Step backward or forward by 1 frame' },
    { key: 'Home / 0', desc: 'Jump playhead to beginning (00:00:00)' },
    { key: 'N', desc: 'Toggle magnetic snap on timeline' },
    { key: '+ / -', desc: 'Zoom timeline in or out' },
    { key: 'F', desc: 'Fit entire timeline to window view' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-xs text-zinc-300">
        <div className="h-14 border-b border-zinc-800 px-6 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-cyan-400" />
            <h2 className="font-semibold text-zinc-100 text-sm">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={() => setIsShortcutsModalOpen(false)}
            className="text-zinc-500 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-2.5 max-h-[440px] overflow-y-auto">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 border-b border-zinc-900"
            >
              <span className="text-zinc-400">{s.desc}</span>
              <kbd className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded font-mono text-[11px] text-cyan-300 shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
