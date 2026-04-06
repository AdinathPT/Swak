# 🚀 SWAK: Chrome Tabs Manager Extension

**AI-Powered Tab Orchestration & Resource Optimization at the Edge.**

SWAK (Project Siraal) is an advanced, privacy-first Chrome Extension designed to intelligently manage browser tabs, detect memory leaks, and optimize system RAM. It leverages Chrome's native on-device AI (Gemini Nano) to automatically categorize tabs, providing a sleek, Figma-inspired dashboard to monitor and control your browser's resource consumption in real time.

-----
## 🌄 Demo
<img width="426" height="745" alt="Screenshot 2026-04-06 071454" src="https://github.com/user-attachments/assets/f5483c35-23cd-4ab7-9f81-c55d16da78df" />
<img width="1919" height="1001" alt="Screenshot 2026-04-06 071801" src="https://github.com/user-attachments/assets/f9bcce02-7f31-4d1a-9d70-0aa20da2dd39" />
<img width="1919" height="1033" alt="Screenshot 2026-04-06 071829" src="https://github.com/user-attachments/assets/3f5b3e50-1b83-4efc-bd32-92593bbeb883" />

## 📽️Video Demo
https://github.com/user-attachments/assets/cae0570c-fa98-413d-b812-bf63b8ff604d

-----

## 🚀 Key Features

  * **🧠 Local AI Tab Grouping:** Automatically categorizes open tabs into logical groups using Chrome's on-device `LanguageModel` API (Gemini Nano). Batch-processing ensures rapid inference without sending any browsing data to the cloud.
  * **🕵️ Active Memory Leak Detection:** A background service worker periodically injects "scout" scripts to monitor DOM node growth across tabs, alerting you to pages that are actively leaking memory over time.
  * **⚡ Resource Orchestrator:** Instantly identify and manage high-resource tabs. The dashboard calculates and displays live metrics for **Sleeping Tabs**, **Heavy RAM Usage**, and **Threat Levels**.
  * **♻️ Auto-Close Duplicates:** Smart URL tracking allows users to instantly identify and wipe out redundant tabs, freeing up workspace and memory with a single click.
  * **🎨 Premium Figma-Like UI:** A dark-themed, highly polished interface featuring real-time Recharts radial gauges, custom neon-blue gradient scrollbars, and dynamic SVG cursors to provide a native-app feel.

-----

## 🛠️ Tech Stack

### Frontend UI (Popup)

  * **ReactJS** + **Vite**: High-performance UI rendering and rapid bundling.
  * **Tailwind CSS**: For modern, responsive, and highly customizable styling.
  * **Recharts**: For rendering the live, dynamic System Resource Gauge.
  * **Custom CSS**: Implementing custom SVG cursors and WebKit scrollbars for a premium UX.

### Background & Extension Infrastructure

  * **Manifest V3**: Modern, secure Chrome Extension architecture.
  * **Service Workers (`background.js`)**: Runs persistent alarms and memory leak detection loops.
  * **Chrome APIs**: Deep integration with `chrome.tabs`, `chrome.scripting`, `chrome.system.memory`, `chrome.alarms`, and `chrome.storage.session`.
  * **Local Edge AI**: `window.ai` / `LanguageModel` for zero-latency, private text processing.
-----
## ⚡ Optimization & Performance Enhancements

Because SWAK operates natively inside the browser using Local Edge-AI, optimizing for low hardware overhead was a critical priority. We successfully implemented the following optimizations to ensure a lightning-fast, lightweight user experience.

### 1. Efficient Algorithms: AI Batching & Eliminating the "Boot Tax"
* **What we improved:** The initial implementation of the local AI tab categorization took upwards of 60 seconds and caused the CPU to spike, threatening to freeze the browser UI.
* **How we improved it:** Large Language Models (like Gemini Nano) scale quadratically $O(n^2)$ due to self-attention mechanisms. Instead of passing 50+ tabs at once, or rebooting the AI session for each individual tab, we implemented an **Array Chunking Architecture**. The extension boots the AI session exactly once into RAM, feeds the tabs in micro-batches of 10, and enforces strict JSON output, drastically reducing output token generation.
* **The Results:** Reduced AI grouping execution time by over **85%** (from ~1 minute to under 10 seconds), entirely eliminated browser UI thread locking, and prevented VRAM overflow on lower-end machines.

### 2. Reduce Memory Usage: Ephemeral Tracking & FIFO Queues
* **What we improved:** The background memory leak detector requires historical DOM sizes to function, which could inadvertently cause a memory leak within the extension itself if the arrays grew infinitely.
* **How we improved it:** We migrated all historical tracker data to `chrome.storage.session` (preventing permanent disk writes) and implemented a strict **FIFO (First-In-First-Out) Queue**. The background script only retains a rolling window of the 3 most recent data points per tab, discarding older data automatically.
* **The Results:** The background Service Worker maintains a near-zero memory footprint (<5MB). It guarantees that no residual data bloats the user's hard drive, as the entire historical ledger is automatically wiped clean the moment the browser is closed.

### 3. Efficient UI Rendering: Derived State & Memoization
* **What we improved:** The primary dashboard processes raw system bytes into Gigabytes, detects red-alert threat tabs, and calculates duplicate URLs via hash maps. Running this math on every render cycle caused the Recharts radial gauges to stutter.
* **How we improved it:** Wrapped the `calculateDashboardStats` helper function inside React's `useMemo` hook. This ensures the dashboard math only executes when the background service worker physically passes a new `tabs` array or `totalRamDetails` object. 
* **The Results:** Reduced computational overhead on the UI thread to `~0.1ms`. The radial charts and CSS gradient scrollbars now render at a locked 60 FPS, completely decoupled from the heavy background data polling.
-----

## 💻 Local Installation Guide

Follow these steps to build and load SWAK directly into your Chrome Browser.

### Prerequisites

  * **Browser:** Google Chrome (Version 127+ recommended for Local AI features).
  * **Node.js:** Version 18+.
  * **Chrome Flags:** On-device AI must be enabled via `chrome://flags` (Enabling Prompt API for Gemini Nano).

### 1\. Clone the Repository

```bash
git clone https://github.com/yourusername/swak-tabs-manager.git
cd swak-tabs-manager
```

## 📂 Project Structure

Here is an overview of the extension's architecture:

```text
swak-tabs-manager/
├── src/                     # 🎨 Frontend React Source Code
│   ├── components/          # Reusable UI (RamRadialCharts, OverallStats)
│   ├── utils/               # Helper scripts (Memory math, AI chunking logic)
│   ├── App.tsx              # Main Dashboard View
│   └── index.css            # Tailwind imports & custom scrollbar/cursor CSS
│
├── public/                  # ⚙️ Extension Configuration & Static Assets
│   ├── manifest.json        # MV3 Configuration and API Permissions
│   ├── background.js        # Service Worker (Memory Leak Alarms)
│   ├── figma-cursor.svg     # Custom UI cursors
│   └── icon-128.png         # Main Extension Icon
│
├── dist/                    # 🚀 Compiled Build Output (Generated by Vite)
│
└── package.json             # Frontend dependencies (React, Recharts, Tailwind)
```

## ⚙️ Setup Guidelines

To run SWAK locally and install it as an unpacked extension in Chrome, follow these steps:

### 1\. Build the Frontend

SWAK uses Vite to bundle the React application.

```bash
# Install all required npm packages
npm install

# Compile the React code and move public files to /dist
npm run build
```

### 2\. Load the Extension into Chrome

1.  Open Google Chrome and navigate to `chrome://extensions/`.
2.  Toggle **Developer mode** ON (top right corner).
3.  Click the **Load unpacked** button (top left).
4.  Select the `dist/` folder that was just generated inside your project directory.

### 3\. Enabling Local AI (Gemini Nano)

To use the AI tab grouping feature, ensure your Chrome browser is configured for edge inference:

1.  Go to `chrome://flags/#prompt-api-for-gemini-nano` and set it to **Enabled**.
2.  Go to `chrome://flags/#optimization-guide-on-device-model` and set it to **Enabled BypassPrefRequirement**.
3.  Relaunch Chrome.

-----

*Developed with ☕ for a faster, cleaner browsing experience.*
