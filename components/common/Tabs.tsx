
import React from 'react';

interface TabsProps<T extends string> {
  tabs: { id: T; label: string }[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
  children: (activeTab: T) => React.ReactNode;
}

export const Tabs = <T extends string>({ tabs, activeTab, onTabChange, children }: TabsProps<T>) => {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`${
                tab.id === activeTab
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="pt-4 flex-grow overflow-y-auto custom-scrollbar pr-1">
        {children(activeTab)}
      </div>
    </div>
  );
};
