# 🚢 Hra Lodě (Námořní bitva)

Moderní webová implementace klasické strategické hry **Lodě / Námořní bitva** pro dva hráče, online multiplayer i hru proti počítači.

---

## 🎯 Herní režimy

### 1. 🌐 Online hra pro 2 hráče (přes kód místnosti nebo přímý odkaz)
* **Založení místnosti (Hostitel)**: 
  * V menu zvolte **„🌐 Online hra“**.
  * Hra vygeneruje unikátní kód místnosti (např. `LODE-7K4P`) a přímý odkaz.
  * Klikněte na **„📋 Kopírovat kód“** nebo **„🔗 Kopírovat odkaz pro soupeře“** a pošlete ho spoluhráči přes Messenger, WhatsApp, Discord apod.
* **Připojení k místnosti (Host)**:
  * Stačí otevřít zaslaný odkaz (např. `.../?room=LODE-7K4P`) — hra se automaticky připojí!
  * Nebo v záložce *„Připojit se k existující“* ručně zadat kód.
* **Bez serverové registrace (P2P WebRTC / PeerJS)**:
  * Prohlížeče obou hráčů se propojí napřímo šifrovaným P2P kanálem.
  * **Ochrana proti podvádění**: Polohy lodí soupeře se nikdy nepřenáší do vašeho prohlížeče předem; při výstřelu se ověřuje zásah přímo u protihráče.
* **Rychlé hlášení (Chat & reakce)**: V průběhu bitvy můžete posílat rychlé reakce (`👋 Ahoj!`, `🎯 Trefa!`, `🌊 Voda!`, `😈 Mám tě!`, `🫡 GG!`).
* **Odvetná bitva**: Po konci hry může kdokoliv navrhnout odvetu jediným kliknutím.

### 2. 🤖 Proti Počítači (AI)
* **🎯 Taktická AI (Smart)**: Využívá paritní šachovnicové vyhledávání a při zásahu systematicky dohledává orientaci a konce lodi. Po potopení eliminuje okolní vody.
* **🎲 Lehká AI (Easy)**: Střílí náhodně do neprobádaných polí.

### 3. 👥 2 Hráči (Na 1 zařízení / Pass & Play)
* Hráči se střídají na jednom počítači, tabletu nebo telefonu.
* Zahrnuje diskrétní zástěnu s tlačítkem *„Předat zařízení Hráči 2“*, aby soupeř neviděl vaše rozmístění.

---

## 📋 Pravidla hry

1. **Hrací pole (10 × 10)**:
   * Sloupce **A–J**, řádky **1–10**.
   * Každý hráč má pole své flotily (obrana) a radar soupeře (útok).
2. **Flotila (10 lodí celkem, 20 polí)**:
   * 🚢 **1× Bitevní loď** (4 pole)
   * 🛥️ **2× Křižník** (3 pole)
   * ⛵ **3× Torpédoborec** (2 pole)
   * 🚤 **4× Ponorka / Člun** (1 pole)
3. **Pravidlo o dotyku (Klasická pravidla)**:
   * Lodě mohou ležet vodorovně nebo svisle.
   * **Nesmí se dotýkat ani rohy (diagonálně)** — mezi libovolnými loděmi musí být alespoň 1 políčko vody.
4. **Střelba a tahy**:
   * **Voda (minutí)**: Hráč minul, na tahu je soupeř.
   * **Zásah**: Hráč zasáhl loď a **získává právo na okamžitou další střelu!**
   * **Potopení**: Po zasažení všech polí dané lodě se automaticky všechna okolní pole označí jako voda.
   * **Vítězství**: Vyhrává hráč, který jako první potopí celou nepřátelskou flotilu.

---

## 🚀 Jak hru spustit

### Možnost A: Přímé otevření souboru
Dvakrát klikněte na soubor `index.html` nebo spusťte v terminálu:
```bash
open index.html
```

### Možnost B: Lokální HTTP server (doporučeno pro sdílení na síti)
```bash
npm start
# nebo:
node server.js
```
Server se spustí na adrese `http://localhost:3000`.

---

## ⌨️ Ovládání
* **Levé tlačítko myši / Dotyk**: Výběr lodi z doku, položení na desku, střelba na radaru.
* **Kliknutí na již položenou loď**: Zvedne loď z desky pro její přemístění nebo otočení.
* **Klávesa R nebo Mezerník**: Rychlé otočení lodi (vodorovně ↔ svisle).
* **Pravé tlačítko myši**: Otočení lodi přímo nad herní plochou.
* **🎲 Náhodně**: Automatické a korektní rozestavění celé flotily jedním klikem.
* **Přetahování (Drag & Drop)**: Lodě lze z doku přímo přetahovat myší.
