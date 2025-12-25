import type { Tool, SkierState } from '../types';
import './Toolbar.css';

interface ToolbarProps {
  currentTool: Tool;
  skierState: SkierState;
  disabled?: boolean;
  onToolChange: (tool: Tool) => void;
}

export function Toolbar({
  currentTool,
  skierState,
  disabled = false,
  onToolChange,
}: ToolbarProps) {
  const isDisabled = skierState === 'moving' || disabled;

  return (
    <div className="toolbar">
      <div className="toolbar-section tools">
        <button
          className={`tool-btn ${currentTool === 'hand' ? 'active' : ''}`}
          onClick={() => onToolChange('hand')}
          disabled={isDisabled}
          data-tooltip="Pan"
        >
          ✋
        </button>
        <button
          className={`tool-btn ${currentTool === 'pencil' ? 'active' : ''}`}
          onClick={() => onToolChange('pencil')}
          disabled={isDisabled}
          data-tooltip="Draw"
        >
          ✏️
        </button>
        <button
          className={`tool-btn ${currentTool === 'eraser' ? 'active' : ''}`}
          onClick={() => onToolChange('eraser')}
          disabled={isDisabled}
          data-tooltip="Erase"
        >
          🧽
        </button>
      </div>
    </div>
  );
}
