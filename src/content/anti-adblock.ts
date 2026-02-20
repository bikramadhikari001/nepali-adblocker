/**
 * Anti-Adblock Bypass
 * Detects and neutralizes anti-adblock scripts and overlays.
 */

// ── CSS selectors for common anti-adblock overlays ──────────────────────────

const ANTI_ADBLOCK_SELECTORS: string[] = [
    // Common anti-adblock overlay patterns
    '[class*="adblock-notice"]',
    '[class*="adblock-warning"]',
    '[class*="adblock-overlay"]',
    '[class*="adblock-modal"]',
    '[class*="adblock-detected"]',
    '[class*="adblocker-detected"]',
    '[class*="anti-adblock"]',
    '[class*="disable-adblock"]',
    '[id*="adblock-notice"]',
    '[id*="adblock-warning"]',
    '[id*="adblock-overlay"]',
    '[id*="adblock-detected"]',
    '[id*="anti-adblock"]',
    ".adblock-message",
    ".adblock-wall",
    ".ab-detected",
    "#ab-warning",
    "#anti-adb-overlay",
    '[class*="ad-blocker-message"]',
    '[class*="ad-blocker-overlay"]',

    // Nepali site specific (observed patterns)
    ".ekantipur-adblock-notice",
    ".ok-adblock-modal",
    ".seto-adblock-wall",
    '[class*="please-disable"]',
    '[class*="turn-off-adblock"]',
];

// ── Inject anti-adblock CSS ─────────────────────────────────────────────────

function injectAntiAdblockCSS(): void {
    const css = ANTI_ADBLOCK_SELECTORS.join(",\n") +
        ` {\n  display: none !important;\n  visibility: hidden !important;\n  opacity: 0 !important;\n  z-index: -1 !important;\n  pointer-events: none !important;\n}\n`;

    const style = document.createElement("style");
    style.setAttribute("data-nepali-adblocker", "anti-adblock");
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
}

// ── Fake ad elements to fool detection scripts ──────────────────────────────

function injectDecoyAds(): void {
    // Create a fake AdSense element that anti-adblock scripts check for
    const decoy = document.createElement("ins");
    decoy.className = "adsbygoogle";
    decoy.style.cssText = "display: block; position: absolute; left: -9999px; top: -9999px; width: 1px; height: 1px;";
    decoy.setAttribute("data-ad-client", "ca-pub-0000000000000000");
    document.body?.appendChild(decoy);

    // Create another common check target
    const decoyDiv = document.createElement("div");
    decoyDiv.id = "ad-test";
    decoyDiv.className = "ad-banner advertisement textads";
    decoyDiv.style.cssText = "position: absolute; left: -9999px; top: -9999px; width: 1px; height: 1px;";
    document.body?.appendChild(decoyDiv);

    // Fake the window.adsbygoogle push function
    if (typeof window !== "undefined") {
        (window as any).adsbygoogle = (window as any).adsbygoogle || [];
        const origPush = Array.prototype.push;
        (window as any).adsbygoogle.push = function (...args: any[]) {
            // Silently consume ad pushes
            return origPush.apply(this, args);
        };
    }
}

// ── Remove body scroll locks from overlays ──────────────────────────────────

function removeScrollLocks(): void {
    document.body?.classList.remove("no-scroll", "modal-open", "overflow-hidden");
    if (document.body) {
        document.body.style.removeProperty("overflow");
        document.body.style.removeProperty("position");
        document.body.style.removeProperty("height");
    }
    document.documentElement.style.removeProperty("overflow");
}

// ── MutationObserver for dynamically injected anti-adblock overlays ─────────

function setupAntiAdblockObserver(): void {
    const combinedSelector = ANTI_ADBLOCK_SELECTORS.join(", ");

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLElement) {
                    // Check if the added node matches anti-adblock patterns
                    try {
                        if (node.matches && node.matches(combinedSelector)) {
                            node.remove();
                            removeScrollLocks();
                        }
                    } catch { /* ignore selector errors */ }

                    // Check for overlay-style elements
                    const style = getComputedStyle(node);
                    if (
                        style.position === "fixed" &&
                        style.zIndex &&
                        parseInt(style.zIndex) > 9000 &&
                        node.textContent?.toLowerCase().includes("adblock")
                    ) {
                        node.remove();
                        removeScrollLocks();
                    }
                }
            }
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
}

// ── Initialize ──────────────────────────────────────────────────────────────

export function initAntiAdblock(): void {
    injectAntiAdblockCSS();

    const setup = () => {
        injectDecoyAds();
        setupAntiAdblockObserver();
        removeScrollLocks();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setup);
    } else {
        setup();
    }

    // Retry scroll lock removal
    setTimeout(removeScrollLocks, 2000);
    setTimeout(removeScrollLocks, 5000);
}
