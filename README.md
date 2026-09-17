# Voltmaps v1.1 — Subway Surfers WebGL Multi-Cities & Gaming Suite

A complete collection and port of **Voltmaps (v1.1)**: browser-based WebGL versions of Subway Surfers across multiple global cities, featuring dedicated training modes, a customized in-game tool suite, and ready-to-use local development servers.

---

## 🎮 Features

- **Multi-City Support:**
  - Barcelona (`barcelona.html` & `barcelona-training.html`)
  - Beijing (`beijing.html` & `beijing-training.html`)
  - Berlin (`berlin.html` & `berlin-training.html`)
  - Buenos Aires (`buenosaires.html` & `buenosaires-training.html`)
  - Havana (`havana.html` & `havana-training.html`)
  - Houston (`houston.html` & `houston-training.html`)
  - Iceland (`iceland.html` & `iceland-training.html`)
  - London (`london.html` & `london-training.html`)
  - Mexico (`mexico.html` & `mexico-training.html`)
  - Monaco (`monaco.html` & `monaco-training.html`)
  - New Orleans (`neworleans.html` & `neworleans-training.html`)
  - Saint Petersburg (`saintpetersburg.html` & `saintpetersburg-training.html`)
  - San Francisco (`sanfrancisco.html` & `sanfrancisco-training.html`)
  - Winter Holiday (`winterholiday.html` & `winterholiday-training.html`)
  - Zurich (`zurich.html` & `zurich-training.html`)
  - Pogo & Random KZN Modes

- **Gameplay Modes:**
  - **Classic:** Original Subway Surfers experience with coin tracking and leaderboards.
  - **Training:** Limitless practice mode to master jumps, maneuvers, and movement timings.

- **Integrated Tool Suite (Volt Assets):**
  - Custom in-game popup UI and settings menu
  - NoCoin system and Poki SDK stubs
  - Configurable hotkeys & cheat key bindings
  - Admin tools, audio hooks, and live performance monitoring (FPS counter)

- **Built-in Local Servers:**
  - Node.js development server (`src/local-server.js`)
  - Lightweight Python server (`src/server.py`)

---

## 📁 Project Structure

```text
voltmapsv1.1/
├── README.md
├── .gitignore
└── src/
    ├── api/                 # Serverless endpoints (e.g. verification)
    ├── data/                # Cheat key bindings and configurations
    ├── local-server.js      # Local development server in Node.js
    ├── server.py            # Local development server in Python
    ├── vercel.json          # Deployment configuration for Vercel
    └── public/              # Public web root directory
        ├── index.html       # Landing page & city selector
        ├── barcelona.html   # Launcher for Barcelona
        ├── *.html           # Launchers for each city & training mode
        ├── Build/           # Compiled Unity WebGL builds & data assets
        ├── js/              # Unity loaders and stub scripts
        ├── css/             # User interface styling
        ├── images/          # Thumbnails and city previews
        └── volt-assets/     # Volt suite modules, overlays, and configs
```

---

## 🚀 Quick Start (Local Development)

### Option 1 — Using Node.js
1. Navigate to the `src` directory:
   ```bash
   cd src
   npm install
   node local-server.js
   ```
2. Open your browser at the displayed address (defaults to `http://localhost:3000` or `http://localhost:8080`).

### Option 2 — Using Python
If you have Python installed:
```bash
cd src
python server.py
```

### Option 3 — Using any Static HTTP Server
You can also use `npx serve` or the VS Code *Live Server* extension pointing directly to the `src/public` folder:
```bash
npx serve src/public
```

---

## 🌐 Deployment

This project includes a ready-to-use `src/vercel.json` configuration. To deploy on **Vercel**:
1. Import this repository into your Vercel account.
2. Set the Root Directory to `src` (or keep the repository root depending on your routing setup).
3. Click **Deploy**.

---

## 📜 Disclaimer & License

This project is created for educational, research, and preservation purposes only. All intellectual property, trademarks, and assets related to Subway Surfers belong to Kiloo and SYBO Games.
