import type { Tool, SkierState } from '../types';
import './Toolbar.css';

interface ToolbarProps {
  currentTool: Tool;
  skierState: SkierState;
  onToolChange: (tool: Tool) => void;
  onPlay: () => void;
  onReset: () => void;
}

export function Toolbar({
  currentTool,
  skierState,
  onToolChange,
  onPlay,
  onReset,
}: ToolbarProps) {
  const isMoving = skierState === 'moving';

  return (
    <div className="toolbar">
      <div className="toolbar-section tools">
        <button
          className={`tool-btn ${currentTool === 'pencil' ? 'active' : ''}`}
          onClick={() => onToolChange('pencil')}
          disabled={isMoving}
          title="Pencil (draw lines)"
        >
          ✏️
        </button>
        <button
          className={`tool-btn ${currentTool === 'eraser' ? 'active' : ''}`}
          onClick={() => onToolChange('eraser')}
          disabled={isMoving}
          title="Eraser (remove lines)"
        >
          🧹
        </button>
      </div>

      <div className="toolbar-section controls">
        <button
          className="control-btn play-btn"
          onClick={onPlay}
          disabled={isMoving}
          title="Start skiing!"
        >
          ▶️ Play
        </button>
        <button
          className="control-btn reset-btn"
          onClick={onReset}
          title="Reset to start"
        >
          ↺ Reset
        </button>
      </div>

      <div className="toolbar-section status">
        <span className="skier-status">
          {skierState === 'idle' && '⏸️ Ready'}
          {skierState === 'moving' && '🎿 Skiing!'}
          {skierState === 'fallen' && '💥 Crashed!'}
          {skierState === 'finished' && '🏁 Finished!'}
        </span>
      </div>
    </div>
  );
}

