# Tizen App Shell

This directory contains a sideload-oriented Samsung Tizen Web App shell for Lyria.

## How it works

The packaged Tizen app starts from local `index.html`, which immediately redirects to the remote Lyria frontend URL.

This approach is the most practical with the current SvelteKit architecture because:

- the frontend is not yet fully static/offline
- the backend remains remote
- `pointing-device-support="disable"` can be applied in the packaged Tizen app

## Prepare the shell

Set the remote frontend URL and generate the Tizen app files:

```bash
TIZEN_REMOTE_APP_URL=https://your-frontend.example.com pnpm tizen:prepare
```

Optional variables:

- `TIZEN_PACKAGE_ID` (default: `LyriaTV01`)
- `TIZEN_APP_ID` (default: `${TIZEN_PACKAGE_ID}.lyria`)
- `TIZEN_APP_NAME` (default: `Lyria`)
- `TIZEN_REQUIRED_VERSION` (default: `6.5`)

Generated output:

- `tizen/app/config.xml`
- `tizen/app/index.html`
- `tizen/app/icon.png`

## Package for sideloading

Use Tizen Studio / `tizen` CLI to package `tizen/app` as a `.wgt`.

Typical flow:

1. Create or select a Samsung/Tizen signing profile in Tizen Studio
2. Run `pnpm tizen:prepare`
3. Package `tizen/app` as a web application
4. Install the resulting `.wgt` on the TV in developer mode

## Notes

- `config.xml` already disables the pointing device:
  - `pointing-device-support="disable"`
- The shell currently allows access to:
  - the configured remote frontend origin
  - `https://img.youtube.com`
- If your remote frontend or APIs use additional origins, add them to `config.xml`
