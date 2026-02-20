/**
 * Popup script — communicates with service worker to show stats and controls.
 */

const tabCountEl = document.getElementById("tab-count")!;
const totalCountEl = document.getElementById("total-count")!;
const siteDomainEl = document.getElementById("site-domain")!;
const powerBtn = document.getElementById("power-btn")!;
const whitelistBtn = document.getElementById("whitelist-btn")!;
const optionsBtn = document.getElementById("options-btn")!;

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
        const hostname = new URL(url).hostname;
        return hostname.replace(/^www\./, "");
    } catch {
        return "—";
    }
}

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

        tabCountEl.textContent = String(response.tabCount);
        totalCountEl.textContent = formatNumber(response.totalBlocked);

        // Update power button state
        if (response.enabled) {
            powerBtn.classList.add("active");
            powerBtn.classList.remove("inactive");
            document.body.classList.remove("disabled");
        } else {
            powerBtn.classList.remove("active");
            powerBtn.classList.add("inactive");
            document.body.classList.add("disabled");
        }

        // Update whitelist button state
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

function formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return String(n);
}

// ── Event Listeners ─────────────────────────────────────────────────────────

powerBtn.addEventListener("click", async () => {
    const response = await chrome.runtime.sendMessage({ type: "TOGGLE_GLOBAL" });
    await updateUI();
});

whitelistBtn.addEventListener("click", async () => {
    const tab = await getCurrentTab();
    if (!tab?.url) return;
    const domain = extractDomain(tab.url);

    await chrome.runtime.sendMessage({
        type: "TOGGLE_WHITELIST",
        data: { domain },
    });

    // Reload the tab to apply changes
    if (tab.id) {
        chrome.tabs.reload(tab.id);
    }

    await updateUI();
});

optionsBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
});

// ── Initialize ──────────────────────────────────────────────────────────────

updateUI();
