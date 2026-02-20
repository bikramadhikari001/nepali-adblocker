/**
 * Import/Export — backup and restore extension settings.
 */

const EXPORT_KEYS = [
    "nepali_adblocker_whitelist",
    "nepali_adblocker_custom_rules",
    "nepali_adblocker_enabled",
];

export interface ExportData {
    version: string;
    exportedAt: string;
    whitelist: string[];
    customRules: string;
    enabled: boolean;
}

/**
 * Export all settings as JSON.
 */
export async function exportSettings(): Promise<ExportData> {
    const syncData = await chrome.storage.sync.get("nepali_adblocker_whitelist");
    const localData = await chrome.storage.local.get([
        "nepali_adblocker_custom_rules",
        "nepali_adblocker_enabled",
    ]);

    return {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        whitelist: (syncData["nepali_adblocker_whitelist"] as string[]) || [],
        customRules: (localData["nepali_adblocker_custom_rules"] as string) || "",
        enabled: localData["nepali_adblocker_enabled"] !== false,
    };
}

/**
 * Import settings from JSON data.
 */
export async function importSettings(data: ExportData): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        if (!data.version) {
            return { success: false, error: "Invalid backup format" };
        }

        // Import whitelist
        if (Array.isArray(data.whitelist)) {
            await chrome.storage.sync.set({
                nepali_adblocker_whitelist: data.whitelist,
            });
        }

        // Import custom rules
        if (typeof data.customRules === "string") {
            await chrome.storage.local.set({
                nepali_adblocker_custom_rules: data.customRules,
            });
        }

        // Import enabled state
        if (typeof data.enabled === "boolean") {
            await chrome.storage.local.set({
                nepali_adblocker_enabled: data.enabled,
            });
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
}

/**
 * Download settings as a JSON file.
 */
export function downloadAsFile(data: ExportData): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `nepali-adblocker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();

    URL.revokeObjectURL(url);
}
