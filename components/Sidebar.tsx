
import React from 'react';
import { Tool } from '../types';
import { ICONS, TOOL_NAMES, BANANA_LOGO } from '../constants';

interface SidebarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTool, onToolChange }) => {
  return (
    <aside className="w-20 bg-slate-900 border-r border-slate-700 flex flex-col items-center py-4 space-y-4 z-50">
      <div className="w-10 h-10">{BANANA_LOGO}</div>
      <nav className="flex flex-col items-center space-y-2 mt-8">
        {(Object.keys(Tool) as Array<keyof typeof Tool>).map((toolKey) => {
          const tool = Tool[toolKey];
          return (
            <button
              key={tool}
              onClick={() => onToolChange(tool)}
              className={`p-3 rounded-lg transition-colors duration-200 group relative ${
                activeTool === tool ? 'bg-banana-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
              aria-label={TOOL_NAMES[tool]}
            >
              {ICONS[tool]}
              <span className="absolute left-full ml-4 w-auto p-2 min-w-max rounded-md shadow-md text-white bg-slate-800 text-xs font-bold transition-all duration-200 scale-0 origin-left group-hover:scale-100">
                {TOOL_NAMES[tool]}
              </span>
            </button>
          )
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;