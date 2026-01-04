# Automated Design & Testing Loop for YouTube Aha Catcher

To ensure the reliability and quality of the "Aha Catcher," we will implement an **Automated Design Loop** using **Playwright**. This loop will simulate user interaction, validate the extraction pipeline, and grade the results against our success criteria.

## 1. Architecture: The "Evals" Pipeline

We will create a dedicated testing script (e.g., `scripts/eval_loop.ts`) that runs outside the extension but controls a browser instance with the extension installed.

### Components
1.  **Driver:** Playwright (Node.js) to launch Chrome with the Extension.
2.  **Controller:** Navigates to YouTube, manages playback, and triggers the capture shortcut.
3.  **Inspector:** Accesses the Extension's background page (Service Worker) to read logs and `chrome.storage.local` directly.
4.  **Grader:** A script that evaluates the captured data against quality metrics.

## 2. The Loop Workflow

1.  **Input:** Accepts a specific YouTube URL or picks a random one from a curated `test_vectors.json`.
2.  **Execution:**
    *   Launch Chrome Context with `path/to/dist` extension loaded.
    *   Navigate to Video URL.
    *   Seek to a specific timestamp (e.g., 50% duration) to ensure transcript availability.
    *   Wait 5 seconds (buffer).
    *   Inject/Press Shortcut (`Alt+C`).
    *   Wait for "Capture Success" signal (toast or storage update).
3.  **Extraction:**
    *   Retrieve the latest entry from `chrome.storage.local` via the Background Worker.
4.  **Grading (The "Review"):**
    *   **Metadata Check:** Does `capture.timestamp` match video time? Is `capture.url` correct?
    *   **Transcript Check:** Is `capture.transcript` > 50 characters? Does it contain forbidden patterns (e.g., "Loading...")?
    *   **Intelligence Check:** Does `capture.summary` exist? Is it distinct from the transcript?
5.  **Reporting:**
    *   Append result to `test_results/eval_log.md`.
    *   If successful, export the formatted "Aha" note to `captured_ahas/` for manual review.

## 3. Implementation Plan

### Prerequisites
-   `npm install -D @playwright/test`

### Pseudo-Code Structure

```typescript
// scripts/eval_loop.ts
import { chromium } from 'playwright';

async function runEval(videoUrl: string) {
  const pathToExtension = 'dist';
  const userDataDir = '/tmp/test-user-data';

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });

  const page = await context.newPage();
  await page.goto(videoUrl);
  
  // Wait for video to be playable
  await page.waitForSelector('video');
  await page.evaluate(() => document.querySelector('video').currentTime = 120); // Seek to 2m

  // Trigger Capture
  console.log('Triggering Capture...');
  await page.keyboard.press('Alt+C');

  // Wait for processing (poll storage)
  // We need to access the background page to read storage
  let backgroundPage = context.backgroundPages()[0];
  if (!backgroundPage) backgroundPage = await context.waitForEvent('backgroundpage');

  const capture = await backgroundPage.evaluate(async () => {
    return new Promise(resolve => {
        // Poll for 10s or wait for message
        // Simplified: Reading storage directly
        chrome.storage.local.get(null, (items) => {
            const captures = items.captures || [];
            resolve(captures[0]); // Get latest
        });
    });
  });

  // Validation
  const report = validateCapture(capture, videoUrl);
  saveReportToMarkdown(report);
  
  await context.close();
}
```

## 4. Success Criteria Mapping

| Component | Success Metric | Automated Check |
| :--- | :--- | :--- |
| **Metadata** | Accurate Time/URL | `abs(capture.time - expected_time) < 2s` |
| **Transcript** | Extracted correctly | `capture.transcript.length > 50` words |
| **Intelligence** | LLM Processed | `capture.enrichment` is not null/empty |
| **Output** | File Exists | Check if `captures.md` was updated (if testing file export) |

## 5. Next Steps
1.  Set up the Playwright harness.
2.  Create the `validateCapture` logic.
3.  Run the loop on 5 test videos.
