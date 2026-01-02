import type { TrickEvent } from '../hooks/useSkillTracker';
import type { Camera } from '../types';
import './SkillDisplay.css';

const TRICK_LABELS: Record<TrickEvent['type'], string> = {
  ski: 'SKI',
  air: 'AIR',
  '360': '360!',
  switchback: 'SWITCH',
};

interface SkillDisplayProps {
  score: number;
  events: TrickEvent[];
  camera: Camera;
  canvasRect: DOMRect | null;
}

export function SkillDisplay({ score, events, camera, canvasRect }: SkillDisplayProps) {
  // Convert world position to screen position
  const worldToScreen = (worldX: number, worldY: number) => {
    if (!canvasRect) return { x: 0, y: 0 };
    const cx = canvasRect.width / 2;
    const cy = canvasRect.height / 2;
    return {
      x: cx + (worldX - camera.x) * camera.zoom,
      y: cy + (worldY - camera.y) * camera.zoom,
    };
  };

  return (
    <>
      {/* Skill Score Display */}
      <div className="skill-score-display">
        <div className="skill-score-label">SKILL</div>
        <div className="skill-score-value">{score}</div>
        
        {/* Trick labels animate out from here */}
        <div className="trick-label-container">
          {events.map(event => (
            <div key={event.id} className="trick-label">
              {TRICK_LABELS[event.type]}
            </div>
          ))}
        </div>
      </div>

      {/* Position-based popups */}
      {events.map(event => {
        const screenPos = worldToScreen(event.position.x, event.position.y);
        const showLabel = event.type !== 'ski';
        return (
          <div
            key={`popup-${event.id}`}
            className="trick-popup"
            style={{
              left: screenPos.x,
              top: screenPos.y,
            }}
          >
            {showLabel && <div className="trick-popup-label">{TRICK_LABELS[event.type]}</div>}
            <div className="trick-popup-points">+{event.points}</div>
          </div>
        );
      })}
    </>
  );
}

