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
    this.handshakeComplete = false;
    this.connectionTimeout = null;

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

  // Vyčištění a sjednocení kódu místnosti (např. 'LODE-7K4P' -> '7K4P')
  cleanRoomCode(code) {
    if (!code) return '';
    let clean = String(code).trim().toUpperCase();
    if (clean.startsWith('LODE-')) {
      clean = clean.substring(5);
    } else if (clean.startsWith('LODE')) {
      clean = clean.substring(4);
    }
    return clean.replace(/[^A-Z0-9]/g, '');
  }

  // Generování krátkého, dobře čitelného 4-znakového kódu (např. 7K4P)
  generateRoomCode() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `LODE-${code}`;
  }

  getPeerId(roomCode) {
    const clean = this.cleanRoomCode(roomCode);
    return `battleship-cz-v2-${clean}`;
  }

  getShareUrl(roomCode) {
    if (typeof window === 'undefined') return '';
    try {
      const url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      url.searchParams.set('room', roomCode);
      return url.toString();
    } catch {
      const base = window.location.href.split('?')[0].split('#')[0];
      return `${base}?room=${roomCode}`;
    }
  }

  getPeerConfig() {
    return {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ]
      }
    };
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
      this.onError('Knihovna PeerJS se nenačetla. Zkontrolujte připojení k internetu.');
      return false;
    }

    const peerId = this.getPeerId(this.roomCode);
    this.onStatusChange(`Zakládám místnost ${this.roomCode}...`);

    try {
      this.peer = new Peer(peerId, this.getPeerConfig());

      this.peer.on('open', () => {
        this.onStatusChange(`Místnost ${this.roomCode} otevřena! Čekám na připojení soupeře...`);
      });

      this.peer.on('connection', (conn) => {
        this.onStatusChange(`Soupeř se připojuje, probíhá ověření spojení...`);
        this.setupConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('Peer host error:', err);
        if (err.type === 'unavailable-id') {
          // Kód byl náhodou obsazen, vygenerujeme nový a zkusíme znovu
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

    const clean = this.cleanRoomCode(roomCode);
    if (!clean) {
      this.onError('Neplatný kód místnosti.');
      return false;
    }

    this.roomCode = `LODE-${clean}`;

    if (typeof Peer === 'undefined') {
      this.onError('Knihovna PeerJS se nenačetla. Zkontrolujte připojení k internetu.');
      return false;
    }

    this.onStatusChange(`Připojování k místnosti ${this.roomCode}...`);

    // Nastavíme timeout pro případ, že se spojení nezdaří
    this.clearConnectionTimeout();
    this.connectionTimeout = setTimeout(() => {
      if (!this.isConnected) {
        this.onError(`Místnost ${this.roomCode} neodpovídá. Ujistěte se, že hostitel má hru stále otevřenou v prohlížeči.`);
      }
    }, 14000);

    try {
      this.peer = new Peer(this.getPeerConfig());

      this.peer.on('open', () => {
        const targetPeerId = this.getPeerId(this.roomCode);
        this.onStatusChange(`Vyhledávám hostitele místnosti ${this.roomCode}...`);

        const conn = this.peer.connect(targetPeerId, {
          reliable: true
        });

        this.setupConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('Peer join error:', err);
        this.clearConnectionTimeout();
        if (err.type === 'peer-unavailable') {
          this.onError(`Místnost ${this.roomCode} nebyla nalezena. Zkontrolujte správnost kódu a zda má hostitel hru otevřenou.`);
        } else {
          this.onError(`Chyba připojení: ${err.type || err.message}`);
        }
      });

      return true;
    } catch (err) {
      this.clearConnectionTimeout();
      this.onError(`Nelze se připojit k místnosti: ${err.message}`);
      return false;
    }
  }

  clearConnectionTimeout() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  setupConnection(conn) {
    this.conn = conn;

    const onOpened = () => {
      this.clearConnectionTimeout();
      this.isConnected = true;
      this.onStatusChange('Spojení otevřeno! Vyměňuji herní data...');

      // Odeslat handshake se jménem
      try {
        conn.send({
          type: 'HELLO',
          name: this.localPlayerName
        });
      } catch (err) {
        console.error('Chyba odeslání HELLO:', err);
      }
    };

    if (conn.open) {
      onOpened();
    } else {
      conn.on('open', onOpened);
    }

    conn.on('data', (data) => {
      this.handleIncomingMessage(data);
    });

    conn.on('close', () => {
      this.clearConnectionTimeout();
      this.isConnected = false;
      this.onDisconnected();
    });

    conn.on('error', (err) => {
      console.error('DataConnection error:', err);
      this.clearConnectionTimeout();
      this.onError('Chyba spojení se soupeřem.');
    });
  }

  handleIncomingMessage(data) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'HELLO':
        this.clearConnectionTimeout();
        this.isConnected = true;
        this.remotePlayerName = data.name || (this.isHost ? 'Host' : 'Hostitel');

        // Odpověď HELLO_ACK se jménem, aby měly obě strany jistotu
        this.send({
          type: 'HELLO_ACK',
          name: this.localPlayerName
        });

        if (!this.handshakeComplete) {
          this.handshakeComplete = true;
          this.onConnected(this.remotePlayerName);
        }
        break;

      case 'HELLO_ACK':
        this.clearConnectionTimeout();
        this.isConnected = true;
        this.remotePlayerName = data.name || (this.isHost ? 'Host' : 'Hostitel');
        if (!this.handshakeComplete) {
          this.handshakeComplete = true;
          this.onConnected(this.remotePlayerName);
        }
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
      try {
        this.conn.send(data);
        return true;
      } catch (err) {
        console.error('Chyba odeslání dat:', err);
      }
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
    this.clearConnectionTimeout();
    if (this.conn) {
      try { this.conn.close(); } catch {}
      this.conn = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch {}
      this.peer = null;
    }
    this.isConnected = false;
    this.handshakeComplete = false;
    this.isHost = false;
    this.roomCode = null;
    this.shareUrl = null;
  }
}
