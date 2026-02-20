/**
 * Background service worker for Nepali Adblocker v2.
 * Integrates: stats, whitelist, request logger, list updater, dynamic filtering.
 */

import { createWhitelistManager, extractDomain } from "./whitelist";
import {
    incrementBlocked,
    resetTabCount,
    updateBadge,
    getTabCount,
    getTotalBlocked,
} from "./stats";
import { addLogEntry, getLog, clearLog } from "./request-logger";
import { scheduleUpdates, checkForUpdates, getListInfo } from "./list-updater";
import { exportSettings, importSettings } from "./import-export";

const whitelist = createWhitelistManager();

// ── Extension Install / Update ──────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        console.log("[Nepali Adblocker] Extension installed v2.0");
        chrome.action.setBadgeBackgroundColor({ color: "#e53935" });
    }
    if (details.reason === "update") {
        console.log("[Nepali Adblocker] Extension updated to v2.0");
    }
});

// ── Track blocked requests ──────────────────────────────────────────────────

if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
    chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(async (info) => {
        const tabId = info.request.tabId;
        if (tabId > 0) {
            await incrementBlocked(tabId);
            await updateBadge(tabId);

            // Log the blocked request
            await addLogEntry({
                timestamp: Date.now(),
                url: info.request.url,
                type: info.request.type,
                ruleId: info.rule.ruleId,
                rulesetId: info.rule.rulesetId,
                tabId,
                blocked: true,
            });
        }
    });
}

// ── Tab lifecycle ───────────────────────────────────────────────────────────

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (changeInfo.status === "loading") {
        await resetTabCount(tabId);
        await updateBadge(tabId);
    }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
    await resetTabCount(tabId);
});

// ── Dynamic rule management for whitelist ───────────────────────────────────

async function updateWhitelistRules(): Promise<void> {
    const whitelistedDomains = await whitelist.getAll();
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const whitelistRuleIds = existingRules
        .filter((r) => r.id >= 100000)
        .map((r) => r.id);

    const addRules: chrome.declarativeNetRequest.Rule[] = whitelistedDomains.map(
        (domain, index) => ({
            id: 100000 + index,
            priority: 10,
            condition: { initiatorDomains: [domain] },
            action: { type: "allow" as chrome.declarativeNetRequest.RuleActionType },
        })
    );

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: whitelistRuleIds,
        addRules,
    });
}

// ── Message handling ────────────────────────────────────────────────────────

export interface Message {
    type: string;
    data?: unknown;
}

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
    handleMessage(message, sender).then(sendResponse);
    return true;
});

async function handleMessage(
    message: Message,
    sender: chrome.runtime.MessageSender
): Promise<unknown> {
    switch (message.type) {
        case "GET_STATUS": {
            const data = message.data as { tabId: number; domain: string };
            const tabId = data.tabId > 0 ? data.tabId : (sender.tab?.id || 0);
            const isWhitelisted = await whitelist.isWhitelisted(data.domain);
            const tabCount = await getTabCount(tabId);
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

        // Element Picker
        case "ACTIVATE_PICKER": {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                await chrome.tabs.sendMessage(tab.id, { type: "ACTIVATE_PICKER" });
            }
            return { success: true };
        }

        // Reader Mode
        case "ACTIVATE_READER": {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                await chrome.tabs.sendMessage(tab.id, { type: "ACTIVATE_READER" });
            }
            return { success: true };
        }

        // Network Logger
        case "GET_LOG": {
            const log = await getLog();
            return { log };
        }

        case "CLEAR_LOG": {
            await clearLog();
            return { success: true };
        }

        // List Updater
        case "GET_LIST_INFO": {
            const info = await getListInfo();
            return { lists: info };
        }

        case "UPDATE_LISTS": {
            const result = await checkForUpdates();
            return result;
        }

        // Import/Export
        case "EXPORT_SETTINGS": {
            const settings = await exportSettings();
            return settings;
        }

        case "IMPORT_SETTINGS": {
            const data = message.data as any;
            const importResult = await importSettings(data);
            if (importResult.success) {
                await updateWhitelistRules();
            }
            return importResult;
        }

        default:
            return { error: "Unknown message type" };
    }
}

// ── Global enabled state ────────────────────────────────────────────────────

const ENABLED_KEY = "nepali_adblocker_enabled";

async function getGlobalEnabled(): Promise<boolean> {
    const result = await chrome.storage.local.get(ENABLED_KEY);
    return result[ENABLED_KEY] !== false;
}

async function toggleGlobalEnabled(): Promise<boolean> {
    const current = await getGlobalEnabled();
    const newState = !current;
    await chrome.storage.local.set({ [ENABLED_KEY]: newState });

    const rulesets = await chrome.declarativeNetRequest.getEnabledRulesets();
    if (newState) {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
            enableRulesetIds: ["nepali_ads", "easylist_mini", "trackers"],
        });
    } else {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
            disableRulesetIds: rulesets,
        });
    }

    const iconPath = newState
        ? { 16: "src/assets/icon16.png", 48: "src/assets/icon48.png" }
        : { 16: "src/assets/icon16-off.png", 48: "src/assets/icon48-off.png" };
    await chrome.action.setIcon({ path: iconPath });

    return newState;
}

// ── Initialize ──────────────────────────────────────────────────────────────

updateWhitelistRules();
scheduleUpdates();
