# Project Context

## Overview
**Name**: Nepali Adblocker
**Version**: 2.0.0
**Description**: A premium Chrome extension that blocks ads, trackers, and annoyances on Nepali websites — inspired by uBlock Origin.
**Target Users**: Nepali internet users browsing Nepali news and content sites
**Distribution**: Chrome Web Store

## Technical Stack
- **Language**: TypeScript
- **Platform**: Chrome Extension (Manifest V3)
- **Build**: Vite + @crxjs/vite-plugin
- **Testing**: Vitest (20 tests)
- **APIs**: declarativeNetRequest, chrome.storage, chrome.tabs, chrome.alarms, chrome.scripting

## Architecture
```
nepali_adblocker/
├── manifest.json               # MV3 manifest (alarms, scripting, DNR)
├── src/
│   ├── background/
│   │   ├── service-worker.ts    # Main SW: messaging, whitelist rules, state
│   │   ├── filter-parser.ts     # ABP/uBO filter syntax → DNR conversion
│   │   ├── whitelist.ts         # Per-site whitelist (chrome.storage.sync)
│   │   ├── stats.ts             # Blocked count tracking + badge
│   │   ├── request-logger.ts    # Network request log (500 cap)
│   │   ├── list-updater.ts      # Remote filter list fetcher (6h schedule)
│   │   └── import-export.ts     # Settings backup/restore as JSON
│   ├── content/
│   │   ├── cosmetic-filter.ts   # CSS hide rules + MutationObserver
│   │   ├── cookie-consent.ts    # Auto-dismiss cookie banners
│   │   ├── anti-adblock.ts      # Bypass anti-adblock walls
│   │   ├── element-picker.ts    # Point-and-click element hider
│   │   └── reader-mode.ts       # Clean article reader (Devanagari)
│   ├── popup/                   # Extension popup (stats, tools)
│   ├── options/                 # Dashboard (6 tabs)
│   └── assets/                  # Icons (16/48/128)
├── rules/
│   ├── nepali-rules.json        # 11 Nepali ad network rules
│   ├── easylist-mini-rules.json # 12 Google ad rules
│   └── tracker-rules.json       # 22 tracker blocking rules
├── store-assets/                # CWS promotional images
├── PRIVACY_POLICY.md            # No-data-collection privacy policy
└── docs/
```

## Features (10 Premium Enhancements)
1. 🚫 Network-level ad blocking (45 DNR rules)
2. 🎨 Cosmetic filtering (9+ Nepali sites, global selectors)
3. 🔒 Tracker & fingerprint blocking (GA, FB Pixel, Hotjar, etc.)
4. 🍪 Cookie consent auto-dismiss (60+ patterns)
5. 🛡️ Anti-adblock bypass (decoy ads, overlay removal)
6. 🎯 Element picker & zapper (permanent + temporary block)
7. 📖 Clean reading mode (Devanagari-optimized, dark/light)
8. 🔄 Auto-updating filter lists (EasyList, EasyPrivacy, Nepali)
9. 📊 Network request logger (500-entry cap)
10. 💾 Import/export settings (JSON backup)

## Target Nepali Sites
OnlineKhabar, eKantipur, Setopati, Ratopati, NagarikNews, HamroPatro, DCNepal, HimalKhabar, KrishiSanjal + 90 more via global rules

## Ad Networks Blocked
- Google AdSense / DFP (doubleclick.net, googlesyndication.com)
- Adsaro Nepal (adsaronepal.com.np)
- AdMana (admana.net)
- 20+ tracker domains (Analytics, FB Pixel, Hotjar, Clarity, etc.)

## Key Decisions
| Decision | Rationale |
|----------|-----------|
| Manifest V3 | Modern Chrome standard, required for CWS |
| declarativeNetRequest | MV3 network blocking API |
| Static + dynamic rules | Static for bundled lists, dynamic for whitelist |
| Vite + CRXJS | Fast builds, HMR for dev, Chrome extension support |
| Local-only storage | Privacy-first, no telemetry |
| English UI | User preference |
