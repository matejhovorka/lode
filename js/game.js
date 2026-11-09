/**
 * Hlavní herní logika a UI ovladač pro Hru Lodě (Námořní bitva)
 */

import {
  BOARD_SIZE,
  LETTERS,
  FLEET_CONFIG,
  CELL_STATE,
  GAME_MODE,
  AI_DIFFICULTY,
  GAME_PHASE
} from './constants.js';
import { GameBoard } from './board.js';
import { BattleshipAI } from './ai.js';
import { sounds } from './audio.js';
import { OnlineManager } from './online.js';

export class BattleshipGame {
  constructor() {
    this.mode = GAME_MODE.VS_AI;
    this.difficulty = AI_DIFFICULTY.SMART;
    this.phase = GAME_PHASE.SETUP;

    this.player1Board = new GameBoard(BOARD_SIZE);
    this.player2Board = new GameBoard(BOARD_SIZE);

    this.ai = new BattleshipAI(BOARD_SIZE, this.difficulty);
    this.online = new OnlineManager();

    this.activePlayer = 1;
    this.setupPlayer = 1;
    this.selectedShipConfig = FLEET_CONFIG[0];
    this.currentOrientation = 'H';
    this.hoverCoord = null;

    // Online stav
    this.isOnlineReady = false;
    this.isOpponentReady = false;
    this.isMyOnlineTurn = false;
    this.awaitingFireResult = false;

    this.stats = {
      player1: { shots: 0, hits: 0 },
      player2: { shots: 0, hits: 0 },
      startTime: null,
      endTime: null
    };

    this.turnCounter = 1;
    this.isAiShooting = false;
    this.pendingPassCallback = null;

    this.initDOM();
    this.bindEvents();
    this.bindOnlineEvents();
    this.checkUrlForRoom();
  }

  initDOM() {
    this.modeSelect = document.getElementById('modeSelect');
    this.difficultySelect = document.getElementById('difficultySelect');
    this.soundToggleBtn = document.getElementById('soundToggleBtn');
    this.rulesBtn = document.getElementById('rulesBtn');
    this.newGameBtn = document.getElementById('newGameBtn');

    this.turnBadge = document.getElementById('turnBadge');
    this.onlineBadge = document.getElementById('onlineBadge');
    this.onlinePeerName = document.getElementById('onlinePeerName');
    this.statusMessage = document.getElementById('statusMessage');
    this.targetCoord = document.getElementById('targetCoord');
    this.totalShotsStat = document.getElementById('totalShotsStat');
    this.totalHitsStat = document.getElementById('totalHitsStat');
    this.accuracyStat = document.getElementById('accuracyStat');

    // Online Lobby
    this.onlineLobbyView = document.getElementById('onlineLobbyView');
    this.playerNicknameInput = document.getElementById('playerNicknameInput');
    this.tabCreateRoomBtn = document.getElementById('tabCreateRoomBtn');
    this.tabJoinRoomBtn = document.getElementById('tabJoinRoomBtn');
    this.tabContentCreate = document.getElementById('tabContentCreate');
    this.tabContentJoin = document.getElementById('tabContentJoin');
    this.roomCodeVal = document.getElementById('roomCodeVal');
    this.copyCodeBtn = document.getElementById('copyCodeBtn');
    this.copyLinkBtn = document.getElementById('copyLinkBtn');
    this.directLinkPreview = document.getElementById('directLinkPreview');
    this.fileProtocolNotice = document.getElementById('fileProtocolNotice');
    this.waitOpponentText = document.getElementById('waitOpponentText');
    this.joinRoomCodeInput = document.getElementById('joinRoomCodeInput');
    this.joinRoomSubmitBtn = document.getElementById('joinRoomSubmitBtn');
    this.joinStatusIndicator = document.getElementById('joinStatusIndicator');
    this.joinStatusText = document.getElementById('joinStatusText');
    this.joinErrorMsg = document.getElementById('joinErrorMsg');
    this.quickChatBar = document.getElementById('quickChatBar');
    this.toastNotice = document.getElementById('toastNotice');

    // Setup
    this.setupView = document.getElementById('setupView');
    this.setupPlayerName = document.getElementById('setupPlayerName');
    this.setupGrid = document.getElementById('setupGrid');
    this.setupColsHeader = document.getElementById('setupColsHeader');
    this.setupRowsHeader = document.getElementById('setupRowsHeader');
    this.dockShips = document.getElementById('dockShips');
    this.rotateShipBtn = document.getElementById('rotateShipBtn');
    this.orientationIcon = document.getElementById('orientationIcon');
    this.orientationText = document.getElementById('orientationText');
    this.randomizeBtn = document.getElementById('randomizeBtn');
    this.clearBoardBtn = document.getElementById('clearBoardBtn');
    this.startGameBtn = document.getElementById('startGameBtn');

    // Battle
    this.battleView = document.getElementById('battleView');
    this.friendlyName = document.getElementById('friendlyName');
    this.friendlyGrid = document.getElementById('friendlyGrid');
    this.friendlyColsHeader = document.getElementById('friendlyColsHeader');
    this.friendlyRowsHeader = document.getElementById('friendlyRowsHeader');
    this.friendlyFleetTracker = document.getElementById('friendlyFleetTracker');

    this.opponentName = document.getElementById('opponentName');
    this.opponentGrid = document.getElementById('opponentGrid');
    this.opponentColsHeader = document.getElementById('opponentColsHeader');
    this.opponentRowsHeader = document.getElementById('opponentRowsHeader');
    this.opponentFleetTracker = document.getElementById('opponentFleetTracker');

    this.logEntries = document.getElementById('logEntries');
    this.logTurnCount = document.getElementById('logTurnCount');

    // Modals
    this.rulesModal = document.getElementById('rulesModal');
    this.closeRulesBtn = document.getElementById('closeRulesBtn');

    this.passDeviceModal = document.getElementById('passDeviceModal');
    this.curtainTitle = document.getElementById('curtainTitle');
    this.curtainDesc = document.getElementById('curtainDesc');
    this.curtainConfirmBtn = document.getElementById('curtainConfirmBtn');

    this.gameOverModal = document.getElementById('gameOverModal');
    this.winnerTitle = document.getElementById('winnerTitle');
    this.winnerSubtitle = document.getElementById('winnerSubtitle');
    this.winnerTrophy = document.getElementById('winnerTrophy');
    this.statTotalShots = document.getElementById('statTotalShots');
    this.statTotalHits = document.getElementById('statTotalHits');
    this.statAccuracy = document.getElementById('statAccuracy');
    this.statDuration = document.getElementById('statDuration');
    this.restartGameBtn = document.getElementById('restartGameBtn');

    this.renderCoordinateHeaders();
  }

  renderCoordinateHeaders() {
    const renderHeaders = (colsContainer, rowsContainer) => {
      colsContainer.innerHTML = '';
      rowsContainer.innerHTML = '';

      LETTERS.forEach(letter => {
        const colDiv = document.createElement('div');
        colDiv.className = 'grid-col-label';
        colDiv.textContent = letter;
        colsContainer.appendChild(colDiv);
      });

      for (let r = 1; r <= BOARD_SIZE; r++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'grid-row-label';
        rowDiv.textContent = r;
        rowsContainer.appendChild(rowDiv);
      }
    };

    renderHeaders(this.setupColsHeader, this.setupRowsHeader);
    renderHeaders(this.friendlyColsHeader, this.friendlyRowsHeader);
    renderHeaders(this.opponentColsHeader, this.opponentRowsHeader);
  }

  showToast(text) {
    if (!this.toastNotice) return;
    this.toastNotice.textContent = text;
    this.toastNotice.classList.add('show');
    setTimeout(() => {
      this.toastNotice.classList.remove('show');
    }, 2500);
  }

  checkUrlForRoom() {
    try {
      let roomParam = null;

      // 1. Kontrola query parametrů (?room=...)
      const urlParams = new URLSearchParams(window.location.search);
      roomParam = urlParams.get('room');

      // 2. Kontrola hash fragmentu (#room=... nebo #LODE-...)
      if (!roomParam && window.location.hash) {
        const hash = window.location.hash.substring(1);
        if (hash.startsWith('room=')) {
          roomParam = hash.substring(5);
        } else if (hash.length >= 4) {
          roomParam = hash;
        }
      }

      if (roomParam) {
        const cleanCode = this.online.cleanRoomCode(roomParam);
        if (cleanCode) {
          const formattedCode = `LODE-${cleanCode}`;
          this.mode = GAME_MODE.ONLINE;
          this.modeSelect.value = GAME_MODE.ONLINE;
          this.difficultySelect.style.display = 'none';

          // Zobrazíme lobby s aktivní záložkou 'join'
          this.showOnlineLobby('join');
          this.joinRoomCodeInput.value = formattedCode;

          // Automatické zahájení připojení
          setTimeout(() => {
            this.handleJoinRoomSubmit();
          }, 300);
          return;
        }
      }
    } catch (err) {
      console.error('Chyba při čtení room z URL:', err);
    }

    this.startNewGame();
  }

  bindEvents() {
    this.modeSelect.addEventListener('change', (e) => {
      this.mode = e.target.value;
      this.difficultySelect.style.display = this.mode === GAME_MODE.VS_AI ? 'inline-block' : 'none';

      if (this.mode === GAME_MODE.ONLINE) {
        this.showOnlineLobby('create');
      } else {
        this.online.disconnect();
        this.onlineBadge.style.display = 'none';
        this.quickChatBar.style.display = 'none';
        this.startNewGame();
      }
    });

    this.difficultySelect.addEventListener('change', (e) => {
      this.difficulty = e.target.value;
      this.ai.setDifficulty(this.difficulty);
    });

    this.soundToggleBtn.addEventListener('click', () => {
      const isMuted = sounds.toggleMute();
      this.soundToggleBtn.textContent = isMuted ? '🔇' : '🔊';
      this.soundToggleBtn.title = isMuted ? 'Zapnout zvuk' : 'Vypnout zvuk';
    });

    this.rulesBtn.addEventListener('click', () => {
      this.rulesModal.classList.add('active');
    });
    this.closeRulesBtn.addEventListener('click', () => {
      this.rulesModal.classList.remove('active');
    });

    this.newGameBtn.addEventListener('click', () => {
      if (confirm('Opravdu chcete restartovat hru a začít novou bitvu?')) {
        if (this.mode === GAME_MODE.ONLINE) {
          this.showOnlineLobby('create');
        } else {
          this.startNewGame();
        }
      }
    });

    this.restartGameBtn.addEventListener('click', () => {
      this.gameOverModal.classList.remove('active');
      if (this.mode === GAME_MODE.ONLINE) {
        this.online.sendRematchOffer();
        this.showToast('Nabídka odvety byla odeslána soupeři...');
      } else {
        this.startNewGame();
      }
    });

    this.rotateShipBtn.addEventListener('click', () => this.toggleOrientation());
    this.randomizeBtn.addEventListener('click', () => this.handleRandomizeSetup());
    this.clearBoardBtn.addEventListener('click', () => this.handleClearSetup());
    this.startGameBtn.addEventListener('click', () => this.handleConfirmFleet());

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'r' || e.key === 'R' || e.key === ' ') {
        e.preventDefault();
        this.toggleOrientation();
      }
    });

    this.curtainConfirmBtn.addEventListener('click', () => {
      this.passDeviceModal.classList.remove('active');
      if (this.pendingPassCallback) {
        const cb = this.pendingPassCallback;
        this.pendingPassCallback = null;
        cb();
      }
    });

    this.setupGrid.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.toggleOrientation();
    });

    // Online Lobby Events
    this.tabCreateRoomBtn.addEventListener('click', () => this.switchOnlineTab('create'));
    this.tabJoinRoomBtn.addEventListener('click', () => this.switchOnlineTab('join'));

    this.copyCodeBtn.addEventListener('click', () => {
      if (this.online.roomCode) {
        navigator.clipboard.writeText(this.online.roomCode).then(() => {
          this.showToast('📋 Kód místnosti byl zkopírován!');
        });
      }
    });

    this.copyLinkBtn.addEventListener('click', () => {
      if (window.location.protocol === 'file:') {
        // Na file:// odkaz nefunguje přes internet
        navigator.clipboard.writeText(this.online.roomCode).then(() => {
          this.showToast(`📋 Hrajete z disku. Zkopírován kód místnosti (${this.online.roomCode})!`);
        });
        return;
      }

      if (this.online.shareUrl) {
        navigator.clipboard.writeText(this.online.shareUrl).then(() => {
          this.showToast('🔗 Odkaz pro kamaráda byl zkopírován do schránky!');
        });
      }
    });

    this.joinRoomSubmitBtn.addEventListener('click', () => this.handleJoinRoomSubmit());
    this.joinRoomCodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleJoinRoomSubmit();
    });

    // Quick Chat reaction buttons
    const chatBtns = document.querySelectorAll('.chat-reaction-btn');
    chatBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const msg = btn.dataset.msg;
        if (this.mode === GAME_MODE.ONLINE && this.online.isConnected) {
          this.online.sendChat(msg);
          this.addLogItem(`💬 Ty: ${msg}`, 'normal');
          sounds.playClick();
        }
      });
    });
  }

  bindOnlineEvents() {
    this.online.onConnected = (remoteName) => {
      sounds.playRadar();
      if (this.joinStatusIndicator) this.joinStatusIndicator.style.display = 'none';
      if (this.joinRoomSubmitBtn) {
        this.joinRoomSubmitBtn.disabled = false;
        this.joinRoomSubmitBtn.textContent = 'Připojit se';
      }

      this.showToast(`🎉 Soupeř (${remoteName}) se připojil!`);
      this.onlineBadge.style.display = 'inline-flex';
      this.onlineBadge.classList.remove('disconnected');
      this.onlinePeerName.textContent = remoteName;

      this.startOnlineSetupPhase();
    };

    this.online.onOpponentReady = () => {
      this.isOpponentReady = true;
      this.addLogItem(`Soupeř dokončil rozmístění své flotily.`, 'normal');
      this.showToast('Soupeř je připraven do bitvy!');

      if (this.isOnlineReady && this.online.isHost) {
        const firstTurn = Math.random() < 0.5 ? 'host' : 'guest';
        this.online.sendGameStart(firstTurn);
        this.handleOnlineGameStart(firstTurn);
      }
    };

    this.online.onGameStart = (firstTurn) => {
      this.handleOnlineGameStart(firstTurn);
    };

    this.online.onOpponentFire = (x, y) => {
      const attackRes = this.player1Board.receiveAttack(x, y);
      const coordStr = `${LETTERS[x]}${y + 1}`;

      this.online.sendFireResult({
        x,
        y,
        result: attackRes.result,
        shipName: attackRes.ship ? attackRes.ship.name : null,
        shipCells: attackRes.sunk ? attackRes.ship.cells : null,
        surroundingMisses: attackRes.surroundingMisses,
        allSunk: attackRes.allSunk
      });

      this.renderBattleGrids();
      this.renderFleetTrackers();

      if (attackRes.result === 'miss') {
        sounds.playSplash();
        this.addLogItem(`Soupeř vystřelil na ${coordStr}: VODA (vedle)`, 'miss');
        this.isMyOnlineTurn = true;
        this.updateOnlineTurnUI();
      } else {
        if (attackRes.result === 'sunk') {
          sounds.playSunk();
          this.addLogItem(`💥 Soupeř POTOPIL vaši loď ${attackRes.ship.name} na ${coordStr}!`, 'sunk');
        } else {
          sounds.playHit();
          this.addLogItem(`🎯 Soupeř ZASÁHL vaši loď na ${coordStr}!`, 'hit');
        }

        if (attackRes.allSunk) {
          this.handleGameOver(2);
        } else {
          this.isMyOnlineTurn = false;
          this.updateOnlineTurnUI();
        }
      }
    };

    this.online.onFireResult = (res) => {
      this.awaitingFireResult = false;
      const { x, y, result, shipName, surroundingMisses, allSunk } = res;
      const coordStr = `${LETTERS[x]}${y + 1}`;
      const targetCell = this.player2Board.getCell(x, y);

      targetCell.isHit = true;
      this.stats.player1.shots += 1;

      if (result === 'miss') {
        sounds.playSplash();
        targetCell.shipId = null;
        this.addLogItem(`Vystřelil jsi na ${coordStr}: VODA (vedle)`, 'miss');
        this.isMyOnlineTurn = false;
        this.updateOnlineTurnUI();
      } else {
        this.stats.player1.hits += 1;
        targetCell.shipId = 'hit';

        if (result === 'sunk') {
          sounds.playSunk();
          targetCell.isSunk = true;

          this.player2Board.ships.push({
            id: `enemy_sunk_${Date.now()}`,
            name: shipName,
            size: res.shipCells ? res.shipCells.length : 1,
            sunk: true,
            cells: res.shipCells || [{ x, y }]
          });

          if (surroundingMisses) {
            for (const sm of surroundingMisses) {
              const cell = this.player2Board.getCell(sm.x, sm.y);
              if (cell) {
                cell.isHit = true;
                cell.isSurroundingMiss = true;
              }
            }
          }

          this.addLogItem(`💥 ZÁSAH A POTOPENO! (${shipName}) na ${coordStr}! Máš další střelu!`, 'sunk');
        } else {
          sounds.playHit();
          this.addLogItem(`🎯 ZÁSAH na ${coordStr}! Máš další střelu!`, 'hit');
        }

        if (allSunk) {
          this.handleGameOver(1);
        } else {
          this.isMyOnlineTurn = true;
          this.updateOnlineTurnUI();
        }
      }

      this.renderBattleGrids();
      this.renderFleetTrackers();
      this.updateStatsDisplay();
    };

    this.online.onChat = (message, fromName) => {
      sounds.playClick();
      this.addLogItem(`💬 ${fromName}: ${message}`, 'hit');
      this.showToast(`${fromName}: ${message}`);
    };

    this.online.onRematchOffer = () => {
      sounds.playRadar();
      if (confirm(`${this.online.remotePlayerName} navrhuje odvetnou bitvu! Přijmout?`)) {
        this.online.sendRematchAccept();
        this.gameOverModal.classList.remove('active');
        this.startOnlineSetupPhase();
      }
    };

    this.online.onRematchAccept = () => {
      this.showToast('Odvetná bitva byla přijata!');
      this.gameOverModal.classList.remove('active');
      this.startOnlineSetupPhase();
    };

    this.online.onDisconnected = () => {
      this.onlineBadge.classList.add('disconnected');
      this.onlinePeerName.textContent = 'Odpojeno';
      this.showToast('⚠️ Spojení se soupeřem bylo přerušeno.');
      this.statusMessage.textContent = '⚠️ Soupeř se odpojil ze hry.';
    };

    this.online.onError = (errMsg) => {
      if (this.joinStatusIndicator) this.joinStatusIndicator.style.display = 'none';
      if (this.joinRoomSubmitBtn) {
        this.joinRoomSubmitBtn.disabled = false;
        this.joinRoomSubmitBtn.textContent = 'Připojit se';
      }

      this.joinErrorMsg.textContent = errMsg;
      this.joinErrorMsg.style.display = 'block';
      this.showToast(`Chyba: ${errMsg}`);
    };

    this.online.onStatusChange = (status) => {
      if (this.waitOpponentText) this.waitOpponentText.textContent = status;
      if (this.joinStatusText) this.joinStatusText.textContent = status;
    };
  }

  switchOnlineTab(tab) {
    if (tab === 'create') {
      this.tabCreateRoomBtn.classList.add('active');
      this.tabJoinRoomBtn.classList.remove('active');
      this.tabContentCreate.classList.add('active');
      this.tabContentJoin.classList.remove('active');

      if (this.joinStatusIndicator) this.joinStatusIndicator.style.display = 'none';
      if (this.joinErrorMsg) this.joinErrorMsg.style.display = 'none';

      const nickname = this.playerNicknameInput.value.trim() || 'Kapitán';
      this.online.createRoom(nickname);
      this.roomCodeVal.textContent = this.online.roomCode || 'Generuji...';
      this.directLinkPreview.textContent = this.online.shareUrl || 'Generuji...';
    } else {
      this.tabCreateRoomBtn.classList.remove('active');
      this.tabJoinRoomBtn.classList.add('active');
      this.tabContentCreate.classList.remove('active');
      this.tabContentJoin.classList.add('active');

      if (this.joinErrorMsg) this.joinErrorMsg.style.display = 'none';
    }
  }

  handleJoinRoomSubmit() {
    const rawCode = this.joinRoomCodeInput.value.trim();
    const cleanCode = this.online.cleanRoomCode(rawCode);

    if (!cleanCode) {
      this.joinErrorMsg.textContent = 'Prosím zadejte platný kód místnosti (např. 7K4P).';
      this.joinErrorMsg.style.display = 'block';
      return;
    }

    this.joinErrorMsg.style.display = 'none';
    const formattedCode = `LODE-${cleanCode}`;
    this.joinRoomCodeInput.value = formattedCode;

    if (this.joinStatusIndicator) this.joinStatusIndicator.style.display = 'flex';
    if (this.joinStatusText) this.joinStatusText.textContent = `Připojuji se k místnosti ${formattedCode}...`;
    if (this.joinRoomSubmitBtn) {
      this.joinRoomSubmitBtn.disabled = true;
      this.joinRoomSubmitBtn.textContent = 'Připojuji...';
    }

    const nickname = this.playerNicknameInput.value.trim() || 'Host';
    this.online.joinRoom(formattedCode, nickname);
  }

  showOnlineLobby(defaultTab = 'create') {
    this.phase = GAME_PHASE.LOBBY;
    this.onlineLobbyView.classList.add('active');
    this.setupView.classList.remove('active');
    this.battleView.classList.remove('active');
    this.quickChatBar.style.display = 'none';

    this.turnBadge.textContent = 'ONLINE LOBBY';
    this.turnBadge.className = 'turn-badge';

    if (this.fileProtocolNotice) {
      this.fileProtocolNotice.style.display = window.location.protocol === 'file:' ? 'block' : 'none';
    }

    if (defaultTab === 'join') {
      this.statusMessage.textContent = 'Zadejte kód místnosti nebo se připojte k soupeři.';
      this.switchOnlineTab('join');
    } else {
      this.statusMessage.textContent = 'Vytvořte místnost a pošlete kód nebo odkaz soupeři.';
      this.switchOnlineTab('create');
    }
  }

  startOnlineSetupPhase() {
    this.phase = GAME_PHASE.SETUP;
    this.isOnlineReady = false;
    this.isOpponentReady = false;

    this.onlineLobbyView.classList.remove('active');
    this.setupView.classList.add('active');
    this.battleView.classList.remove('active');
    this.quickChatBar.style.display = 'none';

    this.setupPlayerName.textContent = this.playerNicknameInput.value.trim() || 'Kapitán';
    this.turnBadge.textContent = `ROZMÍSTĚNÍ: ${this.setupPlayerName.textContent}`;
    this.turnBadge.className = 'turn-badge';
    this.statusMessage.textContent = 'Rozmístěte svou flotilu. Jakmile budete hotovi, potvrďte ji.';

    this.player1Board.reset();
    this.player2Board.reset();

    this.selectedShipConfig = FLEET_CONFIG[0];
    this.renderDockShips();
    this.renderSetupGrid();
    this.updateSetupButtonState();
  }

  handleOnlineGameStart(firstTurn) {
    this.phase = GAME_PHASE.BATTLE;
    this.isMyOnlineTurn = (this.online.isHost && firstTurn === 'host') || (!this.online.isHost && firstTurn === 'guest');
    this.stats.startTime = Date.now();

    this.setupView.classList.remove('active');
    this.battleView.classList.add('active');
    this.quickChatBar.style.display = 'flex';

    this.logEntries.innerHTML = '';
    this.addLogItem(`⚔️ Bitva zahájena! Spojení s ${this.online.remotePlayerName} je aktivní.`, 'normal');

    this.updateOnlineTurnUI();
    this.renderBattleGrids();
    this.renderFleetTrackers();
  }

  updateOnlineTurnUI() {
    const myName = this.online.localPlayerName;
    const oppName = this.online.remotePlayerName;

    this.friendlyName.textContent = `Tvoje flotila (${myName})`;
    this.opponentName.textContent = `Radar soupeře (${oppName})`;

    if (this.isMyOnlineTurn) {
      this.turnBadge.textContent = 'JSI NA TAHU!';
      this.turnBadge.className = 'turn-badge';
      this.statusMessage.textContent = '🎯 Zaměřte cíl na radaru soupeře a vystřelte!';
    } else {
      this.turnBadge.textContent = `TAH SOUPEŘE (${oppName.toUpperCase()})`;
      this.turnBadge.className = 'turn-badge opponent';
      this.statusMessage.textContent = `⏳ ${oppName} zaměřuje svou střelu...`;
    }
  }

  // ==================== BĚŽNÉ ROZMÍSŤOVÁNÍ A BITVA ====================
  startNewGame() {
    this.phase = GAME_PHASE.SETUP;
    this.setupPlayer = 1;
    this.activePlayer = 1;
    this.turnCounter = 1;
    this.isAiShooting = false;
    this.pendingPassCallback = null;

    this.stats = {
      player1: { shots: 0, hits: 0 },
      player2: { shots: 0, hits: 0 },
      startTime: null,
      endTime: null
    };

    this.player1Board.reset();
    this.player2Board.reset();
    this.ai.reset();

    this.gameOverModal.classList.remove('active');
    this.passDeviceModal.classList.remove('active');
    this.onlineLobbyView.classList.remove('active');

    this.showSetupView();
    this.logEntries.innerHTML = '';
    this.addLogItem('Hra připravena. Rozmístěte svou flotilu.', 'normal');
  }

  showSetupView() {
    this.setupView.classList.add('active');
    this.battleView.classList.remove('active');

    this.setupPlayerName.textContent = this.setupPlayer === 1 ? 'Hráč 1' : 'Hráč 2';
    this.turnBadge.textContent = `ROZMÍSTĚNÍ: ${this.setupPlayerName.textContent}`;
    this.turnBadge.className = 'turn-badge';
    this.statusMessage.textContent = 'Umístěte své lodě na hrací pole (nesmí se dotýkat ani rohy).';

    this.selectedShipConfig = FLEET_CONFIG[0];
    this.renderDockShips();
    this.renderSetupGrid();
    this.updateSetupButtonState();
  }

  toggleOrientation() {
    this.currentOrientation = this.currentOrientation === 'H' ? 'V' : 'H';
    this.orientationIcon.textContent = this.currentOrientation === 'H' ? '↔' : '↕';
    this.orientationText.textContent = this.currentOrientation === 'H' ? 'Vodorovně' : 'Svisle';
    sounds.playClick();
    if (this.hoverCoord) {
      this.updateSetupHover(this.hoverCoord.x, this.hoverCoord.y);
    }
  }

  getCurrentSetupBoard() {
    if (this.mode === GAME_MODE.ONLINE) return this.player1Board;
    return this.setupPlayer === 1 ? this.player1Board : this.player2Board;
  }

  applyShipClasses(cellEl, ship, x, y) {
    cellEl.classList.add('ship');
    if (!ship) return;
    if (ship.size === 1) {
      cellEl.classList.add('ship-single');
      return;
    }
    if (ship.orientation === 'H') {
      const minX = Math.min(...ship.cells.map(c => c.x));
      const maxX = Math.max(...ship.cells.map(c => c.x));
      if (x === minX) {
        cellEl.classList.add('ship-bow-h');
      } else if (x === maxX) {
        cellEl.classList.add('ship-stern-h');
      }
    } else {
      const minY = Math.min(...ship.cells.map(c => c.y));
      const maxY = Math.max(...ship.cells.map(c => c.y));
      if (y === minY) {
        cellEl.classList.add('ship-bow-v');
      } else if (y === maxY) {
        cellEl.classList.add('ship-stern-v');
      }
    }
  }

  renderDockShips() {
    const board = this.getCurrentSetupBoard();
    this.dockShips.innerHTML = '';

    FLEET_CONFIG.forEach(cfg => {
      const placedCount = board.ships.filter(s => s.size === cfg.size).length;
      const isCompleted = placedCount >= cfg.count;
      const isSelected = this.selectedShipConfig.id === cfg.id;

      const item = document.createElement('div');
      item.className = `dock-ship-item ${isSelected ? 'selected' : ''} ${isCompleted ? 'completed' : ''}`;
      item.draggable = !isCompleted;

      let dotsHtml = '';
      for (let i = 0; i < cfg.size; i++) {
        dotsHtml += `<div class="preview-dot"></div>`;
      }

      item.innerHTML = `
        <div class="ship-info-left">
          <div class="ship-name">${cfg.icon} ${cfg.name} (${cfg.size} pol.)</div>
          <div class="ship-cells-preview">${dotsHtml}</div>
        </div>
        <div class="ship-status">${placedCount} / ${cfg.count}</div>
      `;

      item.addEventListener('click', () => {
        sounds.playClick();
        this.selectedShipConfig = cfg;
        this.renderDockShips();
        if (this.hoverCoord) {
          this.updateSetupHover(this.hoverCoord.x, this.hoverCoord.y);
        }
      });

      item.addEventListener('dragstart', (e) => {
        this.selectedShipConfig = cfg;
        this.renderDockShips();
        e.dataTransfer.setData('text/plain', cfg.id);
        e.dataTransfer.effectAllowed = 'copy';
      });

      this.dockShips.appendChild(item);
    });
  }

  renderSetupGrid() {
    const board = this.getCurrentSetupBoard();
    this.setupGrid.innerHTML = '';

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.x = x;
        cell.dataset.y = y;

        const cellData = board.getCell(x, y);
        if (cellData.shipId) {
          const ship = board.getShip(cellData.shipId);
          this.applyShipClasses(cell, ship, x, y);
        }

        cell.addEventListener('mouseenter', () => {
          this.hoverCoord = { x, y };
          this.targetCoord.textContent = `${LETTERS[x]}${y + 1}`;
          this.updateSetupHover(x, y);
        });

        cell.addEventListener('mouseleave', () => {
          this.hoverCoord = null;
          this.clearSetupHover();
        });

        cell.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          this.hoverCoord = { x, y };
          this.updateSetupHover(x, y);
        });

        cell.addEventListener('drop', (e) => {
          e.preventDefault();
          this.handleSetupCellClick(x, y);
        });

        cell.addEventListener('click', () => {
          this.handleSetupCellClick(x, y);
        });

        this.setupGrid.appendChild(cell);
      }
    }
  }

  updateSetupHover(x, y) {
    this.clearSetupHover();
    const board = this.getCurrentSetupBoard();
    const size = this.selectedShipConfig.size;
    const canPlace = board.canPlaceShip(x, y, size, this.currentOrientation);

    for (let i = 0; i < size; i++) {
      const curX = this.currentOrientation === 'H' ? x + i : x;
      const curY = this.currentOrientation === 'V' ? y + i : y;

      if (board.isValidCoord(curX, curY)) {
        const cellEl = this.setupGrid.children[curY * BOARD_SIZE + curX];
        if (cellEl) {
          cellEl.classList.add(canPlace ? 'preview-valid' : 'preview-invalid');
        }
      }
    }
  }

  clearSetupHover() {
    const cells = this.setupGrid.querySelectorAll('.cell');
    cells.forEach(c => {
      c.classList.remove('preview-valid', 'preview-invalid');
    });
  }

  handleSetupCellClick(x, y) {
    const board = this.getCurrentSetupBoard();
    const cellData = board.getCell(x, y);

    if (cellData.shipId) {
      const ship = board.getShip(cellData.shipId);
      board.removeShip(cellData.shipId);
      const cfg = FLEET_CONFIG.find(c => c.size === ship.size);
      if (cfg) this.selectedShipConfig = cfg;
      this.currentOrientation = ship.orientation;
      this.orientationIcon.textContent = this.currentOrientation === 'H' ? '↔' : '↕';
      this.orientationText.textContent = this.currentOrientation === 'H' ? 'Vodorovně' : 'Svisle';

      sounds.playClick();
      this.renderDockShips();
      this.renderSetupGrid();
      this.updateSetupButtonState();
      this.updateSetupHover(x, y);
      return;
    }

    const cfg = this.selectedShipConfig;
    const placedCount = board.ships.filter(s => s.size === cfg.size).length;

    if (placedCount >= cfg.count) {
      const nextAvailable = FLEET_CONFIG.find(c => {
        const cnt = board.ships.filter(s => s.size === c.size).length;
        return cnt < c.count;
      });
      if (nextAvailable) {
        this.selectedShipConfig = nextAvailable;
        this.renderDockShips();
        this.updateSetupHover(x, y);
      } else {
        sounds.playError();
      }
      return;
    }

    if (!board.canPlaceShip(x, y, cfg.size, this.currentOrientation)) {
      sounds.playError();
      return;
    }

    const shipId = `${cfg.id}_${Date.now()}_${Math.random()}`;
    board.placeShip(shipId, cfg.name, x, y, cfg.size, this.currentOrientation);
    sounds.playClick();

    const newPlacedCount = board.ships.filter(s => s.size === cfg.size).length;
    if (newPlacedCount >= cfg.count) {
      const nextAvailable = FLEET_CONFIG.find(c => {
        const cnt = board.ships.filter(s => s.size === c.size).length;
        return cnt < c.count;
      });
      if (nextAvailable) {
        this.selectedShipConfig = nextAvailable;
      }
    }

    this.renderDockShips();
    this.renderSetupGrid();
    this.updateSetupButtonState();
    if (this.hoverCoord) {
      this.updateSetupHover(this.hoverCoord.x, this.hoverCoord.y);
    }
  }

  handleRandomizeSetup() {
    const board = this.getCurrentSetupBoard();
    board.randomizeFleet();
    sounds.playClick();
    this.renderDockShips();
    this.renderSetupGrid();
    this.updateSetupButtonState();
  }

  handleClearSetup() {
    const board = this.getCurrentSetupBoard();
    board.reset();
    sounds.playClick();
    this.renderDockShips();
    this.renderSetupGrid();
    this.updateSetupButtonState();
  }

  updateSetupButtonState() {
    const board = this.getCurrentSetupBoard();
    const isComplete = board.isFleetComplete();
    this.startGameBtn.disabled = !isComplete;

    if (isComplete) {
      this.statusMessage.textContent = 'Všechny lodě jsou rozmístěny! Můžete potvrdit flotilu.';
    } else {
      const remaining = 10 - board.ships.length;
      this.statusMessage.textContent = `Zbývá umístit ještě ${remaining} ${remaining === 1 ? 'loď' : remaining < 5 ? 'lodě' : 'lodí'}.`;
    }
  }

  handleConfirmFleet() {
    const board = this.getCurrentSetupBoard();
    if (!board.isFleetComplete()) return;

    sounds.playRadar();

    if (this.mode === GAME_MODE.ONLINE) {
      this.isOnlineReady = true;
      this.online.sendReady();
      this.startGameBtn.disabled = true;
      this.statusMessage.textContent = 'Flotila potvrzena! Čekám, až soupeř dokončí své rozestavění...';
      this.showToast('Flotila potvrzena! Čeká se na soupeře...');

      if (this.isOpponentReady && this.online.isHost) {
        const firstTurn = Math.random() < 0.5 ? 'host' : 'guest';
        this.online.sendGameStart(firstTurn);
        this.handleOnlineGameStart(firstTurn);
      }
      return;
    }

    if (this.mode === GAME_MODE.VS_AI) {
      this.player2Board.randomizeFleet();
      this.startBattlePhase();
    } else {
      if (this.setupPlayer === 1) {
        this.setupPlayer = 2;
        this.showPassDeviceCurtain(
          'Předej zařízení Hráči 2!',
          'Hráč 1 dokončil rozestavění své flotily. Nyní si své lodě tajně rozmístí Hráč 2.',
          () => {
            this.showSetupView();
          }
        );
      } else {
        this.showPassDeviceCurtain(
          'Flotily jsou připraveny!',
          'Oba hráči mají své lodě rozmístěné. Předejte zařízení Hráči 1 k zahájení námořní bitvy!',
          () => {
            this.startBattlePhase();
          }
        );
      }
    }
  }

  startBattlePhase() {
    this.phase = GAME_PHASE.BATTLE;
    this.activePlayer = 1;
    this.stats.startTime = Date.now();

    this.setupView.classList.remove('active');
    this.battleView.classList.add('active');

    this.updateBattleUI();
    this.addLogItem(`Bitva zahájena! Na tahu je ${this.getPlayerName(1)}.`, 'normal');
  }

  getPlayerName(playerNum) {
    if (this.mode === GAME_MODE.VS_AI) {
      return playerNum === 1 ? 'Hráč' : 'Počítač (AI)';
    }
    return `Hráč ${playerNum}`;
  }

  updateBattleUI() {
    if (this.mode === GAME_MODE.ONLINE) {
      this.updateOnlineTurnUI();
      this.updateStatsDisplay();
      this.renderBattleGrids();
      this.renderFleetTrackers();
      return;
    }

    const isP1 = this.activePlayer === 1;
    const curPlayerName = this.getPlayerName(this.activePlayer);
    const oppPlayerName = this.getPlayerName(this.activePlayer === 1 ? 2 : 1);

    this.friendlyName.textContent = `Flotila: ${curPlayerName}`;
    this.opponentName.textContent = `Radar: ${oppPlayerName}`;

    this.turnBadge.textContent = `NA TAHU: ${curPlayerName.toUpperCase()}`;
    this.turnBadge.className = isP1 ? 'turn-badge' : 'turn-badge opponent';

    if (this.mode === GAME_MODE.VS_AI && !isP1) {
      this.statusMessage.textContent = '🤖 Počítač zaměřuje cíl...';
    } else {
      this.statusMessage.textContent = `${curPlayerName}, vyberte souřadnice na radaru k palbě!`;
    }

    this.updateStatsDisplay();
    this.renderBattleGrids();
    this.renderFleetTrackers();
  }

  updateStatsDisplay() {
    const currentStats = this.mode === GAME_MODE.ONLINE || this.activePlayer === 1
      ? this.stats.player1
      : this.stats.player2;

    this.totalShotsStat.textContent = currentStats.shots;
    this.totalHitsStat.textContent = currentStats.hits;
    const acc = currentStats.shots > 0 ? Math.round((currentStats.hits / currentStats.shots) * 100) : 0;
    this.accuracyStat.textContent = `${acc}%`;
  }

  renderBattleGrids() {
    const friendlyBoard = this.player1Board;
    const opponentBoard = this.player2Board;

    // 1. Přátelská mřížka
    this.friendlyGrid.innerHTML = '';
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        const cellData = friendlyBoard.getCell(x, y);

        if (cellData.shipId) {
          const ship = friendlyBoard.getShip(cellData.shipId);
          this.applyShipClasses(cell, ship, x, y);
          if (ship && ship.sunk) {
            cell.classList.add('sunk');
          } else if (cellData.isHit) {
            cell.classList.add('hit');
          }
        } else if (cellData.isHit) {
          cell.classList.add('miss');
          if (cellData.isSurroundingMiss) {
            cell.classList.add('auto-surround');
          }
        }

        this.friendlyGrid.appendChild(cell);
      }
    }

    // 2. Nepřátelský radar
    this.opponentGrid.innerHTML = '';
    const canShoot = this.mode === GAME_MODE.ONLINE
      ? (this.isMyOnlineTurn && !this.awaitingFireResult)
      : (this.mode === GAME_MODE.PVP_LOCAL || this.activePlayer === 1);

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        const cellData = opponentBoard.getCell(x, y);

        if (cellData.isHit) {
          if (cellData.shipId) {
            const ship = opponentBoard.getShip(cellData.shipId);
            if (ship && ship.sunk) {
              cell.classList.add('sunk');
              this.applyShipClasses(cell, ship, x, y);
            } else {
              cell.classList.add('hit');
            }
          } else {
            cell.classList.add('miss');
            if (cellData.isSurroundingMiss) {
              cell.classList.add('auto-surround');
            }
          }
        }

        cell.addEventListener('mouseenter', () => {
          this.targetCoord.textContent = `${LETTERS[x]}${y + 1}`;
        });

        cell.addEventListener('mouseleave', () => {
          this.targetCoord.textContent = '--';
        });

        cell.addEventListener('click', () => {
          if (this.phase !== GAME_PHASE.BATTLE) return;

          if (this.mode === GAME_MODE.ONLINE) {
            if (!this.isMyOnlineTurn || this.awaitingFireResult) {
              sounds.playError();
              return;
            }
            if (cellData.isHit) {
              sounds.playError();
              return;
            }
            this.handleOnlineShot(x, y);
          } else {
            if (!canShoot || this.isAiShooting) return;
            this.handlePlayerShot(x, y);
          }
        });

        this.opponentGrid.appendChild(cell);
      }
    }
  }

  renderFleetTrackers() {
    const friendlyBoard = this.player1Board;
    const opponentBoard = this.player2Board;

    const renderTracker = (container, board) => {
      container.innerHTML = '';
      FLEET_CONFIG.forEach(cfg => {
        const shipsOfType = board.ships.filter(s => s.size === cfg.size);
        shipsOfType.forEach(ship => {
          const chip = document.createElement('div');
          chip.className = `fleet-ship-chip ${ship.sunk ? 'sunk' : ''}`;
          chip.textContent = `${cfg.icon} ${cfg.size}`;
          chip.title = `${cfg.name} (${cfg.size} pol.) ${ship.sunk ? '- POTOPENO' : '- NA HLADINĚ'}`;
          container.appendChild(chip);
        });
      });
    };

    renderTracker(this.friendlyFleetTracker, friendlyBoard);
    renderTracker(this.opponentFleetTracker, opponentBoard);
  }

  handleOnlineShot(x, y) {
    this.awaitingFireResult = true;
    sounds.playShot();
    this.online.sendFire(x, y);
    const coordStr = `${LETTERS[x]}${y + 1}`;
    this.statusMessage.textContent = `🚀 Palba na ${coordStr}... Čekám na výsledek soupeře.`;
  }

  handlePlayerShot(x, y) {
    const opponentBoard = this.activePlayer === 1 ? this.player2Board : this.player1Board;
    const targetCell = opponentBoard.getCell(x, y);

    if (targetCell.isHit) {
      sounds.playError();
      return;
    }

    const curStats = this.activePlayer === 1 ? this.stats.player1 : this.stats.player2;
    curStats.shots += 1;

    sounds.playShot();

    const attackRes = opponentBoard.receiveAttack(x, y);
    const coordStr = `${LETTERS[x]}${y + 1}`;
    const shooterName = this.getPlayerName(this.activePlayer);

    if (attackRes.result === 'miss') {
      sounds.playSplash();
      this.addLogItem(`${shooterName} vystřelil na ${coordStr}: VODA (vedle)`, 'miss');
      this.statusMessage.textContent = `Střela na ${coordStr}: VODA!`;

      this.updateBattleUI();

      setTimeout(() => {
        this.switchTurn();
      }, 700);
    } else {
      curStats.hits += 1;

      if (attackRes.result === 'sunk') {
        sounds.playSunk();
        this.addLogItem(`💥 ${shooterName} zasáhl a POTOPIL loď ${attackRes.ship.name} na ${coordStr}! Má další střelu!`, 'sunk');
        this.statusMessage.textContent = `🎯 ZÁSAH A POTOPENO! (${attackRes.ship.name}). Střílíte znovu!`;
      } else {
        sounds.playHit();
        this.addLogItem(`🎯 ${shooterName} zasáhl cíl na ${coordStr}! Má další střelu!`, 'hit');
        this.statusMessage.textContent = `🎯 ZÁSAH na ${coordStr}! Máte právo na další střelu!`;
      }

      this.updateBattleUI();

      if (attackRes.allSunk) {
        this.handleGameOver(this.activePlayer);
        return;
      }
    }
  }

  switchTurn() {
    if (this.phase !== GAME_PHASE.BATTLE) return;

    this.turnCounter++;
    this.logTurnCount.textContent = `Tah ${this.turnCounter}`;

    if (this.mode === GAME_MODE.VS_AI) {
      if (this.activePlayer === 1) {
        this.activePlayer = 2;
        this.updateBattleUI();
        this.scheduleAiShot();
      } else {
        this.activePlayer = 1;
        this.updateBattleUI();
      }
    } else {
      const nextPlayer = this.activePlayer === 1 ? 2 : 1;
      this.showPassDeviceCurtain(
        `Konec tahu! Předej zařízení Hráči ${nextPlayer}`,
        `Předchozí střela minula cíl. Předejte zařízení Hráči ${nextPlayer} a zakryjte obrazovku.`,
        () => {
          this.activePlayer = nextPlayer;
          this.updateBattleUI();
        }
      );
    }
  }

  scheduleAiShot() {
    this.isAiShooting = true;

    setTimeout(() => {
      if (this.phase !== GAME_PHASE.BATTLE) {
        this.isAiShooting = false;
        return;
      }

      const target = this.ai.chooseTarget(this.player1Board);
      if (!target) {
        this.isAiShooting = false;
        return;
      }

      const { x, y } = target;
      const coordStr = `${LETTERS[x]}${y + 1}`;
      this.stats.player2.shots += 1;

      sounds.playShot();
      const attackRes = this.player1Board.receiveAttack(x, y);
      this.ai.recordResult(x, y, attackRes);

      if (attackRes.result === 'miss') {
        sounds.playSplash();
        this.addLogItem(`🤖 Počítač vystřelil na ${coordStr}: VODA (vedle)`, 'miss');
        this.statusMessage.textContent = `Počítač mířil na ${coordStr}: VODA!`;
        this.updateBattleUI();

        setTimeout(() => {
          this.isAiShooting = false;
          this.switchTurn();
        }, 700);
      } else {
        this.stats.player2.hits += 1;

        if (attackRes.result === 'sunk') {
          sounds.playSunk();
          this.addLogItem(`💥 Počítač POTOPIL vaši loď ${attackRes.ship.name} na ${coordStr}!`, 'sunk');
          this.statusMessage.textContent = `💥 Počítač potopil vaši loď ${attackRes.ship.name}!`;
        } else {
          sounds.playHit();
          this.addLogItem(`🎯 Počítač ZASÁHL vaši loď na ${coordStr}! Střílí znovu!`, 'hit');
          this.statusMessage.textContent = `⚠️ Počítač zasáhl vaši loď na ${coordStr} a střílí znovu!`;
        }

        this.updateBattleUI();

        if (attackRes.allSunk) {
          this.isAiShooting = false;
          this.handleGameOver(2);
          return;
        }

        setTimeout(() => {
          this.scheduleAiShot();
        }, 900);
      }
    }, 800);
  }

  showPassDeviceCurtain(title, desc, onConfirm) {
    this.curtainTitle.textContent = title;
    this.curtainDesc.textContent = desc;
    this.pendingPassCallback = onConfirm;
    this.passDeviceModal.classList.add('active');
  }

  handleGameOver(winnerPlayer) {
    this.phase = GAME_PHASE.GAME_OVER;
    this.stats.endTime = Date.now();

    const isHumanWinner = winnerPlayer === 1;
    let winnerName = this.getPlayerName(winnerPlayer);

    if (this.mode === GAME_MODE.ONLINE) {
      winnerName = isHumanWinner ? this.online.localPlayerName : this.online.remotePlayerName;
    }

    if (isHumanWinner) {
      sounds.playVictory();
      this.winnerTrophy.textContent = '🏆';
      this.winnerTitle.textContent = `VÍTĚZÍ ${winnerName.toUpperCase()}!`;
      this.winnerSubtitle.textContent = 'Skvělá taktika! Celá nepřátelská flotila byla potopena na dno oceánu!';
    } else {
      sounds.playDefeat();
      this.winnerTrophy.textContent = '🌊';
      this.winnerTitle.textContent = 'PORÁŽKA!';
      this.winnerSubtitle.textContent = this.mode === GAME_MODE.ONLINE
        ? `${winnerName} potopil všechny vaše lodě dřív, než jste našli jeho flotilu.`
        : 'Počítač potopil všechny vaše lodě dřív, než jste našli jeho flotilu.';
    }

    const winnerStats = winnerPlayer === 1 ? this.stats.player1 : this.stats.player2;
    this.statTotalShots.textContent = winnerStats.shots;
    this.statTotalHits.textContent = winnerStats.hits;
    const acc = winnerStats.shots > 0 ? Math.round((winnerStats.hits / winnerStats.shots) * 100) : 0;
    this.statAccuracy.textContent = `${acc}%`;

    const elapsedSeconds = Math.floor((this.stats.endTime - this.stats.startTime) / 1000);
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    this.statDuration.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    this.addLogItem(`🏁 KONEC BITVY! Vítězí ${winnerName}!`, 'sunk');

    setTimeout(() => {
      this.gameOverModal.classList.add('active');
    }, 700);
  }

  addLogItem(text, type = 'normal') {
    const item = document.createElement('div');
    item.className = `log-item ${type}`;
    item.textContent = text;
    this.logEntries.appendChild(item);
  }
}

// Spuštění po načtení dokumentu
window.addEventListener('DOMContentLoaded', () => {
  new BattleshipGame();
});
