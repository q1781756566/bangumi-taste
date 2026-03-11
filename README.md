# Bangumi Taste Analyzer

[中文文档](./README_CN.md)

An AI-powered taste analysis tool for [Bangumi](https://bgm.tv) users. It fetches your anime/game collection data and generates a personalized taste report using LLM analysis.

**Live Demo:** https://q1781756566.github.io/bangumi-taste/

## Features

- **Collection Analysis** — Fetch anime and game collections from Bangumi via username or access token
- **AI Taste Report** — Generate personalized taste analysis powered by Claude / OpenAI / custom LLM providers
- **Interactive Charts** — Visualize genre preferences (radar), rating distribution (bar), collection status (pie), and activity timeline
- **Taste Tags** — Get labeled taste traits with descriptions (e.g. "narrative-driven", "aesthete")
- **Hidden Gems & Recommendations** — Discover underrated favorites and get tailored suggestions
- **Export as Image** — Download your report as a PNG with avatar, branding, and QR code
- **Category Selection** — Choose to analyze anime, games, or both independently
- **Auto Model List** — Fetch available models from custom LLM providers automatically
- **Result Caching** — Analysis results are cached locally for instant revisits
- **Mobile Responsive** — Fully responsive design with mobile-optimized tooltips and charts

## Tech Stack

- **Framework:** Next.js 16 + React 19 + TypeScript
- **Styling:** Tailwind CSS v4
- **Charts:** Recharts
- **LLM:** Anthropic SDK / OpenAI SDK / Custom API
- **Export:** html-to-image + Canvas API + qrcode

## Getting Started

### Prerequisites

- Node.js 18+
- A Bangumi account
- An LLM API key (Claude, OpenAI, or compatible provider)

### Install & Run

```bash
git clone https://github.com/q1781756566/bangumi-taste.git
cd bangumi-taste
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

### Usage

1. Select analysis category (anime / game)
2. Enter your Bangumi numeric username (not nickname)
3. Configure your LLM provider and API key
4. Click "开始分析" to generate your taste report
5. Browse charts, tags, recommendations, and export as image

## Deployment

The project is configured for GitHub Pages deployment via GitHub Actions. Every push to `main` triggers an automatic build and deploy.

To deploy on other platforms:

```bash
npm run build
```

The static output will be in the `out/` directory.

## License

MIT
