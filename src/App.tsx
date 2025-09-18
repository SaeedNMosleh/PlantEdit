/**
 * Simplified PlantEdit App - Direct SVG manipulation approach
 */

import React, { useState } from 'react';
import { plantUMLClient } from '@/services/SimplePlantUMLClient';
import { CorrectPlantUMLEditor } from '@/components/CorrectPlantUMLEditor';
import './App.css';

const App: React.FC = () => {
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

  const [svgContent, setSvgContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);

  const handleGenerate = async () => {
    if (!plantumlSource.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const svg = await plantUMLClient.getSVG(plantumlSource);
      setSvgContent(svg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate diagram');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSVGUpdate = (updatedSVG: string) => {
    setSvgContent(updatedSVG);
  };

  const handleExportSVG = () => {
    if (!svgContent) return;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-light text-gray-900">PlantEdit</h1>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Input Panel */}
        <div
          className={`bg-white border-r border-gray-200 transition-all duration-300 ${
            isInputCollapsed ? 'w-12' : 'w-80'
          }`}
        >
          {isInputCollapsed ? (
            <div className="h-full flex flex-col items-center py-4">
              <button
                onClick={() => setIsInputCollapsed(false)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Expand PlantUML Input"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">PlantUML Input</h3>
                <button
                  onClick={() => setIsInputCollapsed(true)}
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
                    className="w-full h-full resize-none p-3 text-sm font-mono border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                    placeholder="Enter your PlantUML syntax here..."
                    spellCheck={false}
                  />
                </div>

                {/* Generate Button */}
                <div>
                  <button
                    onClick={handleGenerate}
                    disabled={isLoading || !plantumlSource.trim()}
                    className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      isLoading || !plantumlSource.trim()
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
                    }`}
                  >
                    {isLoading ? 'Generating...' : 'Generate Diagram'}
                  </button>
                </div>

                {error && (
                  <div className="text-red-600 text-sm p-2 bg-red-50 border border-red-200 rounded">
                    {error}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center space-x-2">
            <button
              onClick={handleExportSVG}
              disabled={!svgContent}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                svgContent
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              Export SVG
            </button>
          </div>

          {/* Canvas */}
          <div className="flex-1 bg-white relative">
            {svgContent ? (
              <CorrectPlantUMLEditor svgContent={svgContent} onSVGUpdate={handleSVGUpdate} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                {isLoading ? 'Generating diagram...' : 'Click "Generate Diagram" to start'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-2">
        <div className="text-sm text-gray-600">
          {svgContent ? 'PlantUML editor active - drag entities to rearrange, connections auto-update' : 'Ready'}
        </div>
      </div>
    </div>
  );
};

export default App;