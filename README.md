# YouTube Aha Catcher 🧠

A Chrome Extension for "Zero-Friction" knowledge capture. Instantly save "Aha!" moments from YouTube videos with a single keystroke, complete with context, transcript, and AI-powered enrichment.

![Version](https://img.shields.io/badge/version-1.0.0-blue) ![Status](https://img.shields.io/badge/status-stable-green)

## ✨ Features

-   **Instant Capture:** Press `⌥ + C` (Option + C on Mac) or `Alt + C` to capture the current moment.
-   **Smart Context:** Automatically extracts the last **30 seconds of transcript** and **video description** leading up to your capture.
-   **Robust Fetching:** Uses a multi-layered strategy (Direct Fetch > Innertube API > DOM Scraping) to ensure transcripts are found even on complex video pages.
-   **Dual-Model Intelligence:** 
    -   **English:** Uses **Gemini 2.5 Pro** for deep reasoning and structured insights.
    -   **Original Language:** Uses **DeepSeek** for fast and accurate summarization.
-   **Structured Runs:** Each capture now stores the source metadata once plus an ordered list of AI runs (baseline + refinements). Every run records its `mode`, provided intent (or “Not Provided”), summary, background, and follow-ups so you can compare the base insight to every intent-driven rerun without duplicating transcript data.
-   **Live Progress:** Real-time status updates ("Analysing...") in the popup while AI processing is in progress.
-   **Multi-Select Export:** Select specific "Aha!" moments to copy as Markdown or download as a `.md` report.
-   **Privacy First:** All data is stored locally in your browser (`chrome.storage.local`).

## 🚀 Installation

### Prerequisites
-   Node.js 18+
-   npm

### Build from Source
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm ci
    ```
3.  Build the extension:
    ```bash
    npm run build
    ```
    This creates a `dist/` directory.

### Load into Chrome
1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable **Developer Mode** (top right toggle).
3.  Click **"Load unpacked"**.
4.  Select the `dist/` folder from this project.

## 🛠 Usage

1.  **Configure:** Click the extension icon and enter your AI Builder Token (required for the "Intelligence" summary feature).
2.  **Watch:** Open any YouTube video.
3.  **Capture:** When you hear something interesting, press `Alt+C` (Windows/Linux) or `Cmd+Shift+Y` (Mac).
    *   *Note: You must be logged into YouTube for the most reliable transcript access.*
4.  **Review:** Open the extension popup to see your list of captures.
5.  **Export:** Click "Copy MD" or "Download" to save your notes.

## 🧪 Automated Testing

This project includes a rigorous automated design loop using **Playwright** to verify functionality.

### Running Tests
To verify the extension works correctly (fetches transcripts, handles ads, etc.):

1.  Ensure you have Playwright browsers installed:
    ```bash
    npx playwright install chromium
    ```
2.  Run the evaluation script:
    ```bash
    npm run test:eval
    ```
    *   This launches a visible Chrome browser.
    *   It navigates to a test TED Talk.
    *   It handles cookies and ads automatically.
    *   It triggers a capture and verifies the data integrity.

### Test Architecture
*   **`tests/eval_loop.spec.ts`**: The main test harness. It launches Chrome with the extension loaded, simulating a real user environment.
*   **Transcript Strategy**: The extension uses a priority queue to fetch captions:
    1.  **Direct Fetch:** Fetches XML caption tracks directly from the player metadata.
    2.  **Innertube API:** Intercepts internal YouTube API calls.
    3.  **DOM Automation:** Falls back to clicking the "Show Transcript" button if APIs fail.

## 📁 Project Structure

```
src/
├── pages/
│   ├── background/    # Service Worker (orchestration & storage)
│   ├── content/       # Content Scripts (page interaction & hotkeys)
│   │   ├── mainWorld.ts # Injection for accessing YouTube internal API
│   │   └── index.tsx    # React-based UI overlay (toasts)
│   └── popup/         # Extension Popup UI (React)
├── services/
│   ├── youtube.ts     # Core logic for transcript extraction
│   ├── llm.ts         # AI Builder integration
│   └── storage.ts     # Local persistence layer
```

## 🗂️ Ignored Directories

- `tasks/` contains planning / PRD notes; keep local copies for reference but the files are not distributed with the published extension.
- `tests/` hosts the local vitest/playwright harnesses; they are intentionally excluded from release bundles.

## 📝 License

MIT
