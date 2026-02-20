/**
 * Filter list rule types supported by the parser.
 */
export interface NetworkRule {
    type: "network";
    isException: boolean;
    pattern: string;
    domains?: string[];
    thirdParty?: boolean;
    resourceTypes?: string[];
}

export interface CosmeticRule {
    type: "cosmetic";
    domains: string[];
    selector: string;
    isException: boolean;
}

export type FilterRule = NetworkRule | CosmeticRule;

/**
 * Parse a single filter list line into a FilterRule (or null for comments/empty).
 *
 * Supported ABP/uBO syntax:
 *   - `! comment` → ignored
 *   - `||domain.com^` → network block
 *   - `@@||domain.com^` → network exception
 *   - `domain.com##.ad-class` → cosmetic hide
 *   - `domain.com#@#.ad-class` → cosmetic exception
 *   - `||domain.com^$third-party` → network with options
 */
export function parseFilterLine(line: string): FilterRule | null {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("!") || trimmed.startsWith("[")) {
        return null;
    }

    // Cosmetic exception: domain#@#selector
    const cosmeticExceptionMatch = trimmed.match(
        /^([^#]*?)#@#(.+)$/
    );
    if (cosmeticExceptionMatch) {
        const domains = cosmeticExceptionMatch[1]
            ? cosmeticExceptionMatch[1].split(",").map((d) => d.trim()).filter(Boolean)
            : [];
        return {
            type: "cosmetic",
            domains,
            selector: cosmeticExceptionMatch[2].trim(),
            isException: true,
        };
    }

    // Cosmetic rule: domain##selector
    const cosmeticMatch = trimmed.match(/^([^#]*?)##(.+)$/);
    if (cosmeticMatch) {
        const domains = cosmeticMatch[1]
            ? cosmeticMatch[1].split(",").map((d) => d.trim()).filter(Boolean)
            : [];
        return {
            type: "cosmetic",
            domains,
            selector: cosmeticMatch[2].trim(),
            isException: false,
        };
    }

    // Network rule
    let isException = false;
    let pattern = trimmed;

    // Exception rules start with @@
    if (pattern.startsWith("@@")) {
        isException = true;
        pattern = pattern.slice(2);
    }

    // Parse options after $
    let thirdParty: boolean | undefined;
    let resourceTypes: string[] | undefined;
    let domains: string[] | undefined;
    const dollarIndex = pattern.indexOf("$");

    if (dollarIndex !== -1) {
        const optionsStr = pattern.slice(dollarIndex + 1);
        pattern = pattern.slice(0, dollarIndex);

        const options = optionsStr.split(",");
        for (const opt of options) {
            const trimOpt = opt.trim();
            if (trimOpt === "third-party") {
                thirdParty = true;
            } else if (trimOpt === "~third-party") {
                thirdParty = false;
            } else if (trimOpt.startsWith("domain=")) {
                domains = trimOpt
                    .slice(7)
                    .split("|")
                    .map((d) => d.trim())
                    .filter(Boolean);
            } else if (
                [
                    "script",
                    "image",
                    "stylesheet",
                    "xmlhttprequest",
                    "sub_frame",
                    "font",
                    "media",
                    "websocket",
                    "other",
                ].includes(trimOpt)
            ) {
                if (!resourceTypes) resourceTypes = [];
                resourceTypes.push(trimOpt);
            }
        }
    }

    return {
        type: "network",
        isException,
        pattern,
        domains,
        thirdParty,
        resourceTypes,
    };
}

/**
 * Parse an entire filter list file content into rules.
 */
export function parseFilterList(content: string): FilterRule[] {
    const lines = content.split("\n");
    const rules: FilterRule[] = [];

    for (const line of lines) {
        const rule = parseFilterLine(line);
        if (rule) {
            rules.push(rule);
        }
    }

    return rules;
}

/**
 * Map ABP resource type names to chrome.declarativeNetRequest.ResourceType.
 */
const RESOURCE_TYPE_MAP: Record<string, chrome.declarativeNetRequest.ResourceType> = {
    script: "script" as chrome.declarativeNetRequest.ResourceType,
    image: "image" as chrome.declarativeNetRequest.ResourceType,
    stylesheet: "stylesheet" as chrome.declarativeNetRequest.ResourceType,
    xmlhttprequest: "xmlhttprequest" as chrome.declarativeNetRequest.ResourceType,
    sub_frame: "sub_frame" as chrome.declarativeNetRequest.ResourceType,
    font: "font" as chrome.declarativeNetRequest.ResourceType,
    media: "media" as chrome.declarativeNetRequest.ResourceType,
    websocket: "websocket" as chrome.declarativeNetRequest.ResourceType,
    other: "other" as chrome.declarativeNetRequest.ResourceType,
};

/**
 * Convert a parsed NetworkRule to a chrome.declarativeNetRequest.Rule.
 */
export function networkRuleToDNR(
    rule: NetworkRule,
    id: number
): chrome.declarativeNetRequest.Rule {
    // Build the URL filter from the pattern
    let urlFilter = rule.pattern;

    // Convert ||domain^ syntax to proper urlFilter
    if (urlFilter.startsWith("||")) {
        urlFilter = urlFilter.slice(2);
    }
    if (urlFilter.endsWith("^")) {
        urlFilter = urlFilter.slice(0, -1);
    }

    // Construct the condition
    const condition: chrome.declarativeNetRequest.RuleCondition = {};

    // Use requestDomains for ||domain^ patterns (most common)
    if (rule.pattern.startsWith("||") && !urlFilter.includes("/") && !urlFilter.includes("*")) {
        condition.requestDomains = [urlFilter];
    } else {
        condition.urlFilter = urlFilter;
    }

    if (rule.thirdParty !== undefined) {
        condition.domainType = rule.thirdParty
            ? ("thirdParty" as chrome.declarativeNetRequest.DomainType)
            : ("firstParty" as chrome.declarativeNetRequest.DomainType);
    }

    if (rule.resourceTypes && rule.resourceTypes.length > 0) {
        condition.resourceTypes = rule.resourceTypes
            .map((rt) => RESOURCE_TYPE_MAP[rt])
            .filter(Boolean);
    }

    if (rule.domains && rule.domains.length > 0) {
        const includeDomains: string[] = [];
        const excludeDomains: string[] = [];
        for (const d of rule.domains) {
            if (d.startsWith("~")) {
                excludeDomains.push(d.slice(1));
            } else {
                includeDomains.push(d);
            }
        }
        if (includeDomains.length > 0) condition.initiatorDomains = includeDomains;
        if (excludeDomains.length > 0) condition.excludedInitiatorDomains = excludeDomains;
    }

    const dnrRule: chrome.declarativeNetRequest.Rule = {
        id,
        condition,
        action: rule.isException
            ? { type: "allow" as chrome.declarativeNetRequest.RuleActionType }
            : { type: "block" as chrome.declarativeNetRequest.RuleActionType },
    };

    if (rule.isException) {
        dnrRule.priority = 2; // Exceptions have higher priority
    } else {
        dnrRule.priority = 1;
    }

    return dnrRule;
}
