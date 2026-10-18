# GoTranscript desktop release

GoTranscript uses one React/Vite frontend for web, Windows, and macOS. The desktop shell is Tauri 2 and remains a thin online-first wrapper around the hosted Vercel API and Supabase project.

## Local development

1. Install Rust and the Tauri prerequisites for your operating system.
2. Copy `.env.example` to `.env`.
3. Set `VITE_API_BASE_URL` to the Vercel deployment URL for production desktop builds. Leave it empty for local Vite API development.
4. Run `pnpm desktop:dev`.

The desktop bundle never needs `APIFY_API_TOKEN`. That credential stays in Vercel server-side environment variables and is only used by `api/transcript.js`.

## Production release

Update the Vercel URL and the updater endpoint/public key in `src-tauri/tauri.conf.json`. Add the signed icon set under `src-tauri/icons/`, then create a `v1.0.0` tag. `.github/workflows/desktop-release.yml` builds Windows x64 and macOS Apple Silicon/Intel installers and publishes signed update artifacts as a draft GitHub release.

Required GitHub secrets include the Tauri updater signing key, Apple Developer signing/notarization credentials, and a Windows code-signing certificate. Keep these only in GitHub Actions secrets.

## Build without installing Rust locally

Push the repository to GitHub and open **Actions → Build desktop installers → Run workflow**. The workflow builds the same kind of artifacts shown in the reference screenshot: a Windows `.msi` and macOS `.dmg` files. Download them from the completed workflow under **Artifacts**. This is the recommended route when the local Rust download is slow or unavailable.

The desktop app requires internet for authentication, transcript generation, billing, and cloud history. When offline, the shared UI stays available and Generate is disabled.
