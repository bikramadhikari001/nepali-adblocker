/**
 * Network Request Logger
 * Records all blocked requests for display in the options page.
 */

const LOG_KEY = "nepali_adblocker_request_log";
const MAX_LOG_SIZE = 500;

export interface LogEntry {
    timestamp: number;
    url: string;
    type: string;
    ruleId: number;
    rulesetId: string;
    tabId: number;
    blocked: boolean;
}

/**
 * Add a log entry.
 */
export async function addLogEntry(entry: LogEntry): Promise<void> {
    const result = await chrome.storage.local.get(LOG_KEY);
    const log: LogEntry[] = (result[LOG_KEY] as LogEntry[]) || [];

    log.unshift(entry);

    // Cap the log size
    if (log.length > MAX_LOG_SIZE) {
        log.length = MAX_LOG_SIZE;
    }

    await chrome.storage.local.set({ [LOG_KEY]: log });
}

/**
 * Get all log entries (newest first).
 */
export async function getLog(): Promise<LogEntry[]> {
    const result = await chrome.storage.local.get(LOG_KEY);
    return (result[LOG_KEY] as LogEntry[]) || [];
}

/**
 * Clear all log entries.
 */
export async function clearLog(): Promise<void> {
    await chrome.storage.local.set({ [LOG_KEY]: [] });
}
