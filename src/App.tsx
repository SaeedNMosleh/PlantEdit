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
  const [zoomLevel, setZoomLevel] = useState(1);

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

  const handleZoomChange = (zoom: number) => {
    setZoomLevel(zoom);
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

  const handleExportPNG = () => {
    if (!svgContent) return;

    // Create a temporary container
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.innerHTML = svgContent;
    document.body.appendChild(tempDiv);

    const svgElement = tempDiv.querySelector('svg') as SVGSVGElement;
    if (!svgElement) {
      document.body.removeChild(tempDiv);
      return;
    }

    // Get SVG dimensions
    const svgRect = svgElement.getBoundingClientRect();
    const svgWidth = svgRect.width || 800;
    const svgHeight = svgRect.height || 600;

    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      document.body.removeChild(tempDiv);
      return;
    }

    // Set canvas size with higher resolution for better quality
    const scale = 2;
    canvas.width = svgWidth * scale;
    canvas.height = svgHeight * scale;
    ctx.scale(scale, scale);

    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();

    img.onload = () => {
      // Fill white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, svgWidth, svgHeight);

      // Draw SVG
      ctx.drawImage(img, 0, 0, svgWidth, svgHeight);

      // Export as PNG
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'diagram.png';
          a.click();
          URL.revokeObjectURL(url);
        }
        document.body.removeChild(tempDiv);
      }, 'image/png');
    };

    img.onerror = () => {
      console.error('Failed to load SVG for PNG conversion');
      document.body.removeChild(tempDiv);
    };

    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.src = url;
  };

  return (
    <div className="app-container flex flex-col h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800 tracking-tight">PlantEdit</h1>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Input Panel */}
        <div
          className={`bg-white/90 backdrop-blur-lg border-r border-slate-200 shadow-lg transition-all duration-500 ease-out ${
            isInputCollapsed ? 'w-12' : 'w-120'
          }`}
        >
          {isInputCollapsed ? (
            <div className="h-full flex flex-col items-center py-6">
              <button
                onClick={() => setIsInputCollapsed(false)}
                className="p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-105 shadow-sm"
                title="Expand PlantUML Input"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col animate-fade-in">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50">
                <h3 className="text-base font-medium text-slate-800 tracking-tight">PlantUML Input</h3>
                <button
                  onClick={() => setIsInputCollapsed(true)}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-105"
                  title="Collapse Panel"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col p-6 space-y-6">
                {/* Textarea */}
                <div className="flex-1 relative">
                  <textarea
                    value={plantumlSource}
                    onChange={(e) => setPlantumlSource(e.target.value)}
                    className="w-full h-full resize-none p-4 text-sm font-mono leading-relaxed border border-slate-300 rounded-2xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400 transition-all duration-200 shadow-sm hover:shadow-md"
                    placeholder="Enter your PlantUML syntax here...

@startuml
left to right direction
skinparam linetype ortho
rectangle &quot;Login\\nScenario&quot; as login
rectangle &quot;Dashboard\\nScenario&quot; as dash
login --> dash
@enduml"
                    spellCheck={false}
                  />
                  {/* Modern line indicator */}
                  <div className="absolute top-4 left-1 w-0.5 h-8 bg-gradient-to-b from-blue-500 to-blue-300 rounded-full"></div>
                </div>

                {/* Generate Button */}
                <div>
                  <button
                    onClick={handleGenerate}
                    disabled={isLoading || !plantumlSource.trim()}
                    className={`w-full py-4 px-6 rounded-2xl text-base font-semibold transition-all duration-200 ${
                      isLoading || !plantumlSource.trim()
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:scale-[1.02] shadow-lg hover:shadow-xl'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-3">
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
                          </svg>
                          <span>Generate Diagram</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>

                {error && (
                  <div className="text-red-600 text-sm p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                      <span>{error}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-2 flex items-center space-x-2 shadow-sm">
            <button
              onClick={handleExportSVG}
              disabled={!svgContent}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                svgContent
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:scale-105 shadow-md hover:shadow-lg'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Export SVG</span>
              </div>
            </button>
            <button
              onClick={handleExportPNG}
              disabled={!svgContent}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                svgContent
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 hover:scale-105 shadow-md hover:shadow-lg'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21,15 16,10 5,21"/>
                </svg>
                <span>Export PNG</span>
              </div>
            </button>
          </div>

          {/* Canvas */}
          <div className="flex-1 bg-gradient-to-br from-white via-slate-50 to-blue-50 relative overflow-hidden">
            {/* Grid pattern background */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            />

            {svgContent ? (
              <CorrectPlantUMLEditor
                svgContent={svgContent}
                onSVGUpdate={handleSVGUpdate}
                onZoomChange={handleZoomChange}
              />
            ) : (
              <div className="h-full flex items-center justify-center relative z-10">
                <div className="text-center max-w-md mx-auto p-8">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">
                    {isLoading ? 'Generating diagram...' : 'Create Your PlantUML Diagram'}
                  </h3>
                  <p className="text-slate-500 leading-relaxed">
                    {isLoading
                      ? 'Please wait while we process your PlantUML syntax...'
                      : 'Enter your PlantUML syntax in the editor and click "Generate Diagram" to visualize your diagram.'
                    }
                  </p>
                  {isLoading && (
                    <div className="mt-4 flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white/90 backdrop-blur-md border-t border-slate-200 px-8 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-2 h-2 rounded-full ${svgContent ? 'bg-green-500' : 'bg-slate-300'} animate-pulse`}></div>
            <span className="text-sm font-medium text-slate-600">
              {svgContent ? 'PlantUML editor active - drag entities to rearrange, mouse wheel to zoom, click background to pan' : 'Ready to generate diagram'}
            </span>
          </div>
          {svgContent && (
            <div className="flex items-center space-x-2">
              <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                Zoom: {Math.round(zoomLevel * 100)}%
              </div>
              <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                Interactive Mode
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;