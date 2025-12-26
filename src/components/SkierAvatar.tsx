import skier1Head from '../assets/characters/skier1/separated/skier1_head.png';
import skier2Head from '../assets/characters/skier2/separated/skier2_head.png';
import skier3Head from '../assets/characters/skier3/separated/skier3_head.png';
import skier4Head from '../assets/characters/skier4/separated/skier4_head.png';
import blank1 from '../assets/images/blank-1.png';
import blank2 from '../assets/images/blank-2.png';
import blank3 from '../assets/images/blank-3.png';
import blank4 from '../assets/images/blank-4.png';
import './SkierAvatar.css';

const SKIER_HEADS: Record<number, string> = {
  1: skier1Head,
  2: skier2Head,
  3: skier3Head,
  4: skier4Head,
};

const AVATAR_BACKGROUNDS: Record<number, string> = {
  1: blank1,
  2: blank2,
  3: blank3,
  4: blank4,
};

interface SkierAvatarProps {
  character: number;
  size?: number;
  className?: string;
}

export function SkierAvatar({ character, size = 48, className = '' }: SkierAvatarProps) {
  const headSrc = SKIER_HEADS[character] || skier1Head;
  const bgSrc = AVATAR_BACKGROUNDS[character] || blank1;
  const headSize = Math.round(size * 0.75);

  return (
    <div 
      className={`skier-avatar ${className}`}
      style={{ width: size, height: size }}
    >
      <img src={bgSrc} alt="" className="skier-avatar-bg" />
      <img 
        src={headSrc} 
        alt="" 
        className="skier-avatar-head"
        style={{ width: headSize, height: headSize }}
      />
    </div>
  );
}

