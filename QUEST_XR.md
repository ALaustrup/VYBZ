# MYVYB XR — Meta Quest packaging

MYVYB XR is a WebXR experience (`/xr`) built on Three.js + the native WebXR
Device API. It runs in any WebXR browser and is tuned for **Quest 2 / Quest 3**
(aggressive foveation, reduced framebuffer scale, capped pixel ratio, unlit
materials, low draw calls, fog culling — targeting 72 fps).

- **Try it now in a headset:** open `https://myvyb.astramatrix.xyz/xr` in the
  Meta Quest Browser and tap **Enter MYVYB XR**. (The Quest Browser and a
  packaged Quest PWA use the same rendering engine, so this is a faithful
  preview of the store build.)
- **Desktop/phone:** the same URL shows a draggable 3D preview.

## Packaging as a Quest app (Meta Horizon Store / App Lab)

Meta packages WebXR PWAs into Quest apps with their **forked Bubblewrap** CLI
(Trusted Web Activity). This produces a signed APK you upload to the Meta
Horizon Developer Dashboard.

Prerequisites (one-time, requires **your** Meta developer account):

- A [Meta Horizon / Quest developer account](https://developers.meta.com/horizon/)
  and an app created in the dashboard.
- Node 18+, and a JDK + Android command-line tools (Bubblewrap can fetch the
  correct versions for you).
- An Android signing keystore (Bubblewrap can generate one — keep it safe; it's
  required for every future update).

Steps:

```bash
# 1. Install Meta's fork of Bubblewrap
npm install -g @meta-quest/bubblewrap-cli   # or: github.com/meta-quest/bubblewrap

# 2. Initialise from the Quest manifest (served live)
bubblewrap init \
  --manifest=https://myvyb.astramatrix.xyz/manifest.quest.webmanifest \
  --metaquest

#    In the wizard:
#      - App mode:         Immersive (launches straight into WebXR)
#      - Application ID:    com.astramatrix.myvyb.xr   (matches ovr_package_name)
#      - Start URL:         /xr
#      - Signing key:       generate or point to your keystore

# 3. Build the signed APK
bubblewrap build
#    -> app-release-signed.apk

# 4. Install to a tethered headset to test
adb install -r app-release-signed.apk

# 5. Upload app-release-signed.apk in the Meta Horizon Developer Dashboard
#    (App Lab or Store) and complete the listing + VRC review.
```

Notes:

- `public/manifest.quest.webmanifest` is the source of truth for the packaged
  app: `start_url` = `/xr`, `display` = `fullscreen`, and `ovr_package_name`
  (`com.astramatrix.myvyb.xr`) sets the Android package id.
- Keep the production domain on HTTPS (it is) — WebXR requires a secure context.
- For "launch directly into VR", choose **Immersive** app mode in the wizard;
  Meta's launcher then auto-starts the WebXR session on open.
- Updating: re-run `bubblewrap update && bubblewrap build` with the **same**
  keystore and bump `appVersion`.

This repo ships everything the package needs (manifest, icons, HTTPS WebXR app).
The actual `init/build/sign/upload` must run with your Meta account + keystore.
