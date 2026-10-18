# GoTranscript desktop icons

Add the signed release icon set here before publishing installers. Generate the platform assets from a square 1024px GoTranscript logo with:

```bash
pnpm tauri icon public/gotranscript-icon.png
```

The generated PNG, ICO, ICNS, and SVG files should remain in this directory. The first local scaffold intentionally leaves icons unbundled so the web build remains usable until the final brand asset is approved.
