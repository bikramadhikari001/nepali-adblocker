# Nepali Adblocker

> A Chrome extension that blocks ads on Nepali websites — inspired by uBlock Origin.

## What Is This?

Nepali Adblocker is a lightweight, efficient Chrome extension that blocks advertisements on
the top 100 Nepali websites, with a special focus on news sites like OnlineKhabar, Setopati,
eKantipur, and Ratopati.

Built following uBlock Origin's proven architecture, it uses Chrome's Manifest V3
`declarativeNetRequest` API for network-level blocking and cosmetic filtering to hide
ad elements visually.

## Features

- 🚫 **Network-level ad blocking** via declarativeNetRequest
- 🎨 **Cosmetic filtering** to hide ad elements
- 📋 **Bundled filter lists** — EasyList + custom Nepali list
- 🔄 **Auto-updating filter lists** from remote server
- ✅ **Site whitelist** — disable blocking per-site
- 📝 **Custom rules** — add your own filters
- 📊 **Stats popup** — see blocked count and controls
- 🇳🇵 **100+ Nepali sites** supported out of the box

## Development

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Load in Chrome
# 1. Go to chrome://extensions
# 2. Enable Developer Mode
# 3. Click "Load unpacked"
# 4. Select the dist/ folder
```

## Project Structure

```
nepali_adblocker/
├── src/
│   ├── background/      # Service worker (MV3)
│   ├── content/         # Content scripts (cosmetic filtering)
│   ├── popup/           # Extension popup UI
│   ├── options/         # Options page
│   └── filters/         # Filter list engine
├── filters/             # Filter list files
│   ├── nepali-ads.txt   # Custom Nepali filter list
│   └── easylist.txt     # Bundled EasyList
├── manifest.json        # Chrome extension manifest (V3)
└── docs/                # Documentation
```

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit with conventional commits (`git commit -m "feat: add ..."`)
4. Open a PR

## License

MIT
