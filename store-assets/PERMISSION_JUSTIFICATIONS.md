# Chrome Web Store — Permission Justifications

Copy-paste each into the corresponding field.

---

## declarativeNetRequest justification

This permission is essential for the core ad-blocking functionality. The extension uses the declarativeNetRequest API to block network requests to known ad-serving domains (Google Ads, Facebook Ads, Nepali ad networks) and tracker domains (Google Analytics, Hotjar, Criteo). It evaluates 45+ static rules against outgoing requests to prevent ads and trackers from loading, without intercepting or reading any page content.

---

## declarativeNetRequestFeedback justification

This permission is used to count the number of blocked requests per tab and display that count on the extension badge icon. When a rule matches and blocks a request, the onRuleMatchedDebug listener increments a counter and logs the blocked URL for the Network Logger feature. This feedback is stored locally and is never transmitted externally.

---

## storage justification

The extension uses chrome.storage.local to persist user preferences (enabled/disabled state, custom filter rules, blocked request log) and chrome.storage.sync to store the site whitelist across the user's Chrome profile. No data is sent to any external server — all storage is entirely local to the user's browser.

---

## activeTab justification

The activeTab permission is used to detect the current website's domain so the extension popup can display the site name, check whitelist status, and show per-tab blocked request counts. It is also used to inject the Element Picker and Clean Reading Mode content scripts when the user activates these features from the popup.

---

## tabs justification

The tabs permission is used to query the active tab's URL to display the current domain in the popup, reset per-tab blocked counts on page navigation, and to send messages to content scripts (e.g., activating the Element Picker or Reader Mode on the current page). No browsing history is collected or stored.

---

## alarms justification

The alarms permission is used to schedule periodic filter list updates. The extension checks for updated versions of EasyList, EasyPrivacy, and the Nepali ad filter list every 6 hours using chrome.alarms. This is a background task that fetches publicly available filter list files — no user data is included in these requests.

---

## scripting justification

The scripting permission is used to programmatically inject content scripts for the Element Picker and Clean Reading Mode features. When a user clicks "Picker" or "Reader" in the popup, the extension injects the corresponding script into the active tab. These scripts run locally to hide ad elements or render a clean article view — no data is collected or transmitted.

---

## Host permission justification

The <all_urls> host permission is required because the extension needs to apply ad-blocking and cosmetic filtering rules on all websites the user visits, not just a predefined set. Ad and tracker domains appear across all websites. The extension uses this permission to: (1) apply declarativeNetRequest blocking rules to all outgoing requests, (2) inject cosmetic filtering CSS to hide ad elements, and (3) run the cookie consent auto-dismiss and anti-adblock bypass scripts. No page content is read, collected, or transmitted.
