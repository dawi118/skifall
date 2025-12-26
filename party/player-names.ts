const ADJECTIVES = [
  "Alpine", "Arctic", "Blizzard", "Brave", "Crystal",
  "Daring", "Fearless", "Frosty", "Glacial", "Golden",
  "Icy", "Lightning", "Lunar", "Mighty", "Nordic",
  "Polar", "Powder", "Raging", "Silent", "Silver",
  "Snowy", "Swift", "Thunder", "Wild", "Winter",
];

const NOUNS = [
  "Avalanche", "Bear", "Blizzard", "Eagle", "Falcon",
  "Fox", "Glacier", "Hawk", "Husky", "Lynx",
  "Mogul", "Mountain", "Owl", "Penguin", "Racer",
  "Rider", "Shredder", "Slider", "Storm", "Tiger",
  "Wolf", "Yeti", "Zenith",
];

export function generatePlayerName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}

