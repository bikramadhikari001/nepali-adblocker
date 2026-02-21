/**
 * Content script: cosmetic filtering.
 * Hides ad elements on the page using CSS selectors from the filter list.
 * Runs at document_start for immediate blocking.
 */

// ── Cosmetic rules for Nepali sites ─────────────────────────────────────────

// Global cosmetic selectors (apply to all sites)
const GLOBAL_SELECTORS: string[] = [
    ".adsbygoogle",
    "ins.adsbygoogle",
    '[id^="google_ads_iframe"]',
    '[id^="div-gpt-ad"]',
    '[id^="google_ads"]',
    ".google-auto-placed",
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="googlesyndication.com"]',
    'iframe[src*="googleadservices.com"]',
    ".ad-container",
    ".ad-wrapper",
    ".ad-banner",
    ".ad-slot",
    ".sidebar-ad",
    ".top-ad",
    ".bottom-ad",
    ".ads-section",
    ".sponsored-post",
    '[id*="adsaro"]',
    '[class*="adsaro"]',
    'a[href*="adsaronepal.com.np"]',
    'a[href*="admana.net"]',
];

// Site-specific cosmetic selectors
const SITE_SELECTORS: Record<string, string[]> = {
    "onlinekhabar.com": [
        ".ok-ad",
        ".ok-ads-wrapper",
        ".ok-ad-container",
        ".ads-banner-wrap",
        ".ok-billboard",
        ".ok-sidebar-ad",
        ".ok-sticky-ad",
        '#ok-ad-top',
        ".inner-ad-wrap",
        ".ad-above-fold",
        ".sponsored-content",
    ],
    "ekantipur.com": [
        ".ad-unit",
        ".advertisement-label",
        ".ek-ad-wrapper",
        ".sidebar-advertisement",
        ".article-ad",
        ".banner-ad",
        ".ek-billboard",
        ".story-ad",
    ],
    "setopati.com": [
        ".full-bigyaapan",
        ".bigyaapan-item",
        ".mobile-bigyaapan-only",
        ".desktop-bigyaapan-only",
        ".footer-fixed-bigyaapan",
        ".sticky-footer-bigyaapan",
        ".top-main-ads",
        ".mast-head-ad",
    ],
    "nagariknews.com": [
        ".nagarik-ad",
        ".ad-area",
        ".sidebar-ad-block",
        ".top-ad-area",
        ".in-article-ad",
    ],
    "ratopati.com": [
        ".rato-ad",
        ".ad-block",
        ".sidebar-ads",
        ".top-ads",
        ".in-article-ad",
    ],
    "hamropatro.com": [
        ".hp-ad",
        ".ad-section",
        ".patro-ads",
        ".sidebar-ad-unit",
    ],
    "dcnepal.com": [
        ".dc-ad",
        ".widget-ad",
        ".entry-ad",
        ".sidebar-widget-ad",
    ],
    "himalkhabar.com": [
        ".himal-ad",
        ".ad-wrapper-block",
        ".news-ad",
    ],
    "krishisanjal.com": [
        ".ks-ad",
        ".ad-block",
    ],
};

// ── Inject cosmetic filter CSS ──────────────────────────────────────────────

function getCurrentDomain(): string {
    return window.location.hostname.replace(/^www\./, "");
}

function buildHideCSS(selectors: string[]): string {
    if (selectors.length === 0) return "";
    return selectors.join(",\n") + " {\n  display: none !important;\n  visibility: hidden !important;\n  height: 0 !important;\n  min-height: 0 !important;\n  max-height: 0 !important;\n  overflow: hidden !important;\n  opacity: 0 !important;\n  pointer-events: none !important;\n}\n";
}

function injectCSS(css: string): void {
    if (!css) return;
    const style = document.createElement("style");
    style.setAttribute("data-nepali-adblocker", "cosmetic");
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
}

function getSelectorsForCurrentSite(): string[] {
    const domain = getCurrentDomain();
    const selectors = [...GLOBAL_SELECTORS];

    // Add site-specific selectors
    for (const [siteDomain, siteSelectors] of Object.entries(SITE_SELECTORS)) {
        if (domain === siteDomain || domain.endsWith("." + siteDomain)) {
            selectors.push(...siteSelectors);
        }
    }

    // Load custom user cosmetic rules from storage
    return selectors;
}

// ── MutationObserver for dynamically injected ads ───────────────────────────

function setupMutationObserver(selectors: string[]): void {
    if (selectors.length === 0) return;
    const combinedSelector = selectors.join(", ");

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLElement) {
                    // Check if the added node itself matches
                    if (node.matches && node.matches(combinedSelector)) {
                        hideElement(node);
                    }
                    // Check children of the added node
                    const children = node.querySelectorAll(combinedSelector);
                    children.forEach((child) => hideElement(child as HTMLElement));
                }
            }
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
}

function hideElement(el: HTMLElement): void {
    el.style.setProperty("display", "none", "important");
    el.style.setProperty("visibility", "hidden", "important");
    el.style.setProperty("height", "0", "important");
    el.style.setProperty("overflow", "hidden", "important");
    el.setAttribute("data-nepali-blocked", "true");
}

// ── Check if blocking is enabled for this site ─────────────────────────────

async function isBlockingEnabled(): Promise<boolean> {
    try {
        const response = await chrome.runtime.sendMessage({
            type: "GET_STATUS",
            data: { tabId: -1, domain: getCurrentDomain() },
        });
        return response && response.enabled && !response.isWhitelisted;
    } catch {
        // If service worker isn't ready yet, default to enabled
        return true;
    }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
    const enabled = await isBlockingEnabled();
    if (!enabled) return;

    const selectors = getSelectorsForCurrentSite();
    const css = buildHideCSS(selectors);
    injectCSS(css);

    // Set up observer once DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            setupMutationObserver(selectors);
        });
    } else {
        setupMutationObserver(selectors);
    }

    // Initialize premium features
    import("./cookie-consent").then((m) => m.initCookieConsent());
    import("./anti-adblock").then((m) => m.initAntiAdblock());
}

init();
