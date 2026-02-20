/**
 * Background service worker for Nepali Adblocker.
 * Handles:
 *  - Badge counter updates via declarativeNetRequestFeedback
 *  - Message routing from popup/content scripts
 *  - Tab navigation tracking for per-tab stats
 *  - Dynamic rule management for whitelist
 */

import { createWhitelistManager, extractDomain } from "./whitelist";
import {
    incrementBlocked,
    resetTabCount,
    updateBadge,
    getTabCount,
    getTotalBlocked,
} from "./stats";

const whitelist = createWhitelistManager();

// ── Extension Install / Update ──────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        console.log("[Nepali Adblocker] Extension installed.");
        chrome.action.setBadgeBackgroundColor({ color: "#e53935" });
    }
});

// ── Track blocked requests via onRuleMatchedDebug (dev) ─────────────────────

if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
    chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(async (info) => {
        const tabId = info.request.tabId;
        if (tabId > 0) {
            await incrementBlocked(tabId);
            await updateBadge(tabId);
        }
    });
}

// ── Reset tab count on navigation ───────────────────────────────────────────

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (changeInfo.status === "loading") {
        await resetTabCount(tabId);
        await updateBadge(tabId);
    }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
    await resetTabCount(tabId);
});

// ── Dynamic rule management for whitelisted sites ───────────────────────────

async function updateWhitelistRules(): Promise<void> {
    const whitelistedDomains = await whitelist.getAll();

    // Remove existing dynamic whitelist rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const whitelistRuleIds = existingRules
        .filter((r) => r.id >= 100000) // Whitelist rules use IDs 100000+
        .map((r) => r.id);

    const addRules: chrome.declarativeNetRequest.Rule[] = whitelistedDomains.map(
        (domain, index) => ({
            id: 100000 + index,
            priority: 10, // Higher priority than block rules
            condition: {
                initiatorDomains: [domain],
            },
            action: {
                type: "allow" as chrome.declarativeNetRequest.RuleActionType,
            },
        })
    );

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: whitelistRuleIds,
        addRules,
    });
}

// ── Message handling from popup / content scripts ───────────────────────────

export interface Message {
    type: string;
    data?: unknown;
}

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
    handleMessage(message, sender).then(sendResponse);
    return true; // Indicates async response
});

async function handleMessage(
    message: Message,
    _sender: chrome.runtime.MessageSender
): Promise<unknown> {
    switch (message.type) {
        case "GET_STATUS": {
            const data = message.data as { tabId: number; domain: string };
            const isWhitelisted = await whitelist.isWhitelisted(data.domain);
            const tabCount = await getTabCount(data.tabId);
            const totalBlocked = await getTotalBlocked();
            const enabled = await getGlobalEnabled();
            return { isWhitelisted, tabCount, totalBlocked, enabled };
        }

        case "TOGGLE_WHITELIST": {
            const data = message.data as { domain: string };
            const isNowWhitelisted = await whitelist.toggle(data.domain);
            await updateWhitelistRules();
            return { isWhitelisted: isNowWhitelisted };
        }

        case "TOGGLE_GLOBAL": {
            const enabled = await toggleGlobalEnabled();
            return { enabled };
        }

        case "GET_WHITELIST": {
            const domains = await whitelist.getAll();
            return { domains };
        }

        case "REMOVE_WHITELIST": {
            const data = message.data as { domain: string };
            await whitelist.remove(data.domain);
            await updateWhitelistRules();
            return { success: true };
        }

        default:
            return { error: "Unknown message type" };
    }
}

// ── Global enabled state ────────────────────────────────────────────────────

const ENABLED_KEY = "nepali_adblocker_enabled";

async function getGlobalEnabled(): Promise<boolean> {
    const result = await chrome.storage.local.get(ENABLED_KEY);
    return result[ENABLED_KEY] !== false; // Default to enabled
}

async function toggleGlobalEnabled(): Promise<boolean> {
    const current = await getGlobalEnabled();
    const newState = !current;
    await chrome.storage.local.set({ [ENABLED_KEY]: newState });

    // Enable/disable all static rulesets
    const rulesets = await chrome.declarativeNetRequest.getEnabledRulesets();

    if (newState) {
        // Re-enable all rulesets
        await chrome.declarativeNetRequest.updateEnabledRulesets({
            enableRulesetIds: ["nepali_ads", "easylist_mini"],
        });
    } else {
        // Disable all rulesets
        await chrome.declarativeNetRequest.updateEnabledRulesets({
            disableRulesetIds: rulesets,
        });
    }

    // Update icon appearance
    const iconPath = newState
        ? { 16: "src/assets/icon16.png", 48: "src/assets/icon48.png" }
        : { 16: "src/assets/icon16-off.png", 48: "src/assets/icon48-off.png" };

    await chrome.action.setIcon({ path: iconPath });

    return newState;
}

// Initialize whitelist rules on startup
updateWhitelistRules();
