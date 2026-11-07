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

## Easter eggs

- Terminal (button or `` ` `` key): `help`, `neofetch` (compares my machine with yours), `ping lucio.local` (real latency), `top`, `docker ps`, `ls -a` / `cat .secret`, `matrix`, `fortune`, `cowsay`, `sudo hire me`.
- `chaos` or the **CHAOS** button: cut the power to the datacenter. `rm -rf /` causes a fake kernel panic.
- Click or tap the racks to ping them.
- Konami code (up up down down left right left right B A), or tap the LUCIO.local logo 5 times: ROOT MODE, then `cat /root/flag.txt`.

## Notes

- `prefers-reduced-motion` or no WebGL: a 2D version of the same content is shown (no 3D world).
- `public/og.svg` is the share image. Replace it with a 1200x630 `og.png` and update the meta tags if a platform does not render SVG.
- Update the canonical / og URLs in `index.html` after the domain is final.
