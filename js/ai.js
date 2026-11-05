/**
 * Umělá inteligence (AI) pro hru Lodě
 * Nabízí režim 'easy' (náhodné střílení) a 'smart' (taktické dohledávání zasažených lodí).
 */

import { BOARD_SIZE, AI_DIFFICULTY } from './constants.js';

export class BattleshipAI {
  constructor(boardSize = BOARD_SIZE, difficulty = AI_DIFFICULTY.SMART) {
    this.boardSize = boardSize;
    this.difficulty = difficulty;
    this.reset();
  }

  reset() {
    this.shotsFired = new Set(); // množina 'x,y'
    this.targetQueue = [];       // fronta souřadnic pro dohledávání {x, y}
    this.currentHits = [];       // zasažená pole aktuálně dohledávané lodi [{x, y}]
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
  }

  isShot(x, y) {
    return this.shotsFired.has(`${x},${y}`);
  }

  isValid(x, y) {
    return x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize;
  }

  /**
   * Zvolí další souřadnice ke střelbě
   */
  chooseTarget(opponentBoard) {
    if (this.difficulty === AI_DIFFICULTY.EASY) {
      return this.getRandomTarget();
    }

    // Taktická AI (Smart)
    // 1. Pokud máme ve frontě kandidáty po zásahu, střílíme na ně
    while (this.targetQueue.length > 0) {
      const candidate = this.targetQueue.shift();
      if (!this.isShot(candidate.x, candidate.y)) {
        return candidate;
      }
    }

    // 2. Režim lovu (Hunt mode) s paritním šachovnicovým vzorem
    return this.getHuntTarget(opponentBoard);
  }

  /**
   * Náhodný cíl, kam ještě nebylo vystřeleno
   */
  getRandomTarget() {
    const available = [];
    for (let y = 0; y < this.boardSize; y++) {
      for (let x = 0; x < this.boardSize; x++) {
        if (!this.isShot(x, y)) {
          available.push({ x, y });
        }
      }
    }

    if (available.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex];
  }

  /**
   * Režim lovu (Smart Hunt):
   * Preferuje šachovnicová políčka (x + y % 2 === 0), což je optimální pro nalezení lodí délky >= 2.
   */
  getHuntTarget(opponentBoard) {
    // Zjistíme, jaké nejmenší nepotopené lodě soupeř ještě má
    const remainingShips = opponentBoard.ships.filter(s => !s.sunk);
    const minRemainingSize = remainingShips.length > 0
      ? Math.min(...remainingShips.map(s => s.size))
      : 1;

    const parityPool = [];
    const fallbackPool = [];

    for (let y = 0; y < this.boardSize; y++) {
      for (let x = 0; x < this.boardSize; x++) {
        if (!this.isShot(x, y)) {
          // Pokud hledáme lodě velikosti 2 a více, stačí políčka s paritou
          if (minRemainingSize >= 2 && (x + y) % 2 === 0) {
            parityPool.push({ x, y });
          } else {
            fallbackPool.push({ x, y });
          }
        }
      }
    }

    const pool = parityPool.length > 0 ? parityPool : fallbackPool;
    if (pool.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
  }

  /**
   * Zpracuje výsledek výstřelu a aktualizuje taktiku
   */
  recordResult(x, y, attackResult) {
    this.shotsFired.add(`${x},${y}`);

    // Pokud byly kolem potopené lodi automaticky označeny vody, zaznamenáme je
    if (attackResult.surroundingMisses) {
      for (const sm of attackResult.surroundingMisses) {
        this.shotsFired.add(`${sm.x},${sm.y}`);
      }
    }

    if (this.difficulty === AI_DIFFICULTY.EASY) {
      return;
    }

    // Taktická AI
    if (attackResult.result === 'hit') {
      this.currentHits.push({ x, y });
      this.updateTargetQueueOnHit();
    } else if (attackResult.result === 'sunk') {
      this.currentHits.push({ x, y });
      
      // Odstraníme z currentHits pole patřící právě potopené lodi
      const sunkShipCells = new Set(attackResult.ship.cells.map(c => `${c.x},${c.y}`));
      this.currentHits = this.currentHits.filter(c => !sunkShipCells.has(`${c.x},${c.y}`));

      // Pokud ještě zbývají nějaké starší zásahy (např. zasažená jiná loď poblíž),
      // přepočítáme frontu cílů pro ně
      this.targetQueue = [];
      if (this.currentHits.length > 0) {
        this.updateTargetQueueOnHit();
      }
    }
  }

  /**
   * Inteligentní generování cílů podél linie zásahů
   */
  updateTargetQueueOnHit() {
    this.targetQueue = [];

    if (this.currentHits.length === 1) {
      // 1 zásah -> zkusit 4 sousedy (kříž: sever, jih, západ, východ)
      const hit = this.currentHits[0];
      const directions = [
        { dx: 0, dy: -1 }, // Nahoru
        { dx: 0, dy: 1 },  // Dolů
        { dx: -1, dy: 0 }, // Vlevo
        { dx: 1, dy: 0 }   // Vpravo
      ];

      // Náhodně zamícháme směry pro nepředvídatelnost
      directions.sort(() => Math.random() - 0.5);

      for (const dir of directions) {
        const nx = hit.x + dir.dx;
        const ny = hit.y + dir.dy;
        if (this.isValid(nx, ny) && !this.isShot(nx, ny)) {
          this.targetQueue.push({ x: nx, y: ny });
        }
      }
    } else if (this.currentHits.length >= 2) {
      // Více zásahů -> určíme osu lodi (vodorovná nebo svislá)
      const isHorizontal = this.currentHits[0].y === this.currentHits[1].y;

      if (isHorizontal) {
        // Seřadíme podle X
        const sorted = [...this.currentHits].sort((a, b) => a.x - b.x);
        const y = sorted[0].y;
        const minX = sorted[0].x;
        const maxX = sorted[sorted.length - 1].x;

        // Zkusíme políčko před začátkem a za koncem
        const left = { x: minX - 1, y };
        const right = { x: maxX + 1, y };

        if (this.isValid(left.x, left.y) && !this.isShot(left.x, left.y)) {
          this.targetQueue.push(left);
        }
        if (this.isValid(right.x, right.y) && !this.isShot(right.x, right.y)) {
          this.targetQueue.push(right);
        }
      } else {
        // Seřadíme podle Y
        const sorted = [...this.currentHits].sort((a, b) => a.y - b.y);
        const x = sorted[0].x;
        const minY = sorted[0].y;
        const maxY = sorted[sorted.length - 1].y;

        // Zkusíme políčko nad a pod
        const up = { x, y: minY - 1 };
        const down = { x, y: maxY + 1 };

        if (this.isValid(up.x, up.y) && !this.isShot(up.x, up.y)) {
          this.targetQueue.push(up);
        }
        if (this.isValid(down.x, down.y) && !this.isShot(down.x, down.y)) {
          this.targetQueue.push(down);
        }
      }
    }
  }
}

