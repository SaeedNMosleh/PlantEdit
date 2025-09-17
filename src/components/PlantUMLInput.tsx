/**
 * PlantUML Input component with collapsible panel
 */

import React, { useState, useCallback } from 'react';
import { clsx } from 'clsx';

export interface PlantUMLInputProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onGenerate: (source: string) => void;
}

export const PlantUMLInput: React.FC<PlantUMLInputProps> = ({
  isCollapsed,
  onToggleCollapse,
  onGenerate,
}) => {
  const [plantumlSource, setPlantumlSource] = useState(`@startuml
left to right direction
skinparam linetype ortho
rectangle "Login\\nScenario" as login
rectangle "Dashboard\\nScenario" as dash
rectangle "Create Item\\nScenario" as create
rectangle "Validation\\nTest" as valid
rectangle "Database\\nTest" as db
login --> dash
dash --> create
create --> valid
create --> db
@enduml`);

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!plantumlSource.trim()) return;

    setIsGenerating(true);
    try {
      await onGenerate(plantumlSource);
    } finally {
      setIsGenerating(false);
    }
  }, [plantumlSource, onGenerate]);


  if (isCollapsed) {
    return (
      <div className="h-full flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          title="Expand PlantUML Input"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">PlantUML Input</h3>
        <button
          onClick={onToggleCollapse}
          className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
          title="Collapse Panel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4 space-y-4">
        {/* Textarea */}
        <div className="flex-1">
          <textarea
            value={plantumlSource}
            onChange={(e) => setPlantumlSource(e.target.value)}
            className={clsx(
              'w-full h-full resize-none p-3 text-sm font-mono',
              'border border-gray-300 rounded-md',
              'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'placeholder-gray-400'
            )}
            placeholder="Enter your PlantUML syntax here..."
            spellCheck={false}
          />
        </div>

        {/* Generate Button */}
        <div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !plantumlSource.trim()}
            className={clsx(
              'w-full py-2 px-4 rounded-md text-sm font-medium transition-colors',
              isGenerating || !plantumlSource.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
            )}
          >
            {isGenerating ? 'Generating...' : 'Generate Diagram'}
          </button>
        </div>
      </div>
    </div>
  );
};