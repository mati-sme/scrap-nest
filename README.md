# Scrap Nest

Mobile-first incremental: one junkyard screen, drag a **claw radius** over scrap piles (Keep on Mining–style auto-shred), spend parts on a visual **Upgrade Map**, run timed **power cycles**, then **Nest Reset** for relics and **helper bots** (each with its own skill-tree branch). Two cozy Nest cats.

## Play

- Local: open `index.html` or serve the folder.
- GitHub Pages: `https://mati-sme.github.io/scrap-nest/`

Hard-refresh (or clear site data) after updates so `sw.js` CACHE picks up the new build.

## Stack

Vanilla HTML / CSS / JS. No build step. WebAudio. Procedural canvas art. PWA (`manifest.webmanifest` + `sw.js`).

## Loop

1. **SHRED** — drag claw; scrap inside the ring takes damage automatically.
2. Power drains → return to Nest with whole-number **parts**.
3. Buy Upgrade Map nodes (reach, shred, magnet, spawn, auto-claw, nest decor, prestige gate).
4. **Nest Reset** → Nest Relics → permanent buffs + Sweeper / Grabber bot branches.
