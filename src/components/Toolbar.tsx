import type { Tool, SkierState } from '../types';
import { ToolButton } from './ToolButton';
import panIcon from '../assets/images/pan.png';
import pencilIcon from '../assets/images/pencil.png';
import eraserIcon from '../assets/images/eraser.png';
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
    <div className={`toolbar ${isDisabled ? 'disabled' : ''}`}>
      <div className="toolbar-section tools">
        <ToolButton
          src={panIcon}
          alt="Pan"
          isSelected={currentTool === 'hand'}
          onClick={() => !isDisabled && onToolChange('hand')}
        />
        <ToolButton
          src={pencilIcon}
          alt="Draw"
          isSelected={currentTool === 'pencil'}
          onClick={() => !isDisabled && onToolChange('pencil')}
        />
        <ToolButton
          src={eraserIcon}
          alt="Erase"
          isSelected={currentTool === 'eraser'}
          onClick={() => !isDisabled && onToolChange('eraser')}
        />
      </div>
    </div>
  );
}
