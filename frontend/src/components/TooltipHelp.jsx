import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export default function TooltipHelp({ texto, titulo }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center ml-1.5 align-middle">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible(!visible)}
        className="text-gray-500 hover:text-[#CF9D7B] focus:outline-none transition-colors p-0.5 rounded-full"
        aria-label="Ayuda"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 sm:w-64 p-3 bg-[#081015] border border-[#1E2E3D] rounded-xl shadow-2xl z-50 text-left pointer-events-none animate-fadeIn">
          {titulo && (
            <p className="text-[11px] font-mono font-bold text-[#CF9D7B] uppercase tracking-wider mb-1">
              {titulo}
            </p>
          )}
          <p className="text-[11px] text-gray-300 leading-relaxed font-normal">
            {texto}
          </p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#1E2E3D]" />
        </div>
      )}
    </div>
  );
}