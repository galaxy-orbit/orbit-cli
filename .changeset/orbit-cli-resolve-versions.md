---
'@galaxy-stack/orbit-cli': patch
---

`orbit new` resolves the newest published Orbit package versions from the npm
registry (dist-tags latest) with an offline fallback, instead of hardcoding a
stale range (`^0.1.0` resolved to `orbit-core@0.1.12`, which shipped no `.d.ts`).
