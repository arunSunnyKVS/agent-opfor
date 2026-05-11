function isVisible(el) {
  const rect = el.getBoundingClientRect?.();
  if (!rect) return true;
  // Some chat launchers are small (icon buttons). Keep a lower threshold.
  if (rect.width < 10 || rect.height < 10) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
}

function escapeCssValue(v) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(v);
  return String(v).replace(/["\\]/g, "\\$&");
}

function selectorFromEl(el) {
  if (!(el instanceof Element)) return null;
  const testid = el.getAttribute("data-testid");
  if (testid) return `[data-testid="${escapeCssValue(testid)}"]`;
  const aria = el.getAttribute("aria-label");
  if (aria) return `${el.tagName.toLowerCase()}[aria-label="${escapeCssValue(aria)}"]`;
  const id = el.getAttribute("id");
  if (id) return `#${escapeCssValue(id)}`;
  const name = el.getAttribute("name");
  if (name) return `${el.tagName.toLowerCase()}[name="${escapeCssValue(name)}"]`;
  return el.tagName.toLowerCase();
}

function* walkNodes(root) {
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    yield node;

    if (node instanceof Element) {
      if (node.shadowRoot) stack.push(node.shadowRoot);
      const children = node.children;
      for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
      continue;
    }

    if (
      node instanceof ShadowRoot ||
      node instanceof Document ||
      node instanceof DocumentFragment
    ) {
      const children = node.children || node.childNodes;
      if (!children) continue;
      for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
    }
  }
}

function queryAllDeep(selector) {
  const results = [];
  for (const node of walkNodes(document)) {
    if (!(node instanceof Element)) continue;
    try {
      if (node.matches(selector)) results.push(node);
    } catch {
      // ignore invalid selector in matches()
    }
  }
  return results;
}

function deepPathSelector(el) {
  if (!(el instanceof Element)) return null;
  const parts = [selectorFromEl(el)];
  let cur = el;
  while (cur) {
    const root = cur.getRootNode?.();
    if (root instanceof ShadowRoot) {
      parts.unshift(`shadow(${selectorFromEl(root.host)})`);
      cur = root.host;
      continue;
    }
    break;
  }
  return parts.join(" >> ");
}

function isEmbeddedChatComposer(el) {
  if (!(el instanceof Element)) return false;
  const cls = (el.className || "").toString().toLowerCase();
  if (cls.includes("composer") || cls.includes("chat-input") || cls.includes("message-input"))
    return true;
  if (
    el.closest?.(
      "[class*='chat-window' i], [class*='chat__window' i], [class*='conversation' i], " +
        "[class*='chat-widget' i], [id*='chatbot' i], [id*='chat-widget' i]"
    )
  )
    return true;
  return false;
}

/** True when el is inside a fixed/sticky container anchored to the lower half of the viewport. */
function isInFloatingContainer(el) {
  let p = el instanceof Element ? el.parentElement : null;
  for (let i = 0; i < 8 && p instanceof Element; i++, p = p.parentElement) {
    try {
      const st = window.getComputedStyle(p);
      if (st.position === "fixed" || st.position === "sticky") {
        const rect = p.getBoundingClientRect();
        if (rect && rect.bottom > window.innerHeight * 0.35) return true;
      }
    } catch {}
  }
  return false;
}

function looksLikeSiteSearch(el) {
  if (!(el instanceof Element)) return false;
  // Never treat embedded chat composers as site search.
  if (isEmbeddedChatComposer(el)) return false;

  const type = (el.getAttribute("type") || "").toLowerCase();
  const role = (el.getAttribute("role") || "").toLowerCase();
  if (type === "search") return true;
  if (role === "searchbox") return true;

  const name = (el.getAttribute("name") || "").toLowerCase();
  const id = (el.id || "").toLowerCase();
  const placeholder = (el.getAttribute("placeholder") || "").toLowerCase();
  const aria = (el.getAttribute("aria-label") || "").toLowerCase();

  if (/^(q|query|keyword|search|find|st)$/.test(name) || /\b(search|query)\b/.test(id)) return true;
  if (
    placeholder.includes("search") &&
    !placeholder.includes("message") &&
    !placeholder.includes("chat")
  )
    return true;
  if (aria.includes("search") && !aria.includes("message") && !aria.includes("chat")) return true;

  let p = el.parentElement;
  for (let i = 0; i < 10 && p; i++) {
    const tag = p.tagName?.toLowerCase();
    const pr = p.getAttribute?.("role")?.toLowerCase() || "";
    const cls = (p.className || "").toString().toLowerCase();
    const pid = (p.id || "").toLowerCase();
    if (pr === "search" || tag === "header") return true;
    if (
      cls.includes("header-search") ||
      cls.includes("site-search") ||
      cls.includes("global-search")
    )
      return true;
    if (/\bsearch\b/.test(pid) && !pid.includes("chat")) return true;
    p = p.parentElement;
  }
  return false;
}

function scoreInput(el) {
  let score = 0;
  const tag = el.tagName.toLowerCase();
  const type = (el.getAttribute("type") || "").toLowerCase();
  const role = (el.getAttribute("role") || "").toLowerCase();
  const formRole = el.closest?.("form")?.getAttribute?.("role")?.toLowerCase?.() || "";
  const aria = (el.getAttribute("aria-label") || "").toLowerCase();
  const placeholder = (el.getAttribute("placeholder") || "").toLowerCase();
  const name = (el.getAttribute("name") || "").toLowerCase();
  const id = (el.id || "").toLowerCase();
  const cls = (el.className || "").toString().toLowerCase();
  const blob = `${aria} ${placeholder} ${name} ${id} ${cls}`.trim();

  if (!isVisible(el)) score -= 5;

  // Help-center site search — never prefer over a chat composer
  if (looksLikeSiteSearch(el)) score -= 40;

  // Generic chat-composer context signals
  if (cls.includes("composer") || cls.includes("chat-input") || cls.includes("message-input"))
    score += 20;
  if (isInFloatingContainer(el)) score += 12;
  const chatAncestor = el.closest?.(
    "[class*='chat' i], [class*='conversation' i], [class*='messenger' i], [class*='widget' i], " +
      "[id*='chat' i], [id*='bot' i], [id*='assistant' i], [id*='widget' i]"
  );
  if (chatAncestor && !looksLikeSiteSearch(el)) score += 10;

  if (tag === "textarea") score += 5;
  if (tag === "input" && (type === "text" || type === "")) score += 3;
  if (el.isContentEditable) score += 4;
  if (role === "textbox") score += 2;
  if (blob.includes("message")) score += 4;
  if (blob.includes("chat")) score += 3;
  if (blob.includes("prompt")) score += 2;
  if (blob.includes("compose")) score += 2;
  if (blob.includes("comment")) score += 1;
  // Strongly de-rank search bars
  if (type === "search") score -= 8;
  if (role === "searchbox") score -= 10;
  if (formRole === "search") score -= 8;
  if (blob.includes("search")) score -= 6;
  if (blob.includes("password")) score -= 10;

  // Header/nav search regions (unless clearly chat-labeled)
  if (!blob.includes("chat") && !blob.includes("message")) {
    if (el.closest?.("header, [role='banner'], nav")) score -= 15;
  }

  const rect = el.getBoundingClientRect?.();
  if (rect) {
    const yRatio = rect.top / Math.max(1, window.innerHeight);
    if (yRatio > 0.55) score += 2;
    // Site search often lives in top band
    if (yRatio < 0.22 && looksLikeSiteSearch(el)) score -= 10;
  }
  return score;
}

function describeEl(el) {
  const tag = el.tagName.toLowerCase();
  const attrs = [];
  for (const k of ["id", "name", "role", "aria-label", "placeholder", "data-testid"]) {
    const v = el.getAttribute?.(k);
    if (v) attrs.push(`${k}="${String(v).slice(0, 80)}"`);
  }
  const cls = (el.getAttribute?.("class") || "").trim();
  if (cls) attrs.push(`class="${cls.split(/\s+/).slice(0, 6).join(" ")}"`);
  const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80);
  const textPart = text ? ` text="${text}"` : "";
  return `<${tag} ${attrs.join(" ")}>${textPart}`.trim();
}

function scoreChatSignals() {
  let score = 0;

  const logs = queryAllDeep("[role='log']").filter((el) => el instanceof Element && isVisible(el));
  for (const el of logs) {
    const ariaLabel = (el.getAttribute("aria-label") || "").toLowerCase();
    const ariaLive = (el.getAttribute("aria-live") || "").toLowerCase();
    if (ariaLive) score += 2;
    if (ariaLabel.includes("chat")) score += 6;
    if (ariaLabel.includes("message")) score += 4;
    if (ariaLabel.includes("messages")) score += 4;
    score += 1;
  }

  // Generic chat container patterns — visible elements only (prevents false positives from hidden widgets)
  const visibleChatContainers = queryAllDeep(
    "[class*='chat-window' i], [class*='conversation' i], [class*='message-list' i], " +
      "[class*='transcript' i], [class*='chatlog' i], [id*='chatbot' i], [id*='chat-widget' i]"
  ).filter((el) => el instanceof Element && isVisible(el));
  score += Math.min(20, visibleChatContainers.length * 4);

  // Visible chat input signals (composers, not site search)
  const visibleChatInputs = queryAllDeep(
    "textarea[placeholder*='message' i], textarea[aria-label*='message' i], " +
      "[class*='chat-input' i], [class*='composer' i], [class*='message-input' i]"
  ).filter((el) => el instanceof Element && isVisible(el));
  score += Math.min(20, visibleChatInputs.length * 8);

  // Bot / assistant message bubbles
  const visibleBotBubbles = queryAllDeep(
    "[class*='bot-message' i], [class*='assistant-message' i], [class*='from-bot' i], " +
      "[data-message-author-role='assistant'], [data-from='agent'], [data-from='bot']"
  ).filter((el) => el instanceof Element && isVisible(el));
  score += Math.min(15, visibleBotBubbles.length * 5);

  // Common chat semantics
  const ariaChatBoxes = Array.from(queryAllDeep("[aria-label]"))
    .filter((el) => el instanceof Element && isVisible(el))
    .map((el) => (el.getAttribute("aria-label") || "").toLowerCase());
  for (const s of ariaChatBoxes) {
    if (s.includes("chat messages")) score += 8;
    if (s.includes("chat")) score += 1;
  }

  // Some vendors use role markers in classes (best-effort)
  const roleAssistant = queryAllDeep("[class*='role-assistant' i], [class*='assistant' i]").length;
  if (roleAssistant) score += Math.min(6, roleAssistant);

  // Message list structures
  const ols = queryAllDeep("ol li").length;
  if (ols > 5) score += 2;

  return score;
}

function collectSanitizedDomSnapshot() {
  const lines = [];
  lines.push(`frame_url="${location.href}"`);

  const chatScore = scoreChatSignals();
  const chatLogs = Array.from(queryAllDeep("[role='log']")).filter(
    (el) => el instanceof Element && isVisible(el)
  );
  const embeddedChatNotes = [];
  const visibleTranscripts = queryAllDeep(
    "[class*='conversation' i], [class*='message-list' i], [class*='transcript' i], [class*='chatlog' i]"
  ).filter((el) => el instanceof Element && isVisible(el));
  if (visibleTranscripts.length) {
    embeddedChatNotes.push(
      "- pattern=chat_transcript visible — this IS the chat UI (not site search); pick input near this container"
    );
  }
  const visibleComposers = queryAllDeep(
    "textarea[placeholder*='message' i], [class*='chat-input' i], [class*='composer' i], [class*='message-input' i]"
  ).filter((el) => el instanceof Element && isVisible(el));
  if (visibleComposers.length) {
    embeddedChatNotes.push(
      "- chat composer input is visible; look for an adjacent send/submit button to pair with it"
    );
  }
  if (chatLogs.length || embeddedChatNotes.length) {
    lines.push("");
    lines.push("CHAT_SIGNALS:");
    for (const el of chatLogs.slice(0, 6)) {
      const ariaLabel = el.getAttribute("aria-label");
      lines.push(
        `- selector="${deepPathSelector(el)}" role="log" aria-label="${String(ariaLabel || "").slice(0, 120)}" ${describeEl(el)}`
      );
    }
    for (const note of embeddedChatNotes) lines.push(note);
  }

  const inputs = Array.from(
    queryAllDeep("textarea, input, [contenteditable='true'], [role='textbox']")
  )
    .filter((el) => el instanceof Element && isVisible(el))
    .filter((el) => {
      if (el instanceof HTMLInputElement) {
        const t = (el.type || "").toLowerCase();
        if (
          [
            "hidden",
            "checkbox",
            "radio",
            "file",
            "submit",
            "button",
            "range",
            "color",
            "date",
            "datetime-local",
          ].includes(t)
        )
          return false;
        if (t === "password") return false;
      }
      return true;
    });

  lines.push("");
  lines.push("CANDIDATE_INPUTS:");
  for (const el of inputs.slice(0, 40)) {
    const rect = el.getBoundingClientRect?.();
    const pos = rect
      ? `pos=${Math.round(rect.left)},${Math.round(rect.top)} size=${Math.round(rect.width)}x${Math.round(rect.height)}`
      : "";
    const ss = looksLikeSiteSearch(el) ? " site_search_hint=1" : "";
    lines.push(
      `- score=${scoreInput(el)}${ss} selector="${deepPathSelector(el)}" ${pos} ${describeEl(el)}`
    );
  }

  const buttons = Array.from(queryAllDeep("button, [role='button'], input[type='submit']"))
    .filter((el) => el instanceof Element && isVisible(el))
    .slice(0, 60);

  function isProbablyFloatingWidget(el) {
    if (!(el instanceof Element)) return false;
    const style = window.getComputedStyle(el);
    const pos = style.position;
    if (pos !== "fixed" && pos !== "sticky") return false;
    const rect = el.getBoundingClientRect?.();
    if (!rect) return false;
    if (rect.width < 24 || rect.height < 24) return false;
    if (rect.width > window.innerWidth * 0.7 || rect.height > window.innerHeight * 0.7)
      return false;
    const nearRight = rect.right > window.innerWidth * 0.6;
    const nearBottom = rect.bottom > window.innerHeight * 0.6;
    if (!nearRight || !nearBottom) return false;
    return true;
  }

  function scoreFloatingWidget(el) {
    const aria = (el.getAttribute?.("aria-label") || "").toLowerCase();
    const title = (el.getAttribute?.("title") || "").toLowerCase();
    const id = (el.getAttribute?.("id") || "").toLowerCase();
    const cls = (el.getAttribute?.("class") || "").toLowerCase();
    const text = (el.textContent || "").trim().replace(/\s+/g, " ").toLowerCase();
    const blob = `${aria} ${title} ${id} ${cls} ${text}`.trim();
    let s = 0;
    if (blob.includes("chat") || blob.includes("message") || blob.includes("assistant")) s += 8;
    if (blob.includes("support") || blob.includes("help")) s += 4;
    if (/intercom|zendesk|drift|genesys|salesforce|qualified|ada|forethought/i.test(blob)) s += 3;
    if (blob.includes("contact") || blob.includes("email")) s -= 4;
    if (blob.includes("cookie")) s -= 6;
    const rect = el.getBoundingClientRect?.();
    if (rect) {
      const area = rect.width * rect.height;
      if (area >= 900 && area <= 90_000) s += 2;
      if (rect.right > window.innerWidth * 0.9 && rect.bottom > window.innerHeight * 0.9) s += 2;
    }
    const tag = el.tagName.toLowerCase();
    if (tag === "button") s += 2;
    if (el.getAttribute?.("role") === "button") s += 1;
    return s;
  }

  const floatingCandidates = Array.from(queryAllDeep("button, [role='button'], a, div"))
    .filter((el) => el instanceof Element && isVisible(el))
    .filter((el) => isProbablyFloatingWidget(el))
    .map((el) => ({ el, score: scoreFloatingWidget(el) }))
    .filter((x) => x.score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const maybeLaunchers = Array.from(queryAllDeep("button, [role='button'], a, summary"))
    .filter((el) => el instanceof Element && isVisible(el))
    .map((el) => {
      const aria = (el.getAttribute?.("aria-label") || "").toLowerCase();
      const title = (el.getAttribute?.("title") || "").toLowerCase();
      const text = (el.textContent || "").trim().replace(/\s+/g, " ").toLowerCase();
      const href = el instanceof HTMLAnchorElement ? String(el.getAttribute("href") || "") : "";
      const blob = `${aria} ${title} ${text}`.trim();
      const looksLikeLauncher =
        blob.includes("chat") ||
        blob.includes("virtual assistant") ||
        blob.includes("live chat") ||
        blob.includes("start chat") ||
        blob.includes("start a conversation") ||
        blob.includes("message us") ||
        blob.includes("need help") ||
        blob.includes("support");
      const seemsLikeNav =
        href && (href.startsWith("http") || href.startsWith("/")) && !href.startsWith("#");
      let score = 0;
      if (looksLikeLauncher) score += 6;
      if (blob.includes("contact us") || blob.includes("contact")) score -= 4;
      if (blob.includes("try it free") || blob.includes("shop") || blob.includes("buy")) score -= 6;
      if (seemsLikeNav) score -= 2;
      return { el, score, href };
    })
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  lines.push("");
  lines.push("CANDIDATE_BUTTONS:");
  for (const el of buttons) {
    const aria = (el.getAttribute?.("aria-label") || "").toLowerCase();
    const text = (el.textContent || "").trim().toLowerCase();
    const looksLikeSend =
      aria.includes("send") || text === "send" || text.includes("send") || text.includes("submit");
    lines.push(
      `- ${looksLikeSend ? "sendish=1" : "sendish=0"} selector="${deepPathSelector(el)}" ${describeEl(el)}`
    );
  }

  if (maybeLaunchers.length) {
    lines.push("");
    lines.push("LIKELY_CHAT_LAUNCHERS:");
    for (const x of maybeLaunchers) {
      const href =
        x.el instanceof HTMLAnchorElement
          ? String(x.el.getAttribute("href") || "").slice(0, 200)
          : "";
      lines.push(
        `- score=${x.score} selector="${deepPathSelector(x.el)}" href="${href}" ${describeEl(x.el)}`
      );
    }
  }

  if (floatingCandidates.length) {
    lines.push("");
    lines.push("FLOATING_WIDGET_CANDIDATES:");
    for (const x of floatingCandidates) {
      const href =
        x.el instanceof HTMLAnchorElement
          ? String(x.el.getAttribute("href") || "").slice(0, 200)
          : "";
      lines.push(
        `- score=${x.score} selector="${deepPathSelector(x.el)}" href="${href}" ${describeEl(x.el)}`
      );
    }
  }

  return {
    ok: true,
    frameUrl: location.href,
    snapshot: lines.join("\n").slice(0, 60_000),
    inputCount: inputs.length,
    chatScore,
  };
}

(() => collectSanitizedDomSnapshot())();
