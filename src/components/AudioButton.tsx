import { motion } from 'framer-motion';
import audioOn from '../assets/images/audio-on.png';
import audioOff from '../assets/images/audio-off.png';
import './AudioButton.css';

interface AudioButtonProps {
  isMuted: boolean;
  onClick: () => void;
}

export function AudioButton({ isMuted, onClick }: AudioButtonProps) {
  return (
    <motion.img
      src={isMuted ? audioOff : audioOn}
      alt={isMuted ? "Unmute" : "Mute"}
      className="audio-btn"
      onClick={onClick}
      whileHover={{ 
        scale: 1.05,
        transition: { duration: 0.15 }
      }}
      whileTap={{ 
        scale: 0.95,
        transition: { duration: 0.1 }
      }}
    />
  );
}

