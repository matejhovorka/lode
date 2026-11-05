/**
 * Konstanty a konfigurace pro hru Lodě (Námořní bitva)
 */

export const BOARD_SIZE = 10;
export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

// Definice flotily podle pravidel:
// 1x 4 pole (Bitevní loď)
// 2x 3 pole (Křižník)
// 3x 2 pole (Torpédoborec)
// 4x 1 pole (Ponorka / Člun)
export const FLEET_CONFIG = [
  { id: 'battleship', name: 'Bitevní loď', size: 4, count: 1, icon: '🚢' },
  { id: 'cruiser', name: 'Křižník', size: 3, count: 2, icon: '🛥️' },
  { id: 'destroyer', name: 'Torpédoborec', size: 2, count: 3, icon: '⛵' },
  { id: 'submarine', name: 'Ponorka', size: 1, count: 4, icon: '🚤' }
];

export const CELL_STATE = {
  EMPTY: 'empty',
  SHIP: 'ship',
  MISS: 'miss',      // Voda
  HIT: 'hit',        // Zásah
  SUNK: 'sunk'       // Potopená loď
};

export const GAME_MODE = {
  VS_AI: 'vs_ai',
  PVP_LOCAL: 'pvp_local',
  ONLINE: 'online'
};

export const AI_DIFFICULTY = {
  EASY: 'easy',
  SMART: 'smart'
};

export const GAME_PHASE = {
  LOBBY: 'lobby',
  SETUP: 'setup',
  BATTLE: 'battle',
  PASS_DEVICE: 'pass_device',
  GAME_OVER: 'game_over'
};

