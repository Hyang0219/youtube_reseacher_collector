// src/pages/content/ui/App.tsx
import React from 'react';

type Props = {
  onCapture: () => void;
  status: 'idle' | 'captured';
};

const App: React.FC<Props> = ({ onCapture, status }) => {
  return (
    <div className="gap-2 flex items-center rounded-full bg-black/70 px-3 py-2 text-xs text-white shadow-lg transition-all duration-200 hover:bg-black/80">
      <button
        className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white"
        onClick={onCapture}
      >
        {status === 'captured' ? 'Captured!' : 'Capture Idea'}
      </button>
      <span className="text-[10px] text-slate-300">⌥ + C</span>
    </div>
  );
};

export default App;
