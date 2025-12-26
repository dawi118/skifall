const SKI_RESORTS = [
  'verbier', 'zermatt', 'chamonix', 'aspen', 'whistler',
  'courchevel', 'stmoritz', 'vail', 'niseko', 'cortina',
  'kitzbuhel', 'lech', 'megeve', 'tignes', 'avoriaz',
];

const MOUNTAINS = [
  'matterhorn', 'montblanc', 'eiger', 'denali', 'fuji',
  'olympus', 'rainier', 'everest', 'kilimanjaro', 'alpine',
  'glacier', 'summit', 'peak', 'ridge', 'avalanche',
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRoomCode(): string {
  return `${randomFrom(SKI_RESORTS)}-${randomFrom(MOUNTAINS)}`;
}

export function isValidRoomCode(code: string): boolean {
  const parts = code.toLowerCase().split('-');
  if (parts.length !== 2) return false;
  return parts[0].length > 0 && parts[1].length > 0;
}

