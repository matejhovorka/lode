/**
 * Třída pro správu hracího pole a logiku lodiček
 */

import { BOARD_SIZE, FLEET_CONFIG } from './constants.js';

export class GameBoard {
  constructor(size = BOARD_SIZE) {
    this.size = size;
    this.grid = this.createEmptyGrid();
    this.ships = [];
    this.shots = []; // historie střel {x, y, result}
  }

  createEmptyGrid() {
    const grid = [];
    for (let y = 0; y < this.size; y++) {
      const row = [];
      for (let x = 0; x < this.size; x++) {
        row.push({
          x,
          y,
          shipId: null,
          isHit: false, // zda sem již bylo vystřeleno
          isSurroundingMiss: false // zda bylo políčko automaticky označeno jako voda po potopení sousední lodě
        });
      }
      grid.push(row);
    }
    return grid;
  }

  reset() {
    this.grid = this.createEmptyGrid();
    this.ships = [];
    this.shots = [];
  }

  isValidCoord(x, y) {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }

  getCell(x, y) {
    if (!this.isValidCoord(x, y)) return null;
    return this.grid[y][x];
  }

  /**
   * Zkontroluje, zda lze loď dané velikosti a orientace umístit na souřadnice [startX, startY].
   * Pravidlo: Lodě se nesmí překrývat a nesmí se dotýkat ani rohy (tzv. 1 políčko odstup do všech 8 směrů).
   */
  canPlaceShip(x, y, size, orientation, ignoreShipId = null) {
    const cellsToOccupy = [];

    for (let i = 0; i < size; i++) {
      const curX = orientation === 'H' ? x + i : x;
      const curY = orientation === 'V' ? y + i : y;

      // Kontrola hranic pole
      if (!this.isValidCoord(curX, curY)) {
        return false;
      }
      cellsToOccupy.push({ x: curX, y: curY });
    }

    // Pro každou buňku, kterou má loď obsadit, zkontrolujeme ji i všech jejích 8 sousedů
    for (const cell of cellsToOccupy) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cell.x + dx;
          const ny = cell.y + dy;

          if (this.isValidCoord(nx, ny)) {
            const neighborCell = this.grid[ny][nx];
            if (neighborCell.shipId && neighborCell.shipId !== ignoreShipId) {
              return false; // Dotýká se jiné existující lodi (stranou nebo rohem)
            }
          }
        }
      }
    }

    return true;
  }

  /**
   * Umístí loď na pole.
   */
  placeShip(shipId, name, x, y, size, orientation) {
    if (!this.canPlaceShip(x, y, size, orientation)) {
      return false;
    }

    // Pokud už loď se stejným ID existuje, nejprve ji smažeme
    this.removeShip(shipId);

    const shipCells = [];
    for (let i = 0; i < size; i++) {
      const curX = orientation === 'H' ? x + i : x;
      const curY = orientation === 'V' ? y + i : y;
      shipCells.push({ x: curX, y: curY });
      this.grid[curY][curX].shipId = shipId;
    }

    const ship = {
      id: shipId,
      name,
      size,
      orientation,
      cells: shipCells,
      hits: 0,
      sunk: false
    };

    this.ships.push(ship);
    return ship;
  }

  removeShip(shipId) {
    const shipIndex = this.ships.findIndex(s => s.id === shipId);
    if (shipIndex === -1) return false;

    const ship = this.ships[shipIndex];
    for (const cell of ship.cells) {
      if (this.isValidCoord(cell.x, cell.y)) {
        this.grid[cell.y][cell.x].shipId = null;
      }
    }

    this.ships.splice(shipIndex, 1);
    return true;
  }

  getShip(shipId) {
    return this.ships.find(s => s.id === shipId) || null;
  }

  /**
   * Vrátí všechna okolní pole (8 směrů) kolem zadaných buněk, která nejsou součástí samotné lodě.
   */
  getSurroundingCells(cells) {
    const surrounding = [];
    const cellSet = new Set(cells.map(c => `${c.x},${c.y}`));

    for (const c of cells) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = c.x + dx;
          const ny = c.y + dy;

          if (this.isValidCoord(nx, ny) && !cellSet.has(`${nx},${ny}`)) {
            if (!surrounding.some(s => s.x === nx && s.y === ny)) {
              surrounding.push({ x: nx, y: ny });
            }
          }
        }
      }
    }

    return surrounding;
  }

  /**
   * Zpracování střelby na souřadnice [x, y]
   */
  receiveAttack(x, y) {
    if (!this.isValidCoord(x, y)) {
      return { result: 'invalid', message: 'Mimo hrací pole!' };
    }

    const targetCell = this.grid[y][x];

    if (targetCell.isHit) {
      return { result: 'already_hit', message: 'Na toto pole již bylo vystřeleno!' };
    }

    targetCell.isHit = true;

    // Voda (minutí)
    if (!targetCell.shipId) {
      this.shots.push({ x, y, result: 'miss' });
      return {
        result: 'miss',
        x,
        y,
        allSunk: false
      };
    }

    // Zásah
    const ship = this.getShip(targetCell.shipId);
    ship.hits += 1;
    this.shots.push({ x, y, result: 'hit', shipId: ship.id });

    // Kontrola, zda je celá loď potopena
    const isSunk = ship.hits >= ship.size;
    let surroundingMisses = [];

    if (isSunk) {
      ship.sunk = true;
      // Automaticky označit okolní pole jako vodu (podle pravidla, že se lodě nesmí dotýkat)
      const surrounding = this.getSurroundingCells(ship.cells);
      for (const sc of surrounding) {
        const cell = this.grid[sc.y][sc.x];
        if (!cell.isHit) {
          cell.isHit = true;
          cell.isSurroundingMiss = true;
          this.shots.push({ x: sc.x, y: sc.y, result: 'miss', autoSurround: true });
          surroundingMisses.push({ x: sc.x, y: sc.y });
        }
      }
    }

    const allSunk = this.isAllSunk();

    return {
      result: isSunk ? 'sunk' : 'hit',
      ship,
      sunk: isSunk,
      surroundingMisses,
      allSunk,
      x,
      y
    };
  }

  isAllSunk() {
    if (this.ships.length === 0) return false;
    return this.ships.every(s => s.sunk);
  }

  isFleetComplete(fleetConfig = FLEET_CONFIG) {
    const requiredTotal = fleetConfig.reduce((acc, curr) => acc + curr.count, 0);
    return this.ships.length === requiredTotal;
  }

  /**
   * Náhodné korektní rozmístění celé flotily podle zadané konfigurace.
   */
  randomizeFleet(fleetConfig = FLEET_CONFIG) {
    this.reset();
    let shipCounter = 0;

    for (const item of fleetConfig) {
      for (let count = 0; count < item.count; count++) {
        let placed = false;
        let attempts = 0;
        const maxAttempts = 1000;

        while (!placed && attempts < maxAttempts) {
          attempts++;
          const orientation = Math.random() < 0.5 ? 'H' : 'V';
          const maxX = orientation === 'H' ? this.size - item.size : this.size - 1;
          const maxY = orientation === 'V' ? this.size - item.size : this.size - 1;

          const x = Math.floor(Math.random() * (maxX + 1));
          const y = Math.floor(Math.random() * (maxY + 1));

          const shipId = `${item.id}_${shipCounter}`;
          if (this.canPlaceShip(x, y, item.size, orientation)) {
            this.placeShip(shipId, item.name, x, y, item.size, orientation);
            placed = true;
            shipCounter++;
          }
        }

        if (!placed) {
          // Pokud se náhodou nepodaří rozmístit (např. v rozích se zablokuje), zkusíme to celé znovu
          return this.randomizeFleet(fleetConfig);
        }
      }
    }

    return true;
  }
}

