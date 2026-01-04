# Tasks: YouTube Aha Catcher MVP

## Relevant Files
- `manifest.json` – Extension configuration
- `vite.config.ts` – Build configuration
- `src/manifest.ts` - Manifest generation
- `src/pages/content/index.tsx` – Content script entry
- `src/pages/content/ui/App.tsx` – Content script UI (Overlay)
- `src/pages/background/index.ts` – Background service worker
- `src/pages/popup/Popup.tsx` – Main UI
- `src/services/youtube.ts` – YouTube logic
- `src/services/llm.ts` – AI logic
- `src/services/storage.ts` – Storage logic

## Instructions for Executing Tasks
- Execute tasks in order.
- After completing each sub-task:
  - mark it as completed (`- [x]`)
  - verify outputs match completion criteria
- If execution fails or is blocked:
  - halt further execution
  - clearly report the blocking issue

## Tasks

- [ ] 0.0 Create feature branch
- [ ] 0.1 Create and checkout a new branch (`feature/aha-catcher-mvp`)

- [ ] 1.0 Initialize Chrome Extension Project
- [ ] 1.1 Scaffold project using Vite + React + TypeScript template.
- [ ] 1.2 Install `tailwindcss` and configure for extension (scoped styles).
- [ ] 1.3 Configure `manifest.json` (permissions: `storage`, `activeTab`, `scripting`; host_permissions: `*://*.youtube.com/*`).
- [ ] 1.4 Verify build pipeline (ensure `content`, `background`, and `popup` generate correct assets).

- [ ] 2.0 Implement Capture Triggers (Content Script)
- [ ] 2.1 Create `ContentApp` React component injected into a Shadow DOM on YouTube pages.
- [ ] 2.2 Implement a global keyboard shortcut listener (e.g., `Alt+C`) inside the content script.
- [ ] 2.3 Create a "Capture" FAB (Floating Action Button) component in `ContentApp`.
- [ ] 2.4 Wire triggers to send a `CAPTURE_TRIGGERED` message to the background script.

- [ ] 3.0 Implement YouTube Data Extraction
- [ ] 3.1 Create `src/services/youtube.ts` with `getVideoDetails()` (returns ID, Title, CurrentTime).
- [ ] 3.2 Implement `fetchTranscript(videoId)` function. *Strategy: Attempt to fetch video page data or use internal YouTube API logic to get captions.*
- [ ] 3.3 Implement `getTranscriptSegment(fullTranscript, currentTime)` to extract the T-30s window.
- [ ] 3.4 Integrate extraction logic into the `CAPTURE_TRIGGERED` handler (payload: `{meta, transcript}`).

- [ ] 4.0 Implement Intelligence Pipeline (Background Service)
- [ ] 4.1 Create `src/services/llm.ts` with methods to call OpenAI/Anthropic APIs (using user-provided keys).
- [ ] 4.2 Create `src/services/search.ts` (stub or simple API call to Exa/Tavily).
- [ ] 4.3 Implement `BackgroundManager` to listen for `CAPTURE_TRIGGERED`.
- [ ] 4.4 Implement the processing chain: Receive Payload -> Call LLM (Identify) -> Call Search (Enrich) -> Call LLM (Synthesize).
- [ ] 4.5 Save final result to `chrome.storage.local`.

- [ ] 5.0 Implement Popup UI & Settings
- [ ] 5.1 Create `Settings` component: Inputs for OpenAI Key and Search API Key; save to local storage.
- [ ] 5.2 Create `CaptureFeed` component: Read from storage, display list of captures (Time, Summary, Link).
- [ ] 5.3 Implement "Copy All" functionality (formats list as Markdown).
- [ ] 5.4 Implement "Delete" functionality for individual items.

- [ ] 6.0 End-to-End Testing & Polish
- [ ] 6.1 Verify capture flow on a live YouTube video (with and without captions).
- [ ] 6.2 Verify "Zero Friction" (no UI blocking during capture).
- [ ] 6.3 Verify Data Persistence (reload extension, data remains).
