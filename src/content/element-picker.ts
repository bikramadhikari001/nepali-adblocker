/**
 * Element Picker — uBO-style point-and-click element hiding tool.
 * Activated from the popup via chrome.runtime.sendMessage.
 */

let isActive = false;
let highlightEl: HTMLElement | null = null;
let selectedEl: HTMLElement | null = null;
let toolbar: HTMLElement | null = null;

const HIGHLIGHT_COLOR = "rgba(233, 69, 96, 0.35)";
const HIGHLIGHT_BORDER = "2px solid #e94560";

// ── Overlay Highlight ───────────────────────────────────────────────────────

function createHighlight(): HTMLElement {
    const el = document.createElement("div");
    el.id = "nepali-ab-picker-highlight";
    el.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 2147483646;
    background: ${HIGHLIGHT_COLOR};
    border: ${HIGHLIGHT_BORDER};
    border-radius: 3px;
    transition: all 0.08s ease;
    display: none;
  `;
    document.documentElement.appendChild(el);
    return el;
}

function createToolbar(): HTMLElement {
    const bar = document.createElement("div");
    bar.id = "nepali-ab-picker-toolbar";
    bar.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
    background: #1a1a2e;
    color: #eee;
    padding: 12px 20px;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    border: 1px solid rgba(255,255,255,0.1);
  `;
    bar.innerHTML = `
    <span style="font-weight:600;">🎯 Element Picker</span>
    <span id="nepali-ab-picker-selector" style="color:#e94560; font-family:monospace; max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Hover over an element</span>
    <button id="nepali-ab-picker-block" style="padding:6px 14px; border-radius:8px; border:none; background:#e94560; color:white; font-weight:600; cursor:pointer; font-size:12px;">Block</button>
    <button id="nepali-ab-picker-zap" style="padding:6px 14px; border-radius:8px; border:none; background:#ff6b81; color:white; font-weight:600; cursor:pointer; font-size:12px;">Zap</button>
    <button id="nepali-ab-picker-cancel" style="padding:6px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.2); background:transparent; color:#aab; cursor:pointer; font-size:12px;">✕</button>
  `;
    document.documentElement.appendChild(bar);
    return bar;
}

// ── Selector Generation ─────────────────────────────────────────────────────

function generateSelector(el: HTMLElement): string {
    // Try ID first
    if (el.id && !el.id.startsWith("nepali-ab")) {
        return `#${CSS.escape(el.id)}`;
    }

    // Try unique class combination
    const classes = Array.from(el.classList).filter(
        (c) => !c.startsWith("nepali-ab")
    );
    if (classes.length > 0) {
        const classSelector = classes.map((c) => `.${CSS.escape(c)}`).join("");
        if (document.querySelectorAll(classSelector).length <= 3) {
            return classSelector;
        }
    }

    // Build path
    const parts: string[] = [];
    let current: HTMLElement | null = el;
    let depth = 0;

    while (current && current !== document.body && depth < 4) {
        let part = current.tagName.toLowerCase();

        if (current.id && !current.id.startsWith("nepali-ab")) {
            part = `#${CSS.escape(current.id)}`;
            parts.unshift(part);
            break;
        }

        const significantClasses = Array.from(current.classList)
            .filter((c) => !c.startsWith("nepali-ab"))
            .slice(0, 2);
        if (significantClasses.length > 0) {
            part += significantClasses.map((c) => `.${CSS.escape(c)}`).join("");
        }

        parts.unshift(part);
        current = current.parentElement;
        depth++;
    }

    return parts.join(" > ");
}

// ── Event Handlers ──────────────────────────────────────────────────────────

function onMouseMove(e: MouseEvent): void {
    if (!isActive || !highlightEl) return;

    const target = e.target as HTMLElement;

    // Don't highlight our own UI
    if (target.closest("#nepali-ab-picker-toolbar") || target.id?.startsWith("nepali-ab")) {
        return;
    }

    selectedEl = target;
    const rect = target.getBoundingClientRect();

    highlightEl.style.display = "block";
    highlightEl.style.top = `${rect.top}px`;
    highlightEl.style.left = `${rect.left}px`;
    highlightEl.style.width = `${rect.width}px`;
    highlightEl.style.height = `${rect.height}px`;

    // Update selector display
    const selectorEl = document.getElementById("nepali-ab-picker-selector");
    if (selectorEl) {
        selectorEl.textContent = generateSelector(target);
    }
}

function onMouseClick(e: MouseEvent): void {
    if (!isActive) return;

    const target = e.target as HTMLElement;

    // Don't intercept clicks on our toolbar
    if (target.closest("#nepali-ab-picker-toolbar")) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
}

async function blockElement(): Promise<void> {
    if (!selectedEl) return;

    const selector = generateSelector(selectedEl);
    const domain = window.location.hostname.replace(/^www\./, "");
    const rule = `${domain}##${selector}`;

    // Save to custom rules
    const result = await chrome.storage.local.get("nepali_adblocker_custom_rules");
    const existing = result["nepali_adblocker_custom_rules"] || "";
    const updated = existing ? `${existing}\n${rule}` : rule;
    await chrome.storage.local.set({ nepali_adblocker_custom_rules: updated });

    // Hide the element immediately
    selectedEl.style.setProperty("display", "none", "important");

    // Inject a permanent CSS rule
    const style = document.createElement("style");
    style.setAttribute("data-nepali-adblocker", "picker-rule");
    style.textContent = `${selector} { display: none !important; }`;
    document.head?.appendChild(style);

    deactivate();
}

function zapElement(): void {
    if (!selectedEl) return;
    selectedEl.remove();
    deactivate();
}

// ── Activate / Deactivate ───────────────────────────────────────────────────

export function activate(): void {
    if (isActive) return;
    isActive = true;

    highlightEl = createHighlight();
    toolbar = createToolbar();

    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onMouseClick, true);

    // Button handlers
    document.getElementById("nepali-ab-picker-block")?.addEventListener("click", blockElement);
    document.getElementById("nepali-ab-picker-zap")?.addEventListener("click", zapElement);
    document.getElementById("nepali-ab-picker-cancel")?.addEventListener("click", deactivate);

    // ESC to cancel
    document.addEventListener("keydown", onKeyDown);
}

function onKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") deactivate();
}

export function deactivate(): void {
    isActive = false;

    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onMouseClick, true);
    document.removeEventListener("keydown", onKeyDown);

    highlightEl?.remove();
    toolbar?.remove();
    highlightEl = null;
    toolbar = null;
    selectedEl = null;
}

// ── Listen for activation message from popup/background ─────────────────────

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "ACTIVATE_PICKER") {
        activate();
    } else if (message.type === "DEACTIVATE_PICKER") {
        deactivate();
    }
});
