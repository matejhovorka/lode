/**
 * Online P2P multiplayer manažer pro hru Lodě
 * Využívá WebRTC a PeerJS pro přímé spojení mezi prohlížeči dvou hráčů přes internet.
 */

export class OnlineManager {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.isHost = false;
    this.roomCode = null;
    this.shareUrl = null;
    this.localPlayerName = 'Kapitán';
    this.remotePlayerName = 'Soupeř';
    this.isConnected = false;

    // Callbacky pro herní události
    this.onConnected = () => {};
    this.onOpponentReady = () => {};
    this.onGameStart = () => {};
    this.onOpponentFire = () => {};
    this.onFireResult = () => {};
    this.onChat = () => {};
    this.onRematchOffer = () => {};
    this.onRematchAccept = () => {};
    this.onDisconnected = () => {};
    this.onError = () => {};
    this.onStatusChange = () => {};
  }

  // Generování krátkého, dobře čitelného kódu místnosti (např. LODE-7K4P)
  generateRoomCode() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `LODE-${code}`;
  }

  getPeerId(roomCode) {
    return `battleship-cz-${roomCode.trim().toUpperCase()}`;
  }

  getShareUrl(roomCode) {
    if (typeof window === 'undefined') return '';
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomCode);
      return url.toString();
    } catch {
      return `${window.location.href}?room=${roomCode}`;
    }
  }

  /**
   * Založení nové online místnosti (Host)
   */
  createRoom(playerName = 'Kapitán') {
    this.disconnect();
    this.isHost = true;
    this.localPlayerName = playerName || 'Hostitel';
    this.roomCode = this.generateRoomCode();
    this.shareUrl = this.getShareUrl(this.roomCode);

    if (typeof Peer === 'undefined') {
      this.onError('Knihovna PeerJS nebyla načtena. Zkontrolujte připojení k internetu.');
      return false;
    }

    const peerId = this.getPeerId(this.roomCode);

    try {
      this.peer = new Peer(peerId, {
        debug: 1
      });

      this.peer.on('open', () => {
        this.onStatusChange('Místnost vytvořena. Čekám na soupeře...');
      });

      this.peer.on('connection', (conn) => {
        this.setupConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (err.type === 'unavailable-id') {
          // Kód byl náhodou obsazen, zkusíme nový kód
          setTimeout(() => this.createRoom(playerName), 300);
        } else {
          this.onError(`Chyba online spojení: ${err.type || err.message}`);
        }
      });

      return true;
    } catch (err) {
      this.onError(`Nelze inicializovat P2P: ${err.message}`);
      return false;
    }
  }

  /**
   * Připojení k existující místnosti (Guest)
   */
  joinRoom(roomCode, playerName = 'Kapitán') {
    this.disconnect();
    this.isHost = false;
    this.localPlayerName = playerName || 'Host';
    this.roomCode = roomCode.trim().toUpperCase();

    if (typeof Peer === 'undefined') {
      this.onError('Knihovna PeerJS nebyla načtena. Zkontrolujte připojení k internetu.');
      return false;
    }

    try {
      this.peer = new Peer({
        debug: 1
      });

      this.peer.on('open', () => {
        const targetPeerId = this.getPeerId(this.roomCode);
        this.onStatusChange(`Připojování k místnosti ${this.roomCode}...`);

        const conn = this.peer.connect(targetPeerId, {
          reliable: true
        });

        this.setupConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (err.type === 'peer-unavailable') {
          this.onError(`Místnost s kódem ${this.roomCode} nebyla nalezena. Zkontrolujte správnost kódu.`);
        } else {
          this.onError(`Chyba připojení: ${err.type || err.message}`);
        }
      });

      return true;
    } catch (err) {
      this.onError(`Nelze se připojit k místnosti: ${err.message}`);
      return false;
    }
  }

  setupConnection(conn) {
    this.conn = conn;

    conn.on('open', () => {
      this.isConnected = true;
      // Odeslat uvítací handshake se jménem
      conn.send({
        type: 'HELLO',
        name: this.localPlayerName
      });
    });

    conn.on('data', (data) => {
      this.handleIncomingMessage(data);
    });

    conn.on('close', () => {
      this.isConnected = false;
      this.onDisconnected();
    });

    conn.on('error', (err) => {
      console.error('Conn error:', err);
      this.onError('Chyba datového kanálu se soupeřem.');
    });
  }

  handleIncomingMessage(data) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'HELLO':
        this.remotePlayerName = data.name || (this.isHost ? 'Host' : 'Hostitel');
        this.onConnected(this.remotePlayerName);
        // Pokud jsem hostitel a přijal jsem HELLO, pošlu zpět své jméno
        if (this.isHost) {
          this.send({
            type: 'HELLO_ACK',
            name: this.localPlayerName
          });
        }
        break;

      case 'HELLO_ACK':
        this.remotePlayerName = data.name || 'Hostitel';
        this.onConnected(this.remotePlayerName);
        break;

      case 'READY':
        this.onOpponentReady();
        break;

      case 'GAME_START':
        this.onGameStart(data.firstTurn);
        break;

      case 'FIRE':
        this.onOpponentFire(data.x, data.y);
        break;

      case 'FIRE_RESULT':
        this.onFireResult(data);
        break;

      case 'CHAT':
        this.onChat(data.message, this.remotePlayerName);
        break;

      case 'REMATCH_OFFER':
        this.onRematchOffer();
        break;

      case 'REMATCH_ACCEPT':
        this.onRematchAccept();
        break;
    }
  }

  send(data) {
    if (this.conn && this.conn.open) {
      this.conn.send(data);
      return true;
    }
    return false;
  }

  sendReady() {
    return this.send({ type: 'READY' });
  }

  sendGameStart(firstTurn) {
    return this.send({ type: 'GAME_START', firstTurn });
  }

  sendFire(x, y) {
    return this.send({ type: 'FIRE', x, y });
  }

  sendFireResult(resultData) {
    return this.send({
      type: 'FIRE_RESULT',
      ...resultData
    });
  }

  sendChat(message) {
    return this.send({ type: 'CHAT', message });
  }

  sendRematchOffer() {
    return this.send({ type: 'REMATCH_OFFER' });
  }

  sendRematchAccept() {
    return this.send({ type: 'REMATCH_ACCEPT' });
  }

  disconnect() {
    if (this.conn) {
      try { this.conn.close(); } catch {}
      this.conn = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch {}
      this.peer = null;
    }
    this.isConnected = false;
    this.isHost = false;
    this.roomCode = null;
    this.shareUrl = null;
  }
}

