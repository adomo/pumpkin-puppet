# 🎃 Pumpkin Puppet Studio

> **Browser-Based Halloween Projection Mapping & Multi-Pumpkin Animatronics**  
> Turn real physical pumpkins into living, talking, and singing characters using your projector, laptop, and browser.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Web Audio API](https://img.shields.io/badge/Web%20Audio%20API-DSP%20Growl%20%26%20Subs-ff7518)](#-halloween-voice--subwoofer-dsp-rack)
[![Canvas 2D](https://img.shields.io/badge/Canvas%202D-8x8%20Bilinear%20Warp-00e5ff)](#-perspective-keystone-projection-mapping)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-orange?logo=buy-me-a-coffee)](https://buymeacoffee.com/4x1EEwZW7J)

---

## 📽️ Overview & Architecture

Pumpkin Puppet is a **100% client-side** dual-screen projection mapping studio. It operates across two synchronized browser windows with **zero backend servers**, **zero login requirements**, and **zero cloud latency**:

```
+------------------------------------+         +-------------------------------------+
|        PROJECTOR / TV SCREEN       |         |         OPERATOR LAPTOP SCREEN      |
|               (/stage)             |         |                (/desk)              |
|                                    |         |                                     |
|   • Pure pitch-black #000000       | <=====> |   • 4-Corner Keystone 2D Pad Pad    |
|   • 8x8 Bilinear Keystone Warper   | Broadcast|   • Voice DSP & Subwoofer Rack      |
|   • Tri-Pumpkin Split Video Engine | Channel |   • Show & Jokes Timeline Conductor |
|   • Additive Particle Effects      |  (0ms)  |   • Profile Manager & Cast Delay    |
+------------------------------------+         +-------------------------------------+
```

1. **The Stage (`/stage`)**: Displayed fullscreen on your HDMI projector or Chromecast. It outputs a pure `#000000` black canvas with no cursor, outlines, or UI chrome.
2. **The Operator Desk (`/desk`)**: Displayed on your laptop screen. Allows you to live-warp faces onto real pumpkins, trigger spoken jokes, arm the microphone, and control video playback.
3. **Cross-Tab Synchronization**: Uses the browser's native `BroadcastChannel` API and `localStorage` to synchronize both screens instantly on the same machine.

---

## ✨ Key Features

### 📐 1. Perspective Keystone Projection Mapping
Real pumpkins on hay bales or front porches are almost never aligned at the same height, distance, or angle.
* **8×8 Bilinear Mesh Warper**: Subdivides each pumpkin face into a perspective mesh mapped to 4 independent corners (`TL`, `TR`, `BR`, `BL`).
* **Independent 3-Pumpkin Transforms**: Fine-tune position ($X, Y$), uniform scale, vertical squash/stretch, rotation, and keystone offsets for Left, Center, and Right pumpkins.
* **Interactive 2D Drag Pad**: Drag corner pins visually on the `/desk` pad or nudge them using keyboard arrow keys.
* **Profile Management**: Save named configurations (e.g. *"Front Porch 3-Pumpkin Setup"*) to recall next Halloween, or export/import profiles as JSON.

### 🎙️ 2. Halloween Voice & Subwoofer DSP Rack
Speak through your laptop microphone and watch the pumpkins speak in real time with a deep Halloween voice:
* **Real-Time Granular Pitch Shifter**: Pitch-shift your voice down by $-6$ to $-12$ semitones.
* **Heavy Subwoofer Power (< 90Hz)**: Low-shelf $+14\text{ dB}$ sub-bass boost with a $+6\text{ dB}$ resonant peak at 60Hz that rattles outdoor subwoofers and soundbars.
* **Pumpkin Cavity Resonance (240Hz)**: Emulates the acoustic chest resonance of a hollow carved pumpkin gourd.
* **Tube Distortion Growl**: Waveshaper soft-clipping saturation that adds an aggressive monster growl.
* **Cavern Echo**: Lowpass feedback delay simulating an underground tomb.

### 🎬 3. Video Projection Show Mode (AtmosFX & Custom Videos)
Play local video files directly while keeping full keystone mapping on your physical pumpkins:
* **Tri-Pumpkin Panoramic Split**: Automatically divides widescreen 16:9 videos (like AtmosFX *Jack-O'-Lantern Jamboree*) into Left ($0\% \to 33\%$), Center ($33\% \to 67\%$), and Right ($67\% \to 100\%$) pumpkin segments.
* **Vertical Start & Height Framing**: Independently adjust vertical positioning (`Vertical Start: 0%–80%`) and height (`Vertical Height: 10%–100%`) for each pumpkin to dial in face framing.
* **Independent Keystone Warping**: Each video pumpkin face maps directly into its assigned pumpkin's 4-corner perspective quad.
* **Radial Edge Softening (Feather Vignette)**: Smooth radial falloff ($0\text{px} \to 50\text{px}$) eliminates rectangular video borders from projecting onto walls or hay bales.
* **Drag-and-Drop Local File Loading**: Drop any `.mp4`, `.mov`, or `.webm` file into the desk for instant local playback via browser memory streams.

### 🎙️ 4. Clean Voice Passthrough & Master Voice Volume Booster
* **Clean 1:1 Voice Passthrough Mode**: Bypass all pitch-shifting, script processors, and DSP filters at the click of a button for testing mic transmission without audio alteration.
* **Master Voice Volume**: 0% to 250% gain booster to ensure voice projection cuts through outdoor ambient sound and projector fan noise.
* **One-Click Speaker Routing**: Toggle voice audio transmission to house speakers instantly.

### 🎭 5. Show & Jokes Conductor
* **Automated Comedy Sketches**: Built-in 3-pumpkin banter routines (`jokes.json`) with synchronized jaw movements, eye saccades, and timed joke punchlines.
* **Procedural Particle Effects**:
  * 🔥 **Flame Mouth & Eyes (`F` / `Shift+F`)**: Turbulent additive-blend fire tongues dancing inside mouth cavities.
  * ❄️ **Freeze & Thaw (`I`)**: Locks jaw open, frosts lips with ice, and shatters on thaw.
  * 💨 **Smoke Breath (`S`)**: Billowing puffs drifting out of mouth.
  * ⚡ **Branching Lightning Arcs (`L`)**: Fractal electric arcs leaping between eyes.
  * 👻 **Soul Wisp (`G`)**: Spectral ectoplasm spirit floating upward.
  * 😱 **Scream (`Shift+S`)**: High-amplitude acoustic shockwave rings with screen jitter.

---

## 🚀 Quickstart & Local Installation

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* Modern web browser (Chrome, Edge, or Brave recommended)

### Setup
```bash
# 1. Clone repository
git clone https://github.com/adomo/pumpkin-puppet.git
cd pumpkin-puppet

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open your browser:
* **Studio Landing Page**: `http://localhost:5173/`
* **Stage Display**: `http://localhost:5173/stage`
* **Operator Desk**: `http://localhost:5173/desk`

---

## 🎃 How to Projection-Map Your Pumpkins

1. **Place 1, 2, or 3 real pumpkins** on hay bales, tables, or stands in front of your projector.
2. **Open `/stage`** on the projector display (press `F11` or `Cmd+Shift+F` for fullscreen).
3. **Open `/desk`** on your laptop or operator monitor.
4. Press **`M`** (or click **Mapping Wireframe**) to project cyan 4-corner perspective wireframes onto the pumpkins.
5. Select a pumpkin (**1: Left**, **2: Center**, or **3: Right**).
6. Drag the corner handles on the **4-Corner Keystone Pinning** pad until the projected face lines up with the physical pumpkin contour.
7. Click **+ Save** to save the mapping as a profile (e.g., *"Front Porch 2026"*).

---

## ⌨️ Keyboard Shortcuts (Active on Both Desk & Stage)

Shortcuts are actively captured on both the **Control Desk** (`/desk`) and the **Stage** (`/stage`):

| Key | Action | Key | Action |
| :--- | :--- | :--- | :--- |
| `1` / `2` / `3` | Focus Left / Center / Right Pumpkin | `A` / `Space` | Arm / Talk Microphone Toggle |
| `M` | Toggle Keystone Wireframe Overlay | `F` | Flame Mouth Particles |
| `Tab` | Cycle Selected Keystone Corner | `Shift+F` | Eye Flames + Mouth Jet (Hold) |
| `7` `8` `9` `0` | Select TL, TR, BL, BR Corner | `I` | Freeze / Thaw Mouth |
| `Arrow Keys` | Nudge Selected Corner / Pumpkin Pos | `S` | Smoke Breath Puff |
| `Shift+Arrows`| Large Nudge Step (16px) | `Shift+S` | Scream + Shockwave Rings |
| `Alt+[` `]` | Scale Uniformly Down / Up | `L` | Double Lightning Eyes Strobe |
| `Alt+Shift+[` `]`| Scale Height Down / Up | `G` | Soul Spirit Wisp Particle |
| `,` `.` | Rotate Pumpkin Left / Right | `Z` | Sleep / Wake Toggle |
| `X` | Reset Active Pumpkin Keystone | `W` | Wink Toward Center |
| `R` | Reset Position, Scale & Rotation | `←` `↓` `→` | Look Left / Center / Right |
| `H` | Toggle Stage Calibration Grid | `C` | Call & Response Sequence |
| `K` | Toggle Black-Level Test Card | `Enter` | Procedural Synth Song Play/Stop |
| `B` / `Esc` | Panic Blackout / Deselect Corner | `[` `]` | Noise Gate Down / Up |
| `-` / `=` | Cast Latency Delay Down / Up | | |

---

## 📋 Latest Updates & Release Notes

* **Vertical Framing for Video Split**: Full vertical positioning (`Vertical Start`) and height (`Vertical Height`) sliders for Left, Center, and Right pumpkins in Tri-Pumpkin Split mode.
* **Friendly Labeling**: Renamed all technical `X` and `Y` coordinates to plain English `Horizontal` and `Vertical` across position, scale, keystone, and crop boundaries.
* **Active Hotkeys on Operator Desk**: Wired all keyboard shortcuts directly to `/desk` so operators can control cues, nudges, and audio without needing to switch focus to the projector window.
* **Clean Mic Passthrough & Master Volume**: Added zero-latency, 1:1 clean microphone transmission testing mode with a dedicated volume booster (0%–250%).

---

## 🌐 Free Deployment to Cloudflare Pages (or Vercel)

Pumpkin Puppet is a static frontend application with zero server dependencies. You can host it globally on Cloudflare Pages for **$0/month** with **unlimited edge bandwidth**:

### Deploying via Cloudflare Pages:
1. Push this repository to your GitHub account.
2. Log into the [Cloudflare Dashboard](https://dash.cloudflare.com/) $\to$ **Workers & Pages** $\to$ **Create application** $\to$ **Pages** $\to$ **Connect to Git**.
3. Select your `pumpkin-puppet` repository.
4. Configure Build Settings:
   * **Framework preset**: `Vite`
   * **Build command**: `npm run build`
   * **Build output directory**: `dist`
5. Click **Save and Deploy**.
6. *(Optional)* Add a custom domain under **Custom Domains** $\to$ Cloudflare provides automatic SSL/TLS encryption.

> **Note on HTTPS**: Modern browsers require HTTPS to grant microphone permissions (`getUserMedia`). Cloudflare Pages and Vercel automatically enforce HTTPS.

---

## ☕ Support & Donations

If this project made your Halloween display, party, or front porch trick-or-treat experience unforgettable, consider buying a coffee to support future spooky updates and features!

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-orange?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/4x1EEwZW7J)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free for personal and commercial Halloween installations.
