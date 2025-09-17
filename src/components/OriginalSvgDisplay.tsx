/**
 * Component to display the original PlantUML SVG exactly as received
 */

import React, { useMemo } from 'react';
import { clsx } from 'clsx';

export interface OriginalSvgDisplayProps {
  svgContent: string;
  className?: string;
}

export const OriginalSvgDisplay: React.FC<OriginalSvgDisplayProps> = ({
  svgContent,
  className,
}) => {
  // Parse and clean the SVG content
  const cleanedSvgContent = useMemo(() => {
    try {
      // Parse the SVG to ensure it's valid
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      const svgElement = doc.querySelector('svg');

      if (!svgElement) {
        return '<svg><text>Invalid SVG content</text></svg>';
      }

      // Ensure the SVG has proper viewport attributes
      if (!svgElement.getAttribute('width') && !svgElement.getAttribute('viewBox')) {
        svgElement.setAttribute('width', '100%');
        svgElement.setAttribute('height', '100%');
      }

      // Add responsive attributes
      svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

      // Return the cleaned SVG
      return svgElement.outerHTML;
    } catch (error) {
      console.error('Error processing SVG content:', error);
      return '<svg><text>Error rendering SVG</text></svg>';
    }
  }, [svgContent]);

  return (
    <div
      className={clsx(
        'original-svg-display',
        'w-full h-full flex items-center justify-center',
        'bg-white',
        className
      )}
      style={{
        background: 'radial-gradient(circle, #e0e0e0 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <div
        className="svg-container max-w-full max-h-full"
        dangerouslySetInnerHTML={{ __html: cleanedSvgContent }}
      />
    </div>
  );
};