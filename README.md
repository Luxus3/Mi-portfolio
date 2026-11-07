# Lucio — 3D datacenter portfolio

Vite + three.js (0.170.0). First-person walk through a datacenter. All text lives in `src/content.js`.

## Run

```
npm install
npm run dev
```

## Build and deploy (Vercel)

```
npm run build
```

Vercel settings: framework Vite, build command `npm run build`, output directory `dist`.

## Notes

- `prefers-reduced-motion` or no WebGL: a 2D version of the same content is shown (no 3D world).
- `public/og.svg` is the share image. Replace it with a 1200x630 `og.png` and update the meta tags if a platform does not render SVG.
- Update the canonical / og URLs in `index.html` after the domain is final.
