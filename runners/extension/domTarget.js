import { actSendText } from "./domActions.js";
import { snapshotCurrentResponse, extractResponse } from "./responseExtractor.js";
import { llmShortenMessage } from "./llmUiActions.js";
import { state } from "./state.js";

const SHORTEN_MAX_RETRIES = 3;
const PAUSE_POLL_MS = 300;

/**
 * Creates a DOM-backed target adapter conforming to core's AgentTarget interface.
 * tabId: Chrome tab ID to operate on
 * frameId: frame ID where the chat input lives (resolved by chatLocator)
 * plan: { inputSelector: string, submit: { method: "enter"|"click", buttonSelector?: string } }
 * readerCfg: LLM config for message shortening (reader model)
 */
export function createDomTarget(tabId, frameId, plan, readerCfg) {
  return {
    async send(prompt) {
      // Honor pause: block until unpaused or stopped
      while (state.pauseRequested && !state.OPFOR_STOP) {
        await sleep(PAUSE_POLL_MS);
      }

      // Honor stop
      if (state.OPFOR_STOP) {
        throw domTargetStopError();
      }

      // Pre-send snapshot (used for diff extraction)
      const prevSnapshot = await snapshotCurrentResponse(tabId, frameId);

      // Try to send; handle message_too_long with LLM shortening
      let textToSend = prompt;
      let sendResult = null;

      for (let attempt = 0; attempt <= SHORTEN_MAX_RETRIES; attempt++) {
        sendResult = await actSendText(tabId, frameId, {
          ...plan,
          text: textToSend,
        });

        if (sendResult.ok) break;

        if (sendResult.error === "message_too_long" && attempt < SHORTEN_MAX_RETRIES) {
          const maxLen = sendResult.maxLength ?? Math.floor(textToSend.length * 0.8);
          try {
            textToSend = await llmShortenMessage(readerCfg, prompt, maxLen);
          } catch {
            // If shortening fails, hard-truncate as fallback
            textToSend = prompt.slice(0, maxLen);
          }
          continue;
        }

        // Non-recoverable send error
        throw new Error(`DomTarget send failed: ${sendResult.error ?? "unknown error"}`);
      }

      if (!sendResult?.ok) {
        throw new Error("DomTarget send failed after all shortening retries");
      }

      // Poll for response
      const extraction = await extractResponse(
        tabId,
        frameId,
        textToSend,
        prevSnapshot?.text ?? ""
      );

      if (!extraction.ok) {
        throw new Error(`DomTarget extract failed: no response received`);
      }

      return extraction.text ?? "";
    },

    close() {
      // No-op: DOM session has no persistent connection to close
    },
  };
}

/**
 * Creates a tagged stop error that orchestrator.js can detect at the top level
 * to trigger its existing partial-result persistence path.
 */
export function domTargetStopError() {
  return Object.assign(new Error("OPFOR_STOP requested"), { code: "OPFOR_STOP" });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
