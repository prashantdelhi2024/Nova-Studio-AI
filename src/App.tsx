import React, { useState, useEffect } from 'react';
import { EditorProvider, useEditor } from './context/EditorContext';
import { Header } from './components/Header';
import { PreviewMonitor } from './components/PreviewMonitor';
import { Timeline } from './components/Timeline/Timeline';
import { InspectorPanel } from './components/Inspector/InspectorPanel';
import { AssetLibrary } from './components/AssetLibrary/AssetLibrary';
import { ExportModal } from './components/Modals/ExportModal';
import { ShortcutsModal } from './components/Modals/ShortcutsModal';
import { ProjectSettingsModal } from './components/Modals/ProjectSettingsModal';
import { MobileWorkspace } from './components/Mobile/MobileWorkspace';

const EditorLayout: React.FC = () => {
  const {
    togglePlayPause,
    splitClipAtPlayhead,
    deleteClip,
    duplicateClip,
    undo,
    redo,
    setCurrentTime,
    currentTime,
    project,
    setSnapEnabled,
    snapEnabled,
    setTimelineZoom,
    timelineZoom
  } = useEditor();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing inside input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'KeyS' || e.code === 'KeyC') {
        e.preventDefault();
        splitClipAtPlayhead();
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        deleteClip(undefined, true);
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD') {
        e.preventDefault();
        duplicateClip();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyZ') {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        undo();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentTime(Math.max(0, currentTime - 1 / 30));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentTime(Math.min(project.duration, currentTime + 1 / 30));
      } else if (e.code === 'Home' || e.code === 'Digit0') {
        e.preventDefault();
        setCurrentTime(0);
      } else if (e.code === 'KeyN') {
        setSnapEnabled(!snapEnabled);
      } else if (e.key === '=' || e.key === '+') {
        setTimelineZoom(Math.min(240, timelineZoom * 1.25));
      } else if (e.key === '-') {
        setTimelineZoom(Math.max(20, timelineZoom * 0.8));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlayPause,
    splitClipAtPlayhead,
    deleteClip,
    duplicateClip,
    undo,
    redo,
    setCurrentTime,
    currentTime,
    project.duration,
    setSnapEnabled,
    snapEnabled,
    setTimelineZoom,
    timelineZoom
  ]);

  if (isMobile) {
    return (
      <div className="h-screen w-screen overflow-hidden flex flex-col bg-zinc-950">
        <MobileWorkspace />
        <ExportModal />
        <ShortcutsModal />
        <ProjectSettingsModal />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-zinc-950 text-zinc-100 select-none">
      {/* Top Application Header */}
      <Header />

      {/* Main Workspace Workspace (Asset Browser - Monitor - Inspector) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Side: Asset Library & Tools */}
        <AssetLibrary />

        {/* Center: Live Preview Monitor Canvas */}
        <PreviewMonitor />

        {/* Right Side: Contextual Inspector Panel */}
        <InspectorPanel />
      </div>

      {/* Bottom Multi-Track Timeline */}
      <Timeline />

      {/* Modals */}
      <ExportModal />
      <ShortcutsModal />
      <ProjectSettingsModal />
    </div>
  );
};

export default function App() {
  return (
    <EditorProvider>
      <EditorLayout />
    </EditorProvider>
  );
}
