# PDF & Photo Toolkit for Android (APK)

This folder turns the toolkit web app into an installable Android app (a
"Trusted Web Activity"), the same way Kaasu does. The APK opens
https://rlm1711204.github.io/pdf-photo-toolkit/ full-screen using Chrome's
engine, so:

- every website update reaches the app automatically (no new APK needed),
- the camera, file picking and downloads work exactly as in Chrome.

## Download
**https://github.com/rlm1711204/pdf-photo-toolkit/releases/latest/download/PDF-Toolkit.apk**

On the phone: open the link → download → tap the file → **Install**.
The first time, Android asks you to allow installs from Chrome / Files: tap
**Settings → Allow from this source**, then go back and tap **Install**.
Play Protect may say "unknown app": tap **More details → Install anyway**.

## How the APK gets built
GitHub Actions (`.github/workflows/android-apk.yml`) builds it on GitHub's
servers whenever this folder changes, and publishes it on the Releases page.
It can also be run by hand: **Actions → Build Android APK → Run workflow**.

## Signing key
`pdftoolkit-release.p12` is this app's own signing key (not Kaasu's),
**encrypted** with a password that is stored only as the GitHub secret
`PDFTOOLKIT_KEYSTORE_PASSWORD`. Keep that password safe (e.g. in a password
manager). Every APK must be signed with the same key, or phones will refuse to
install an update over the old version.

## Full screen (no address bar)
Android opens the app full screen only when the website vouches for it. The
site's root is the Kaasu repository, so its
`https://rlm1711204.github.io/.well-known/assetlinks.json` lists this app too —
`assetlinks-entry.json` here is the entry it carries, with the SHA-256
fingerprint of `pdftoolkit-release.p12`:

`0E:AD:C4:8D:DA:80:30:AE:DE:89:4A:D1:21:CC:C2:22:B3:4E:C8:05:0F:E6:AD:4D:37:AB:B3:F7:FC:77:19:80`

If that entry is ever lost from the root file, the app still works but shows a
thin address bar at the top.
