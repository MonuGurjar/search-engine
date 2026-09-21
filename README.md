# VOID — A Quieter Way to Search

A private, minimalist search engine frontend featuring a living 3D icy landscape, floating celestial sphere, and restrained mouse parallax interactions.

## ✨ Features

- **Living Atmospheric Environment**: Multi-layered landscape with GPU-accelerated smooth parallax (`--mx` / `--my` / `--sy`).
- **Responsive Artwork**: Automatically serves portrait composition for mobile viewports and panoramic landscape for desktop.
- **Floating Celestial Sphere**: Independent planet layer with subtle organic float, pulse, and mint coronal aura.
- **Optimized for Vercel**: Pre-configured SPA routing fallback (`vercel.json`), static asset caching, preconnects, and WebP compression reducing asset size by **87.4%**.
- **Minimalist Search Interface**: Instant category switching (Web, Images, News, Videos, Academic, Code) and clean mock results view.

## 🛠️ Tech Stack

- **React 19**
- **Vite 8**
- **Tailwind CSS v4**
- **TypeScript**

## 🚀 Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

## 📦 Deploy to Vercel

You can deploy directly to Vercel with the [Vercel CLI](https://vercel.com/cli):

```bash
vercel
```

Or connect this repository (`MonuGurjar/search-engine`) in your [Vercel Dashboard](https://vercel.com/new).

## 📄 License

MIT
