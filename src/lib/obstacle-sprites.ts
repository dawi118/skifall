import mountainPeakImg from '../assets/obstacles/mountain-peak.png';
import rockFormationImg from '../assets/obstacles/rock_formation.png';
import treeImg from '../assets/obstacles/tree.png';
import houseImg from '../assets/obstacles/house.png';

export interface ObstacleSprites {
  mountainPeak: HTMLImageElement;
  rockFormation: HTMLImageElement;
  tree: HTMLImageElement;
  house: HTMLImageElement;
}

let loadedSprites: ObstacleSprites | null = null;
let loadingPromise: Promise<ObstacleSprites> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function loadObstacleSprites(): Promise<ObstacleSprites> {
  if (loadedSprites) return loadedSprites;
  if (loadingPromise) return loadingPromise;

  loadingPromise = Promise.all([
    loadImage(mountainPeakImg),
    loadImage(rockFormationImg),
    loadImage(treeImg),
    loadImage(houseImg),
  ]).then(([mountainPeak, rockFormation, tree, house]) => {
    const sprites: ObstacleSprites = {
      mountainPeak,
      rockFormation,
      tree,
      house,
    };
    loadedSprites = sprites;
    loadingPromise = null;
    return sprites;
  });

  return loadingPromise;
}

export function getObstacleSprites(): ObstacleSprites | null {
  return loadedSprites;
}

