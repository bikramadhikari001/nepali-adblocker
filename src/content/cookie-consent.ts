/**
 * Cookie Consent Auto-Dismiss
 * Automatically hides or clicks away cookie consent banners.
 * Combines CSS hiding (instant) + JS clicking (for persistent ones).
 */

// ── CSS Selectors for common cookie consent frameworks ──────────────────────

const COOKIE_BANNER_SELECTORS: string[] = [
    // Common frameworks
    "#cookie-notice",
    "#cookie-consent",
    "#cookie-banner",
    "#cookie-popup",
    "#cookieConsent",
    "#cookie-law-info-bar",
    "#cookie-bar",
    ".cookie-notice",
    ".cookie-consent",
    ".cookie-banner",
    ".cookie-popup",
    ".cookie-bar",
    ".cc-window",
    ".cc-banner",
    ".cc-overlay",
    '[class*="cookie-consent"]',
    '[class*="cookie-banner"]',
    '[class*="cookie-notice"]',
    '[class*="cookie-popup"]',
    '[id*="cookie-consent"]',
    '[id*="cookie-banner"]',
    '[id*="cookie-notice"]',

    // GDPR / Privacy frameworks
    "#gdpr-banner",
    "#gdpr-consent",
    ".gdpr-banner",
    ".gdpr-consent",
    '[class*="gdpr"]',
    ".privacy-banner",
    ".privacy-notice",
    ".consent-banner",
    ".consent-popup",
    '[class*="consent-banner"]',
    '[class*="consent-popup"]',

    // CMP (Consent Management Platforms)
    "#cmpbox",
    "#cmpbox2",
    ".cmp-container",
    ".cmp-modal",
    "#sp_message_container",
    '[id^="sp_message"]',
    ".qc-cmp-showing",
    ".qc-cmp2-container",
    "#onetrust-consent-sdk",
    "#onetrust-banner-sdk",
    ".onetrust-pc-dark-filter",
    ".ot-sdk-container",
    "#truste-consent-track",
    "#truste-consent-content",
    '[class*="evidon"]',
    "#_evidon_banner",
    "#_evidon-barrier-wrapper",

    // Overlay / Backdrop
    ".cookie-overlay",
    ".consent-overlay",
    '[class*="cookie-backdrop"]',
    ".cookie-modal-backdrop",
];

// ── Click targets for dismiss/reject buttons ────────────────────────────────

const DISMISS_BUTTON_SELECTORS: string[] = [
    // Reject / Decline
    '[class*="cookie"] [class*="reject"]',
    '[class*="cookie"] [class*="decline"]',
    '[class*="cookie"] [class*="deny"]',
    '[class*="cookie"] [class*="refuse"]',
    '[class*="consent"] [class*="reject"]',
    '[class*="consent"] [class*="decline"]',
    '[class*="consent"] [class*="deny"]',
    'button[data-action="reject"]',
    'button[data-action="decline"]',
    "#onetrust-reject-all-handler",
    ".js-reject-cookies",
    ".cc-deny",
    ".cc-dismiss",

    // Close / Dismiss / Accept necessary only
    '[class*="cookie"] [class*="close"]',
    '[class*="cookie"] [class*="dismiss"]',
    '[class*="cookie"] [class*="accept-necessary"]',
    '[class*="cookie"] [class*="necessary-only"]',
    '[class*="consent"] [class*="close"]',
    '[class*="consent"] [class*="dismiss"]',
    'button[class*="cookie-close"]',
    ".cookie-notice .close",
    ".cookie-banner .close",
    "#cookie-notice .dismiss",

    // Generic close buttons inside cookie containers
    '[class*="cookie"] button[aria-label="Close"]',
    '[class*="consent"] button[aria-label="Close"]',
    '[id*="cookie"] button[aria-label="Close"]',
];

// ── Inject CSS to hide banners immediately ──────────────────────────────────

function injectCookieHideCSS(): void {
    const css = COOKIE_BANNER_SELECTORS.join(",\n") +
        ` {\n  display: none !important;\n  visibility: hidden !important;\n  opacity: 0 !important;\n  pointer-events: none !important;\n  height: 0 !important;\n  max-height: 0 !important;\n  overflow: hidden !important;\n}\n` +
        // Also remove any body scroll locks that consent popups add
        `\nbody.cookie-modal-open,\nbody.modal-open-cookie,\nbody[style*="overflow: hidden"] {\n  overflow: auto !important;\n}\n`;

    const style = document.createElement("style");
    style.setAttribute("data-nepali-adblocker", "cookie-consent");
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
}

// ── Auto-click dismiss/reject buttons ───────────────────────────────────────

function tryClickDismiss(): boolean {
    for (const selector of DISMISS_BUTTON_SELECTORS) {
        const btn = document.querySelector<HTMLElement>(selector);
        if (btn && isVisible(btn)) {
            btn.click();
            return true;
        }
    }
    return false;
}

function isVisible(el: HTMLElement): boolean {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && getComputedStyle(el).display !== "none";
}

// ── Observer for dynamically loaded consent banners ─────────────────────────

function setupCookieObserver(): void {
    let clickAttempts = 0;
    const MAX_ATTEMPTS = 10;

    const observer = new MutationObserver(() => {
        if (clickAttempts < MAX_ATTEMPTS) {
            if (tryClickDismiss()) {
                clickAttempts++;
            }
        } else {
            observer.disconnect();
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
    });

    // Stop observing after 10 seconds to save resources
    setTimeout(() => observer.disconnect(), 10000);
}

// ── Initialize ──────────────────────────────────────────────────────────────

export function initCookieConsent(): void {
    injectCookieHideCSS();

    // Try immediate click
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            tryClickDismiss();
            setupCookieObserver();
        });
    } else {
        tryClickDismiss();
        setupCookieObserver();
    }

    // Retry after a delay (some banners load late)
    setTimeout(tryClickDismiss, 1500);
    setTimeout(tryClickDismiss, 3000);
}
