import { useState } from 'react';
import './DevMenu.css';

interface DevMenuProps {
  onNewLevel: () => void;
}

export function DevMenu({ onNewLevel }: DevMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="dev-menu">
      <button 
        className="dev-menu-toggle" 
        onClick={() => setIsOpen(!isOpen)}
        title="Dev Menu"
      >
        ⚙️
      </button>
      
      {isOpen && (
        <div className="dev-menu-dropdown">
          <div className="dev-menu-header">Dev Menu</div>
          <button className="dev-menu-item" onClick={() => { onNewLevel(); setIsOpen(false); }}>
            New Level (all players)
          </button>
        </div>
      )}
    </div>
  );
}

