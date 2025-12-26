import { motion } from 'framer-motion';

interface MenuButtonProps {
  src: string;
  alt: string;
  onClick: () => void;
  delay?: number;
}

export function MenuButton({ src, alt, onClick, delay = 0 }: MenuButtonProps) {
  return (
    <motion.img
      src={src}
      alt={alt}
      aria-label={alt}
      className="menu-btn"
      onClick={onClick}
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
      exit={{ opacity: 0, y: 40, transition: { duration: 0.2 } }}
      whileHover={{ 
        y: -6, 
        filter: 'drop-shadow(0 12px 20px rgba(0, 0, 0, 0.35))',
        transition: { duration: 0.15 }
      }}
      whileTap={{ 
        y: 2, 
        filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))',
        transition: { duration: 0.1 }
      }}
    />
  );
}

