/**
 * Clean Reading Mode — Nepali news article reader.
 * Extracts article content and presents in a clean, beautiful format.
 * Specifically designed for Nepali/Devanagari typography.
 */

// ── Site-specific article extractors ────────────────────────────────────────

interface ArticleData {
    title: string;
    author: string;
    date: string;
    content: string;
    siteName: string;
    imageUrl?: string;
}

const EXTRACTORS: Record<string, () => ArticleData | null> = {
    "onlinekhabar.com": () => extractGeneric({
        title: "h1.ok__post-title, h1.entry-title, article h1",
        author: ".ok__author-name, .author-name, .post-author",
        date: ".ok__post-date, .post-date, time",
        content: ".ok__post-content, .entry-content, article .post-content",
        image: ".ok__featured-image img, .post-thumbnail img, article img",
    }),
    "ekantipur.com": () => extractGeneric({
        title: "h1.article-header, h1.story-title, article h1",
        author: ".author-name, .writer-name, .article-author",
        date: ".published-date, time, .article-date",
        content: ".description, .story-content, .article-body",
        image: ".article-image img, .story-image img",
    }),
    "setopati.com": () => extractGeneric({
        title: "h1.news-title, h1.entry-title, article h1",
        author: ".author, .news-author, .reporter",
        date: ".date, .news-date, time",
        content: ".news-content, .entry-content, .news-body",
        image: ".featured-image img, .news-image img",
    }),
    "nagariknews.com": () => extractGeneric({
        title: "h1",
        author: ".author-name, .writer, .reporter-name",
        date: "time, .published-date, .article-date",
        content: ".article-content, .news-detail, .story-body",
        image: ".featured-img img, .article-img img",
    }),
    "ratopati.com": () => extractGeneric({
        title: "h1",
        author: ".author, .writer",
        date: "time, .date",
        content: ".news-content, .article-content, .post-content",
        image: ".featured-image img",
    }),
    "dcnepal.com": () => extractGeneric({
        title: "h1.entry-title, article h1",
        author: ".author, .entry-author",
        date: "time, .entry-date",
        content: ".entry-content, .post-content",
        image: ".post-thumbnail img, .entry-image img",
    }),
};

interface ExtractorSelectors {
    title: string;
    author: string;
    date: string;
    content: string;
    image: string;
}

function extractGeneric(selectors: ExtractorSelectors): ArticleData | null {
    const titleEl = document.querySelector(selectors.title);
    const contentEl = document.querySelector(selectors.content);

    if (!titleEl || !contentEl) return null;

    const authorEl = document.querySelector(selectors.author);
    const dateEl = document.querySelector(selectors.date);
    const imageEl = document.querySelector<HTMLImageElement>(selectors.image);

    return {
        title: titleEl.textContent?.trim() || "",
        author: authorEl?.textContent?.trim() || "",
        date: dateEl?.textContent?.trim() || dateEl?.getAttribute("datetime") || "",
        content: contentEl.innerHTML,
        siteName: window.location.hostname.replace(/^www\./, ""),
        imageUrl: imageEl?.src,
    };
}

// ── Fallback generic extractor ──────────────────────────────────────────────

function extractFallback(): ArticleData | null {
    // Try common article selectors
    const commonSelectors = [
        "article",
        '[role="article"]',
        ".post-content",
        ".entry-content",
        ".article-content",
        ".news-content",
        ".story-content",
        "main .content",
    ];

    let contentEl: Element | null = null;
    for (const sel of commonSelectors) {
        contentEl = document.querySelector(sel);
        if (contentEl) break;
    }

    const titleEl = document.querySelector("h1");
    if (!titleEl || !contentEl) return null;

    return {
        title: titleEl.textContent?.trim() || document.title,
        author: "",
        date: "",
        content: contentEl.innerHTML,
        siteName: window.location.hostname.replace(/^www\./, ""),
    };
}

// ── Reader UI ───────────────────────────────────────────────────────────────

function createReaderView(article: ArticleData): void {
    const overlay = document.createElement("div");
    overlay.id = "nepali-ab-reader";
    overlay.innerHTML = `
    <div class="nar-container">
      <div class="nar-toolbar">
        <span class="nar-logo">📖 Clean Reader</span>
        <div class="nar-controls">
          <button class="nar-btn" id="nar-font-minus" title="Smaller text">A−</button>
          <button class="nar-btn" id="nar-font-plus" title="Larger text">A+</button>
          <button class="nar-btn" id="nar-theme-toggle" title="Toggle dark/light">🌓</button>
          <button class="nar-btn nar-close" id="nar-close" title="Close reader">✕</button>
        </div>
      </div>
      <article class="nar-article">
        <header>
          <h1 class="nar-title">${escapeHtml(article.title)}</h1>
          <div class="nar-meta">
            ${article.author ? `<span class="nar-author">✍️ ${escapeHtml(article.author)}</span>` : ""}
            ${article.date ? `<span class="nar-date">📅 ${escapeHtml(article.date)}</span>` : ""}
            <span class="nar-source">📰 ${escapeHtml(article.siteName)}</span>
          </div>
        </header>
        ${article.imageUrl ? `<img class="nar-hero" src="${escapeHtml(article.imageUrl)}" alt="">` : ""}
        <div class="nar-content">${cleanContent(article.content)}</div>
      </article>
    </div>
  `;

    // Inject styles
    const style = document.createElement("style");
    style.textContent = getReaderCSS();
    overlay.prepend(style);

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    // Event listeners
    document.getElementById("nar-close")?.addEventListener("click", closeReader);
    document.getElementById("nar-font-minus")?.addEventListener("click", () => changeFontSize(-2));
    document.getElementById("nar-font-plus")?.addEventListener("click", () => changeFontSize(2));
    document.getElementById("nar-theme-toggle")?.addEventListener("click", toggleTheme);

    // ESC to close
    document.addEventListener("keydown", onReaderKeyDown);
}

function escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function cleanContent(html: string): string {
    const temp = document.createElement("div");
    temp.innerHTML = html;

    // Remove ads, scripts, styles, iframes, social widgets
    const remove = temp.querySelectorAll(
        'script, style, iframe, .adsbygoogle, [class*="ad-"], [class*="social"], ' +
        '[class*="share"], [class*="related"], [class*="comment"], [class*="sidebar"], ' +
        '[class*="widget"], .sponsored, .advertisement, ins, [class*="newsletter"]'
    );
    remove.forEach((el) => el.remove());

    // Remove empty elements
    const all = temp.querySelectorAll("div, span, p");
    all.forEach((el) => {
        if (!el.textContent?.trim() && !el.querySelector("img")) {
            el.remove();
        }
    });

    return temp.innerHTML;
}

let currentFontSize = 20;
let isDark = true;

function changeFontSize(delta: number): void {
    currentFontSize = Math.max(14, Math.min(32, currentFontSize + delta));
    const content = document.querySelector<HTMLElement>(".nar-content");
    if (content) content.style.fontSize = `${currentFontSize}px`;
}

function toggleTheme(): void {
    isDark = !isDark;
    const reader = document.getElementById("nepali-ab-reader");
    reader?.classList.toggle("nar-light", !isDark);
}

function onReaderKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") closeReader();
}

function closeReader(): void {
    document.getElementById("nepali-ab-reader")?.remove();
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onReaderKeyDown);
}

// ── Reader CSS ──────────────────────────────────────────────────────────────

function getReaderCSS(): string {
    return `
    #nepali-ab-reader {
      position: fixed; inset: 0; z-index: 2147483647;
      background: #0d1117; color: #e6edf3;
      overflow-y: auto; font-family: 'Noto Sans Devanagari', 'Mukta', -apple-system, sans-serif;
    }
    #nepali-ab-reader.nar-light { background: #fafafa; color: #1a1a2e; }
    .nar-container { max-width: 720px; margin: 0 auto; padding: 0 24px 80px; }
    .nar-toolbar {
      position: sticky; top: 0; z-index: 10;
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 0; background: inherit;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      margin-bottom: 32px;
    }
    #nepali-ab-reader.nar-light .nar-toolbar { border-color: rgba(0,0,0,0.1); }
    .nar-logo { font-size: 15px; font-weight: 700; }
    .nar-controls { display: flex; gap: 8px; }
    .nar-btn {
      padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
      background: transparent; color: inherit; cursor: pointer; font-size: 13px; font-weight: 500;
      transition: all 0.15s;
    }
    .nar-btn:hover { background: rgba(255,255,255,0.08); }
    #nepali-ab-reader.nar-light .nar-btn { border-color: rgba(0,0,0,0.15); }
    #nepali-ab-reader.nar-light .nar-btn:hover { background: rgba(0,0,0,0.05); }
    .nar-close { color: #e94560; border-color: #e94560; }
    .nar-title {
      font-size: 32px; font-weight: 800; line-height: 1.3;
      margin: 0 0 16px; letter-spacing: -0.3px;
    }
    .nar-meta {
      display: flex; flex-wrap: wrap; gap: 16px;
      font-size: 14px; color: #8b949e; margin-bottom: 28px;
    }
    #nepali-ab-reader.nar-light .nar-meta { color: #666; }
    .nar-hero {
      width: 100%; border-radius: 12px; margin-bottom: 28px;
      max-height: 400px; object-fit: cover;
    }
    .nar-content {
      font-size: 20px; line-height: 1.9; word-spacing: 1px;
    }
    .nar-content p { margin: 0 0 1.4em; }
    .nar-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0; }
    .nar-content h2, .nar-content h3 { margin: 1.8em 0 0.6em; font-weight: 700; }
    .nar-content a { color: #58a6ff; text-decoration: none; }
    #nepali-ab-reader.nar-light .nar-content a { color: #0969da; }
    .nar-content blockquote {
      margin: 1.2em 0; padding: 12px 20px;
      border-left: 3px solid #e94560; background: rgba(233,69,96,0.06);
      border-radius: 0 8px 8px 0;
    }
    /* Devanagari-optimized spacing */
    .nar-content { letter-spacing: 0.02em; }
    @media (max-width: 600px) {
      .nar-title { font-size: 24px; }
      .nar-content { font-size: 17px; }
    }
  `;
}

// ── Public API ───────────────────────────────────────────────────────────────

export function activateReader(): void {
    const domain = window.location.hostname.replace(/^www\./, "");
    const extractor = EXTRACTORS[domain];
    const article = extractor ? extractor() : extractFallback();

    if (!article || !article.title) {
        // Show a brief notification instead of an alert
        const msg = document.createElement("div");
        msg.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      z-index: 2147483647; background: #1a1a2e; color: #e94560;
      padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4); border: 1px solid rgba(233,69,96,0.3);
    `;
        msg.textContent = "📖 Could not extract article content from this page.";
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 3000);
        return;
    }

    createReaderView(article);
}

// ── Listen for activation ───────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "ACTIVATE_READER") {
        activateReader();
    }
});
