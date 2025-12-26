import { motion } from 'framer-motion';
import './ToolButton.css';

interface ToolButtonProps {
  src: string;
  alt: string;
  isSelected: boolean;
  onClick: () => void;
}

export function ToolButton({ src, alt, isSelected, onClick }: ToolButtonProps) {
  return (
    <motion.img
      src={src}
      alt={alt}
      aria-label={alt}
      className={`tool-btn ${isSelected ? 'selected' : ''}`}
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

