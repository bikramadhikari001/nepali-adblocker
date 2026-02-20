/**
 * Whitelist manager — manages per-site ad blocking whitelist.
 * Persists to chrome.storage.sync for cross-device sync.
 */

const STORAGE_KEY = "nepali_adblocker_whitelist";

export interface WhitelistManager {
    isWhitelisted(domain: string): Promise<boolean>;
    add(domain: string): Promise<void>;
    remove(domain: string): Promise<void>;
    toggle(domain: string): Promise<boolean>;
    getAll(): Promise<string[]>;
    clear(): Promise<void>;
}

/**
 * Extract root domain from a hostname.
 * e.g., "www.onlinekhabar.com" → "onlinekhabar.com"
 */
export function extractDomain(hostname: string): string {
    const parts = hostname.replace(/^www\./, "").split(".");
    if (parts.length <= 2) return parts.join(".");
    return parts.slice(-2).join(".");
}

/**
 * Create a whitelist manager backed by chrome.storage.sync.
 */
export function createWhitelistManager(): WhitelistManager {
    async function getWhitelist(): Promise<Set<string>> {
        const result = await chrome.storage.sync.get(STORAGE_KEY);
        const list: string[] = result[STORAGE_KEY] || [];
        return new Set(list);
    }

    async function saveWhitelist(whitelist: Set<string>): Promise<void> {
        await chrome.storage.sync.set({
            [STORAGE_KEY]: Array.from(whitelist),
        });
    }

    return {
        async isWhitelisted(domain: string): Promise<boolean> {
            const whitelist = await getWhitelist();
            return whitelist.has(extractDomain(domain));
        },

        async add(domain: string): Promise<void> {
            const whitelist = await getWhitelist();
            whitelist.add(extractDomain(domain));
            await saveWhitelist(whitelist);
        },

        async remove(domain: string): Promise<void> {
            const whitelist = await getWhitelist();
            whitelist.delete(extractDomain(domain));
            await saveWhitelist(whitelist);
        },

        async toggle(domain: string): Promise<boolean> {
            const whitelist = await getWhitelist();
            const normalizedDomain = extractDomain(domain);
            if (whitelist.has(normalizedDomain)) {
                whitelist.delete(normalizedDomain);
                await saveWhitelist(whitelist);
                return false; // No longer whitelisted
            } else {
                whitelist.add(normalizedDomain);
                await saveWhitelist(whitelist);
                return true; // Now whitelisted
            }
        },

        async getAll(): Promise<string[]> {
            const whitelist = await getWhitelist();
            return Array.from(whitelist);
        },

        async clear(): Promise<void> {
            await chrome.storage.sync.set({ [STORAGE_KEY]: [] });
        },
    };
}
