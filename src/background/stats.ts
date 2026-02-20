/**
 * Stats tracker — tracks blocked requests per tab and globally.
 * Persists to chrome.storage.local.
 */

const STATS_KEY = "nepali_adblocker_stats";

export interface BlockStats {
    totalBlocked: number;
    tabCounts: Record<number, number>;
    sessionStart: number;
}

function defaultStats(): BlockStats {
    return {
        totalBlocked: 0,
        tabCounts: {},
        sessionStart: Date.now(),
    };
}

async function getStats(): Promise<BlockStats> {
    const result = await chrome.storage.local.get(STATS_KEY);
    return result[STATS_KEY] || defaultStats();
}

async function saveStats(stats: BlockStats): Promise<void> {
    await chrome.storage.local.set({ [STATS_KEY]: stats });
}

/**
 * Increment the blocked count for a specific tab and globally.
 */
export async function incrementBlocked(tabId: number): Promise<number> {
    const stats = await getStats();
    stats.totalBlocked += 1;
    stats.tabCounts[tabId] = (stats.tabCounts[tabId] || 0) + 1;
    await saveStats(stats);
    return stats.tabCounts[tabId];
}

/**
 * Get the blocked count for a specific tab.
 */
export async function getTabCount(tabId: number): Promise<number> {
    const stats = await getStats();
    return stats.tabCounts[tabId] || 0;
}

/**
 * Get the total blocked count across all tabs.
 */
export async function getTotalBlocked(): Promise<number> {
    const stats = await getStats();
    return stats.totalBlocked;
}

/**
 * Reset the count for a specific tab (e.g., on navigation).
 */
export async function resetTabCount(tabId: number): Promise<void> {
    const stats = await getStats();
    delete stats.tabCounts[tabId];
    await saveStats(stats);
}

/**
 * Reset all stats.
 */
export async function resetAllStats(): Promise<void> {
    await saveStats(defaultStats());
}

/**
 * Update the badge text for a tab with its blocked count.
 */
export async function updateBadge(tabId: number): Promise<void> {
    const count = await getTabCount(tabId);
    const text = count > 0 ? String(count) : "";
    await chrome.action.setBadgeText({ text, tabId });
    await chrome.action.setBadgeBackgroundColor({ color: "#e53935", tabId });
}
