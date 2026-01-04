# MVP PRD: YouTube Aha Catcher

---

### 2. Core Problem
Learners and "curiosity seekers" on YouTube face a friction dilemma: when a meaningful idea ("Aha!" moment) occurs, they must either:
1.  **Stop the flow:** Pause video, switch tabs, and type a note (breaking focus).
2.  **Lose the idea:** Keep watching and hope to remember it later (high data loss).

Current workarounds (screenshots, timestamps, mental notes) are either too manual or lack sufficient context for later review.

---

### 3. Primary User & Context
-   **Primary User:** Desktop YouTube viewer watching educational, podcast, or long-form content.
-   **Context:** Watching in full-screen or theater mode, deeply engaged.
-   **Key Constraints:**
    -   **Zero Interruption:** Cannot require typing, pausing, or looking away from the video.
    -   **Cognitive Load:** The capture action must be practically unconscious.

---

### 4. MVP Goal
**"Enable the user to capture a video moment with a single click, without pausing playback, preserving sufficient context for later review."**

---

### 5. MVP OKRs
-   **Objective 1: Capture ideas with zero friction.**
    -   **KR1:** The capture action must be a single, simple click (or keystroke).
    -   **KR2:** The entire process, from click to context extraction, must be invisible to the user (no popups, no loaders blocking view).

-   **Objective 2: Deliver a useful, actionable follow-up.**
    -   **KR1:** The AI must accurately capture the relevant transcript/context from the video.
    -   **KR2:** The AI must intelligently infer the core "Aha!" moment and perform a relevant background search/enrichment. The result should be a concise note containing the original thought + research summary.
    -   **KR3:** The latency from click to the final note being available for review should be under 2 minutes.

---

### 6. MVP Scope

#### In Scope (Must-have)
-   **Chrome Extension** specifically for `youtube.com`.
-   **Trigger:** Global keyboard shortcut (e.g., `Alt+C`) and a subtle overlay button.
-   **Context Capture:**
    -   Video Title & URL.
    -   Current Timestamp.
    -   **Transcript Extraction:** Automatically fetch text from `[Current Timestamp - 30s]` to `[Current Timestamp]`.
-   **Processing:**
    -   Send extracted transcript to an LLM.
    -   **Inference & Search:** LLM infers the core topic/question and performs a background search (using a tool like Tavily/Exa or internal knowledge) to validate or expand on the idea.
    -   **Synthesis:** Generate a concise note merging the *Video Context* with the *Research Summary*.
-   **Output/Review:**
    -   Extension Popup (or Side Panel) listing all captures in Markdown format.
    -   Format: `[Timestamp] Summary ([Link])`.
    -   "Copy All to Clipboard" button.

#### Out of Scope (Explicitly Excluded)
-   Mobile support or other browsers.
-   Capturing from other sites (Podcasts/Spotify).
-   Voice dictation or manual typing *during* capture.
-   Editing notes *during* capture.
-   Direct API integrations (Notion, Obsidian, Evernote) -> Clipboard only.
-   User accounts/Cloud sync (Local storage only).
-   Complex transcript analysis (e.g., "detect topic change" vs fixed 30s window).

---

### 7. MVP Feasibility & Alternatives

#### Feasibility Assessment
-   **Overall Feasibility:** **High**
-   **Key Factors:**
    -   **Transcript Access:** YouTube transcripts are accessible via DOM scraping or internal APIs. This is the main technical variable.
    -   **LLM Integration:** Simple text-to-text summary is low risk.
    -   **Chrome API:** Standard content injection.

#### Key Risks
1.  **Transcript Unavailability:** Videos without captions/transcripts will fail to generate summaries.
    -   *Mitigation:* Fallback to saving just Timestamp + Title with a "No transcript" tag.
2.  **Context Window Miss:** The "Aha" moment might be 45s ago, not 30s.
    -   *Mitigation:* Stick to 30s for MVP; it's a "marker" to jog memory, not a perfect record.

#### Alternatives Considered
-   **Manual Note Taking:** User types note. *Rejected:* Too much friction/distraction.
-   **Screenshot only:** *Rejected:* Harder to search/process later; text is better for "ideas".

#### Recommendation
Proceed with **Chrome Extension + LLM Summary** approach.

---

### 8. User Stories (MVP Only)

1.  **Capture:** As a viewer, when I hear an interesting point, I want to press a hotkey so that the moment is saved without me stopping the video.
2.  **Context:** As a user, I want the system to automatically grab what was just said (transcript) so I don't have to type it out.
3.  **Review:** As a user, I want to open the extension popup after my video to see a list of my "Aha" moments.
4.  **Export:** As a user, I want to copy all my captured moments as Markdown so I can paste them into my main note-taking app.

---

### 9. Functional Requirements

1.  **Interaction:**
    -   The extension must listen for a configurable keyboard shortcut (default `Alt+A` or `Cmd+Shift+Y`).
    -   Visual feedback upon capture must be minimal (e.g., a small "Saved" toast notification) and transient.
2.  **Data Extraction:**
    -   System must retrieve the current video time `T`.
    -   System must extract available transcript lines from `T-30s` to `T`.
    -   If no transcript is available, save `Title` + `URL` + `Timestamp` only.
3.  **Intelligence:**
    -   System must send the transcript segment to an LLM provider.
    -   **Step A (Identify):** Prompt LLM to "Identify the core 'Aha' insight or question in this transcript."
    -   **Step B (Enrich):** Perform a lightweight search/query (via Exa/Tavily API or LLM knowledge) to add 1-2 sentences of factual context or definition.
    -   **Step C (Synthesize):** Combine original context + enrichment into a final Markdown block.
4.  **Storage & Output:**
    -   **Primary:** Captures must be stored in `chrome.storage.local` for persistence.
    -   **Export:** System must automatically generate/download a `captures.md` file (or append to it) containing all results, ensuring data is accessible on the local filesystem.
5.  **Display:**
    -   Popup must show a chronological list of captures for the current session/video.
    -   Each item: `## [MM:SS] <Generated Summary>`
    -   Clicking the item opens the video at that timestamp.

---

### 10. Non-Functional Requirements
-   **Latency:** The "Capture" UI feedback must appear in < 200ms (even if LLM processing happens in background).
-   **Privacy:** API Keys for LLM (if user-provided) must be stored securely in local storage.

---

### 11. Success Measurement
-   **Primary Metric:** "Captures per Active Video Hour".
-   **Automated Validation Score (Quality Loop):**
    -   **Metadata Accuracy:** URL and Timestamp match video state.
    -   **Transcript Integrity:** Extracted text is non-empty and semantically relevant to the timestamp (cosine similarity check vs ground truth if avail).
    -   **Intelligence Quality:** LLM Output contains both "Summary" and "Question" fields, and response is strictly formatted.
-   **Qualitative:** User feedback on whether the "30-second lookback" captured the *right* context.

---

### 12. Open Questions & Assumptions
-   **Assumption:** Most educational videos have auto-generated captions available.
-   **Assumption:** A fixed 30-second window is statistically "good enough" for most context.
-   **Question:** Should we allow the user to Bring Your Own Key (BYOK) for OpenAI/Anthropic, or host a proxy? *Assumption for MVP: BYOK to save backend complexity.*

