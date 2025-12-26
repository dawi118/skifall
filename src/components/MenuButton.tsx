import { motion } from 'framer-motion';

interface MenuButtonProps {
  src: string;
  alt: string;
  onClick: () => void;
  delay?: number;
}

export function MenuButton({ src, alt, onClick, delay = 0 }: MenuButtonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: {
          type: 'spring' as const,
          stiffness: 400,
          damping: 25,
          delay,
        }
      }}
      exit={{ opacity: 0, y: 60, transition: { duration: 0.15 } }}
    >
      <img
        src={src}
        alt={alt}
        aria-label={alt}
        className="menu-btn"
        onClick={onClick}
      />
    </motion.div>
  );
}

