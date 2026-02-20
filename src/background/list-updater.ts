/**
 * Filter List Auto-Updater
 * Fetches updated filter lists from remote URLs on a schedule.
 */

const LIST_UPDATE_KEY = "nepali_adblocker_list_updates";
const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface ListSource {
    id: string;
    name: string;
    url: string;
    enabled: boolean;
}

interface ListUpdateRecord {
    id: string;
    lastUpdated: number;
    etag?: string;
    ruleCount: number;
}

// ── Default remote list sources ─────────────────────────────────────────────

const DEFAULT_LISTS: ListSource[] = [
    {
        id: "nepali-ads",
        name: "Nepali Ads Filter",
        url: "https://raw.githubusercontent.com/nicedayzhu/piholeList4Nepalese/refs/heads/master/NepaliAdServerList/adlist.txt",
        enabled: true,
    },
    {
        id: "easylist",
        name: "EasyList",
        url: "https://easylist.to/easylist/easylist.txt",
        enabled: true,
    },
    {
        id: "easyprivacy",
        name: "EasyPrivacy",
        url: "https://easylist.to/easylist/easyprivacy.txt",
        enabled: true,
    },
    {
        id: "annoyances",
        name: "Fanboy's Annoyance List",
        url: "https://secure.fanboy.co.nz/fanboy-annoyance.txt",
        enabled: false, // Optional
    },
];

// ── Fetch and parse a remote filter list ────────────────────────────────────

async function fetchList(source: ListSource, lastEtag?: string): Promise<{
    content: string;
    etag?: string;
    changed: boolean;
} | null> {
    try {
        const headers: Record<string, string> = {};
        if (lastEtag) {
            headers["If-None-Match"] = lastEtag;
        }

        const response = await fetch(source.url, { headers });

        if (response.status === 304) {
            return { content: "", etag: lastEtag, changed: false };
        }

        if (!response.ok) {
            console.warn(`[ListUpdater] Failed to fetch ${source.name}: ${response.status}`);
            return null;
        }

        const content = await response.text();
        const etag = response.headers.get("etag") || undefined;

        return { content, etag, changed: true };
    } catch (err) {
        console.warn(`[ListUpdater] Error fetching ${source.name}:`, err);
        return null;
    }
}

// ── Get update records ──────────────────────────────────────────────────────

async function getUpdateRecords(): Promise<Record<string, ListUpdateRecord>> {
    const result = await chrome.storage.local.get(LIST_UPDATE_KEY);
    return (result[LIST_UPDATE_KEY] as Record<string, ListUpdateRecord>) || {};
}

async function saveUpdateRecord(record: ListUpdateRecord): Promise<void> {
    const records = await getUpdateRecords();
    records[record.id] = record;
    await chrome.storage.local.set({ [LIST_UPDATE_KEY]: records });
}

// ── Check and update all lists ──────────────────────────────────────────────

export async function checkForUpdates(): Promise<{
    updated: string[];
    failed: string[];
}> {
    const records = await getUpdateRecords();
    const updated: string[] = [];
    const failed: string[] = [];

    for (const source of DEFAULT_LISTS) {
        if (!source.enabled) continue;

        const record = records[source.id];
        const now = Date.now();

        // Skip if recently updated
        if (record && now - record.lastUpdated < UPDATE_INTERVAL_MS) {
            continue;
        }

        const result = await fetchList(source, record?.etag);

        if (!result) {
            failed.push(source.name);
            continue;
        }

        if (result.changed && result.content) {
            // Store the raw list content
            await chrome.storage.local.set({
                [`nepali_adblocker_list_${source.id}`]: result.content,
            });

            // Count rules (non-comment, non-empty lines)
            const ruleCount = result.content
                .split("\n")
                .filter((l) => l.trim() && !l.startsWith("!") && !l.startsWith("["))
                .length;

            await saveUpdateRecord({
                id: source.id,
                lastUpdated: now,
                etag: result.etag,
                ruleCount,
            });

            updated.push(source.name);
        } else {
            // Not changed but update timestamp
            await saveUpdateRecord({
                id: source.id,
                lastUpdated: now,
                etag: result.etag,
                ruleCount: record?.ruleCount || 0,
            });
        }
    }

    return { updated, failed };
}

// ── Get info about all lists ────────────────────────────────────────────────

export async function getListInfo(): Promise<
    Array<{
        id: string;
        name: string;
        enabled: boolean;
        lastUpdated: number;
        ruleCount: number;
    }>
> {
    const records = await getUpdateRecords();

    return DEFAULT_LISTS.map((source) => {
        const record = records[source.id];
        return {
            id: source.id,
            name: source.name,
            enabled: source.enabled,
            lastUpdated: record?.lastUpdated || 0,
            ruleCount: record?.ruleCount || 0,
        };
    });
}

// ── Schedule periodic updates ───────────────────────────────────────────────

export function scheduleUpdates(): void {
    // Check on startup
    checkForUpdates().then(({ updated, failed }) => {
        if (updated.length > 0) {
            console.log(`[ListUpdater] Updated: ${updated.join(", ")}`);
        }
        if (failed.length > 0) {
            console.warn(`[ListUpdater] Failed: ${failed.join(", ")}`);
        }
    });

    // Use chrome.alarms for periodic checking
    chrome.alarms.create("list-update", {
        periodInMinutes: 60 * 6, // Check every 6 hours
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === "list-update") {
            checkForUpdates();
        }
    });
}
