/**
 * Options page script — handles tabs, whitelist management, custom rules.
 */

// ── Tab navigation ──────────────────────────────────────────────────────────

const tabs = document.querySelectorAll<HTMLButtonElement>(".tab");
const tabContents = document.querySelectorAll<HTMLElement>(".tab-content");

tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        const target = tab.dataset.tab!;

        tabs.forEach((t) => t.classList.remove("active"));
        tabContents.forEach((c) => c.classList.remove("active"));

        tab.classList.add("active");
        document.getElementById(target)!.classList.add("active");

        // Load data for the tab
        if (target === "whitelist") loadWhitelist();
        if (target === "custom-rules") loadCustomRules();
    });
});

// ── Whitelist management ────────────────────────────────────────────────────

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
      <button class="btn-remove" data-domain="${domain}" title="Remove from whitelist">✕</button>
    `;
        whitelistSites.appendChild(li);
    }

    // Attach remove handlers
    document.querySelectorAll<HTMLButtonElement>(".btn-remove").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const domain = btn.dataset.domain!;
            await chrome.runtime.sendMessage({
                type: "REMOVE_WHITELIST",
                data: { domain },
            });
            await loadWhitelist();
        });
    });
}

// ── Custom rules ────────────────────────────────────────────────────────────

const CUSTOM_RULES_KEY = "nepali_adblocker_custom_rules";
const customRulesInput = document.getElementById("custom-rules-input") as HTMLTextAreaElement;
const saveRulesBtn = document.getElementById("save-rules")!;
const saveStatus = document.getElementById("save-status")!;

async function loadCustomRules(): Promise<void> {
    const result = await chrome.storage.local.get(CUSTOM_RULES_KEY);
    customRulesInput.value = result[CUSTOM_RULES_KEY] || "";
}

saveRulesBtn.addEventListener("click", async () => {
    const rules = customRulesInput.value;
    await chrome.storage.local.set({ [CUSTOM_RULES_KEY]: rules });

    saveStatus.textContent = "✓ Saved!";
    saveStatus.classList.add("visible");
    setTimeout(() => {
        saveStatus.classList.remove("visible");
    }, 2000);
});

// ── Initialize ──────────────────────────────────────────────────────────────

loadWhitelist();
