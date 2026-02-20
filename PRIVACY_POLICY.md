# Privacy Policy — Nepali Adblocker

**Last updated:** February 20, 2026

## Overview

Nepali Adblocker is a Chrome extension that blocks advertisements, trackers, and annoyances on websites, with a focus on Nepali websites. We are committed to protecting your privacy.

## Data Collection

**Nepali Adblocker does NOT collect, store, transmit, or share any personal data whatsoever.**

Specifically, we do NOT:
- Collect browsing history
- Track websites you visit
- Store any personally identifiable information
- Send analytics or telemetry data
- Use cookies or tracking pixels
- Share any data with third parties
- Communicate with any remote server (except for filter list updates)

## Data Storage

All extension data is stored **locally on your device** using Chrome's built-in storage APIs:

- **Whitelist settings** — stored in `chrome.storage.sync` (synced to your Chrome profile only)
- **Custom filter rules** — stored in `chrome.storage.local` (device only)
- **Blocked request statistics** — stored in `chrome.storage.local` (device only)
- **Request log** — stored in `chrome.storage.local` (device only, capped at 500 entries)

You can export and delete all stored data at any time through the extension's settings page.

## Network Requests

The extension makes outbound network requests **only** for the following purpose:
- **Filter list updates**: Periodically fetches updated ad filter lists from public sources (EasyList, EasyPrivacy). These requests contain no user data — only standard HTTP headers.

No other network requests are made by the extension.

## Permissions

The extension requests the following Chrome permissions:
- `declarativeNetRequest` — to block ad network requests
- `storage` — to save your settings locally
- `activeTab` / `tabs` — to display per-tab blocked counts
- `alarms` — to schedule filter list updates
- `scripting` — to inject content scripts for cosmetic filtering
- `<all_urls>` — required to apply ad blocking on all websites

## Open Source

The source code of Nepali Adblocker is open source and available for inspection.

## Changes to This Policy

If we make changes to this privacy policy, we will update the "Last updated" date above.

## Contact

For questions or concerns about this privacy policy, please open an issue on our GitHub repository.
