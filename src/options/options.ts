/**
 * Options page v2 — filter lists, whitelist, custom rules, logger, backup.
 */

import { exportSettings, importSettings, downloadAsFile, ExportData } from "../background/import-export";

// ── Tab Navigation ──────────────────────────────────────────────────────────

const tabs = document.querySelectorAll<HTMLButtonElement>(".tab");
const tabContents = document.querySelectorAll<HTMLElement>(".tab-content");

tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        const target = tab.dataset.tab!;
        tabs.forEach((t) => t.classList.remove("active"));
        tabContents.forEach((c) => c.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(target)!.classList.add("active");

        if (target === "whitelist") loadWhitelist();
        if (target === "custom-rules") loadCustomRules();
        if (target === "request-log") loadRequestLog();
        if (target === "filter-lists") loadFilterLists();
    });
});

// ── Filter Lists ────────────────────────────────────────────────────────────

const listItems = document.getElementById("list-items")!;
const updateBtn = document.getElementById("update-lists")!;
const updateStatus = document.getElementById("update-status")!;

async function loadFilterLists(): Promise<void> {
    const response = await chrome.runtime.sendMessage({ type: "GET_LIST_INFO" });
    const lists = response.lists || [];
    listItems.innerHTML = "";

    for (const list of lists) {
        const lastUpdated = list.lastUpdated
            ? new Date(list.lastUpdated).toLocaleDateString()
            : "Never";

        const div = document.createElement("div");
        div.className = "list-item";
        div.innerHTML = `
      <label>
        <input type="checkbox" ${list.enabled ? "checked" : ""} disabled>
        <strong>${list.name}</strong>
        <span class="list-meta">${list.ruleCount} rules · Updated: ${lastUpdated}</span>
      </label>
    `;
        listItems.appendChild(div);
    }

    // Static built-in lists
    if (lists.length === 0) {
        for (const name of ["Nepali Ads Filter (built-in)", "EasyList Mini (built-in)", "Tracker Blocking (built-in)"]) {
            const div = document.createElement("div");
            div.className = "list-item";
            div.innerHTML = `<label><input type="checkbox" checked disabled><strong>${name}</strong><span class="list-meta">Built-in static rules</span></label>`;
            listItems.appendChild(div);
        }
    }
}

updateBtn.addEventListener("click", async () => {
    updateBtn.textContent = "⏳ Updating...";
    updateBtn.setAttribute("disabled", "true");

    const result = await chrome.runtime.sendMessage({ type: "UPDATE_LISTS" });
    updateBtn.textContent = "🔄 Check for Updates";
    updateBtn.removeAttribute("disabled");

    if (result.updated && result.updated.length > 0) {
        showStatus(updateStatus, `✓ Updated: ${result.updated.join(", ")}`);
    } else {
        showStatus(updateStatus, "✓ All lists are up to date");
    }
    await loadFilterLists();
});

// ── Whitelist ───────────────────────────────────────────────────────────────

const whitelistSites = document.getElementById("whitelist-sites")!;
const whitelistEmpty = document.getElementById("whitelist-empty")!;

async function loadWhitelist(): Promise<void> {
    const response = await chrome.runtime.sendMessage({ type: "GET_WHITELIST" });
    const domains: string[] = response.domains || [];
    whitelistSites.innerHTML = "";

    if (domains.length === 0) {
        whitelistEmpty.style.display = "block";
        return;
    }
    whitelistEmpty.style.display = "none";

    for (const domain of domains) {
        const li = document.createElement("li");
        li.className = "site-list-item";
        li.innerHTML = `
      <span class="site-name">${domain}</span>
      <button class="btn-remove" data-domain="${domain}" title="Remove">✕</button>
    `;
        whitelistSites.appendChild(li);
    }

    document.querySelectorAll<HTMLButtonElement>(".btn-remove").forEach((btn) => {
        btn.addEventListener("click", async () => {
            await chrome.runtime.sendMessage({ type: "REMOVE_WHITELIST", data: { domain: btn.dataset.domain } });
            await loadWhitelist();
        });
    });
}

// ── Custom Rules ────────────────────────────────────────────────────────────

const CUSTOM_RULES_KEY = "nepali_adblocker_custom_rules";
const customRulesInput = document.getElementById("custom-rules-input") as HTMLTextAreaElement;
const saveRulesBtn = document.getElementById("save-rules")!;
const saveStatus = document.getElementById("save-status")!;

async function loadCustomRules(): Promise<void> {
    const result = await chrome.storage.local.get(CUSTOM_RULES_KEY);
    customRulesInput.value = (result[CUSTOM_RULES_KEY] as string) || "";
}

saveRulesBtn.addEventListener("click", async () => {
    await chrome.storage.local.set({ [CUSTOM_RULES_KEY]: customRulesInput.value });
    showStatus(saveStatus, "✓ Saved!");
});

// ── Network Logger ──────────────────────────────────────────────────────────

const logBody = document.getElementById("log-body")!;
const logCount = document.getElementById("log-count")!;
const clearLogBtn = document.getElementById("clear-log")!;

async function loadRequestLog(): Promise<void> {
    const response = await chrome.runtime.sendMessage({ type: "GET_LOG" });
    const log = response.log || [];
    logCount.textContent = `${log.length} entries`;

    if (log.length === 0) {
        logBody.innerHTML = '<tr><td colspan="4" class="empty-msg">No blocked requests logged yet.</td></tr>';
        return;
    }

    logBody.innerHTML = log
        .slice(0, 200)
        .map((entry: any) => {
            const time = new Date(entry.timestamp).toLocaleTimeString();
            const shortUrl = entry.url.length > 60 ? entry.url.slice(0, 57) + "..." : entry.url;
            return `<tr>
        <td class="log-time">${time}</td>
        <td class="log-url" title="${entry.url}">${shortUrl}</td>
        <td class="log-type">${entry.type || "—"}</td>
        <td class="log-rule">${entry.rulesetId}#${entry.ruleId}</td>
      </tr>`;
        })
        .join("");
}

clearLogBtn.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "CLEAR_LOG" });
    await loadRequestLog();
});

// ── Import / Export ─────────────────────────────────────────────────────────

const exportBtn = document.getElementById("export-btn")!;
const importBtn = document.getElementById("import-btn")!;
const importFile = document.getElementById("import-file") as HTMLInputElement;
const importStatus = document.getElementById("import-status")!;

exportBtn.addEventListener("click", async () => {
    const data = await chrome.runtime.sendMessage({ type: "EXPORT_SETTINGS" });
    downloadAsFile(data as ExportData);
});

importBtn.addEventListener("click", () => {
    importFile.click();
});

importFile.addEventListener("change", async () => {
    const file = importFile.files?.[0];
    if (!file) return;

    const text = await file.text();
    try {
        const data = JSON.parse(text);
        const result = await chrome.runtime.sendMessage({ type: "IMPORT_SETTINGS", data });
        if (result.success) {
            showStatus(importStatus, "✓ Imported successfully! Reload to apply.");
        } else {
            showStatus(importStatus, `✗ ${result.error}`);
        }
    } catch {
        showStatus(importStatus, "✗ Invalid JSON file");
    }
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function showStatus(el: HTMLElement, text: string): void {
    el.textContent = text;
    el.classList.add("visible");
    setTimeout(() => el.classList.remove("visible"), 3000);
}

// ── Initialize ──────────────────────────────────────────────────────────────

loadFilterLists();
loadWhitelist();
