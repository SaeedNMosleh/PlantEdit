/**
 * Main App component - PlantEdit with TypeScript and modern React architecture
 */

import React, { useState, useCallback, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DiagramCanvas } from '@/components/DiagramCanvas';
import { PlantUMLInput } from '@/components/PlantUMLInput';
import { Toolbar } from '@/components/Toolbar';
import { StatusBar } from '@/components/StatusBar';
import { usePlantUMLIntegration } from '@/hooks/useDiagramInteractions';
import { Position } from '@/types/geometry';
import './App.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  const [isInputPanelCollapsed, setIsInputPanelCollapsed] = useState(false);
  const [status, setStatus] = useState('Ready');

  // Hooks
  const { generateFromPlantUML, exportToPNG, exportCurrentDiagramToSVG, exportCurrentDiagramToPNG } = usePlantUMLIntegration();


  // Handle PlantUML generation
  const handleGenerate = useCallback(async (plantumlSource: string) => {
    setStatus('Generating diagram...');

    try {
      const result = await generateFromPlantUML(plantumlSource);

      if (result.success) {
        setStatus('Diagram generated successfully');
      } else {
        setStatus(`Error: ${result.error.message}`);
        console.error('Generation error:', result.error);
      }
    } catch (error) {
      setStatus('Error generating diagram');
      console.error('Unexpected error:', error);
    }

    // Clear status after 3 seconds
    setTimeout(() => setStatus('Ready'), 3000);
  }, [generateFromPlantUML]);

  // Handle PNG export (original from PlantUML source)
  const handleExportPNG = useCallback(async (plantumlSource: string) => {
    if (!plantumlSource.trim()) {
      setStatus('No diagram to export');
      return;
    }

    setStatus('Generating PNG...');

    try {
      const result = await exportToPNG(plantumlSource);

      if (result.success) {
        // Download the blob
        const url = URL.createObjectURL(result.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diagram.png';
        a.click();
        URL.revokeObjectURL(url);

        setStatus('PNG exported successfully');
      } else {
        setStatus(`Export error: ${result.error.message}`);
      }
    } catch (error) {
      setStatus('Error exporting PNG');
      console.error('Export error:', error);
    }

    setTimeout(() => setStatus('Ready'), 3000);
  }, [exportToPNG]);

  // Handle SVG export of current edited diagram
  const handleExportCurrentSVG = useCallback(() => {
    setStatus('Exporting SVG...');

    try {
      const result = exportCurrentDiagramToSVG();

      if (result.success) {
        setStatus('SVG exported successfully');
      } else {
        setStatus(`Export error: ${result.error.message}`);
      }
    } catch (error) {
      setStatus('Error exporting SVG');
      console.error('Export error:', error);
    }

    setTimeout(() => setStatus('Ready'), 3000);
  }, [exportCurrentDiagramToSVG]);

  // Handle PNG export of current edited diagram
  const handleExportCurrentPNG = useCallback(async () => {
    setStatus('Exporting PNG...');

    try {
      const result = await exportCurrentDiagramToPNG();

      if (result.success) {
        setStatus('PNG exported successfully');
      } else {
        setStatus(`Export error: ${result.error.message}`);
      }
    } catch (error) {
      setStatus('Error exporting PNG');
      console.error('Export error:', error);
    }

    setTimeout(() => setStatus('Ready'), 3000);
  }, [exportCurrentDiagramToPNG]);

  // Handle node movement
  const handleNodeMove = useCallback((nodeId: string, position: Position) => {
    // Real-time edge recalculation happens automatically in the EdgeComponent
    console.log(`Node ${nodeId} moved to:`, position);
  }, []);

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
            isInputPanelCollapsed ? 'w-12' : 'w-80'
          }`}
        >
          <PlantUMLInput
            isCollapsed={isInputPanelCollapsed}
            onToggleCollapse={() => setIsInputPanelCollapsed(prev => !prev)}
            onGenerate={handleGenerate}
          />
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <Toolbar
            onExportSVG={handleExportCurrentSVG}
            onExportPNG={handleExportCurrentPNG}
          />

          {/* Canvas */}
          <div className="flex-1">
            <DiagramCanvas
              onNodeMove={handleNodeMove}
            />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar status={status} />
    </div>
  );
};

// Main App with providers
const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
};

export default App;