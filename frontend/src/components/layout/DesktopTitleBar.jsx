import React from 'react';
import { Minus, Square, X } from 'lucide-react';

const DesktopTitleBar = () => {
  const isElectron = window.electronAPI !== undefined;

  if (!isElectron) return null;

  return (
    <div className="h-8 bg-black/50 backdrop-blur-md flex items-center justify-between select-none fixed top-0 left-0 right-0 z-[9999] border-b border-white/5">
      {/* Draggable region */}
      <div className="flex-1 h-full drag-region flex items-center px-4">
        <span className="text-xs font-medium text-white/50 tracking-wider">AURA</span>
      </div>

      {/* Window controls */}
      <div className="flex items-center h-full no-drag">
        <button
          onClick={() => window.electronAPI.minimize()}
          className="h-full px-4 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => window.electronAPI.maximize()}
          className="h-full px-4 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
        >
          <Square size={12} />
        </button>
        <button
          onClick={() => window.electronAPI.close()}
          className="h-full px-4 hover:bg-red-500/80 transition-colors text-white/60 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default DesktopTitleBar;
