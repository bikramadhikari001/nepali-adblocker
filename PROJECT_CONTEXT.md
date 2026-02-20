# Project Context

## Overview
**Name**: Nepali Adblocker
**Description**: A Chrome extension that blocks ads on Nepali websites, with special focus on news sites — inspired by uBlock Origin.
**Target Users**: Nepali internet users browsing Nepali news and content sites
**Scale**: Community tool / open-source Chrome extension

## Technical Stack
- **Language**: JavaScript/TypeScript
- **Platform**: Chrome Extension (Manifest V3)
- **Architecture**: Following uBlock Origin's patterns
- **UI Language**: English

## Core Approach (Following uBlock Origin)
- **Manifest V3** with `declarativeNetRequest` API for network-level ad blocking
- **Cosmetic filtering** to hide ad elements visually (element picker)
- **Standard filter list format** (AdBlock Plus / uBlock Origin syntax)
- **Bundled lists**: EasyList + custom Nepali filter list
- **Remote filter list updates** (auto-update from server)
- **Popup UI**: Toggle on/off, blocked count, whitelist current site, stats
- **User custom rules** support
- **Site whitelist/allowlist** support
- **Report missed ads / broken sites**

## Scope — V1
- Support **top 100 Nepali websites** (special focus on news sites)
- Custom Nepali filter list targeting ads on these sites
- Standard uBlock Origin-style popup interface
- Cosmetic + network request blocking
- Chrome Web Store distribution

## Target Sites (Examples — To Be Researched)
- Major Nepali news: onlinekhabar.com, setopati.com, ekantipur.com, ratopati.com, etc.
- Other popular Nepali sites (entertainment, government, education, etc.)

## Source Documents
- No pre-existing project documents found
- All context gathered from user interview
