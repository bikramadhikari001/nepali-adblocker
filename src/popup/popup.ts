/**
 * Popup v2 — integrates picker, reader, and animated stats.
 */

const tabCountEl = document.getElementById("tab-count")!;
const totalCountEl = document.getElementById("total-count")!;
const siteDomainEl = document.getElementById("site-domain")!;
const powerBtn = document.getElementById("power-btn")!;
const whitelistBtn = document.getElementById("whitelist-btn")!;
const optionsBtn = document.getElementById("options-btn")!;
const pickerBtn = document.getElementById("picker-btn")!;
const readerBtn = document.getElementById("reader-btn")!;

interface StatusResponse {
    isWhitelisted: boolean;
    tabCount: number;
    totalBlocked: number;
    enabled: boolean;
}

async function getCurrentTab(): Promise<chrome.tabs.Tab | null> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab || null;
}

function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return "—";
    }
}

// ── Animated counter ────────────────────────────────────────────────────────

function animateCount(el: HTMLElement, target: number): void {
    const current = parseInt(el.textContent || "0");
    if (current === target) return;

    const duration = 400;
    const start = performance.now();

    function update(now: number) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const value = Math.round(current + (target - current) * eased);
        el.textContent = formatNumber(value);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return String(n);
}

// ── UI Update ───────────────────────────────────────────────────────────────

async function updateUI(): Promise<void> {
    const tab = await getCurrentTab();
    if (!tab || !tab.url || !tab.id) {
        siteDomainEl.textContent = "—";
        return;
    }

    const domain = extractDomain(tab.url);
    siteDomainEl.textContent = domain;

    try {
        const response: StatusResponse = await chrome.runtime.sendMessage({
            type: "GET_STATUS",
            data: { tabId: tab.id, domain },
        });

        animateCount(tabCountEl, response.tabCount);
        animateCount(totalCountEl, response.totalBlocked);

        if (response.enabled) {
            powerBtn.classList.add("active");
            powerBtn.classList.remove("inactive");
            document.body.classList.remove("disabled");
        } else {
            powerBtn.classList.remove("active");
            powerBtn.classList.add("inactive");
            document.body.classList.add("disabled");
        }

        if (response.isWhitelisted) {
            whitelistBtn.classList.add("whitelisted");
            whitelistBtn.querySelector(".whitelist-text")!.textContent = "Whitelisted";
        } else {
            whitelistBtn.classList.remove("whitelisted");
            whitelistBtn.querySelector(".whitelist-text")!.textContent = "Whitelist";
        }
    } catch (err) {
        console.error("[Popup] Failed to get status:", err);
    }
}

// ── Event Listeners ─────────────────────────────────────────────────────────

powerBtn.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "TOGGLE_GLOBAL" });
    powerBtn.classList.toggle("active");
    powerBtn.classList.toggle("inactive");
    await updateUI();
});

whitelistBtn.addEventListener("click", async () => {
    const tab = await getCurrentTab();
    if (!tab?.url) return;
    const domain = extractDomain(tab.url);
    await chrome.runtime.sendMessage({ type: "TOGGLE_WHITELIST", data: { domain } });
    if (tab.id) chrome.tabs.reload(tab.id);
    await updateUI();
});

pickerBtn.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "ACTIVATE_PICKER" });
    window.close();
});

readerBtn.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "ACTIVATE_READER" });
    window.close();
});

optionsBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
});

// ── Init ────────────────────────────────────────────────────────────────────

updateUI();
