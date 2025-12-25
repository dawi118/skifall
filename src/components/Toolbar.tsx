import type { Tool, SkierState } from '../types';
import './Toolbar.css';

interface ToolbarProps {
  currentTool: Tool;
  skierState: SkierState;
  onToolChange: (tool: Tool) => void;
}

export function Toolbar({
  currentTool,
  skierState,
  onToolChange,
}: ToolbarProps) {
  const isMoving = skierState === 'moving';

  return (
    <div className="toolbar">
      <div className="toolbar-section tools">
        <button
          className={`tool-btn ${currentTool === 'hand' ? 'active' : ''}`}
          onClick={() => onToolChange('hand')}
          disabled={isMoving}
          data-tooltip="Pan"
        >
          ✋
        </button>
        <button
          className={`tool-btn ${currentTool === 'pencil' ? 'active' : ''}`}
          onClick={() => onToolChange('pencil')}
          disabled={isMoving}
          data-tooltip="Draw"
        >
          ✏️
        </button>
        <button
          className={`tool-btn ${currentTool === 'eraser' ? 'active' : ''}`}
          onClick={() => onToolChange('eraser')}
          disabled={isMoving}
          data-tooltip="Erase"
        >
          🧽
        </button>
      </div>
    </div>
  );
}
