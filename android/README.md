# PDF & Photo Toolkit for Android (APK)

This folder turns the toolkit web app into an installable Android app (a
"Trusted Web Activity"), the same way Kaasu does. The APK opens
https://rlm-pdf-toolkit.github.io/ full-screen using Chrome's
engine, so:

- every website update reaches the app automatically (no new APK needed),
- the camera, file picking and downloads work exactly as in Chrome.

## Download
**https://github.com/rlm-pdf-toolkit/rlm-pdf-toolkit.github.io/releases/latest/download/PDF-Toolkit.apk**

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
toolkit's website is this repository, so `.well-known/assetlinks.json` here
does that, carrying `assetlinks-entry.json` with the SHA-256 fingerprint of
`pdftoolkit-release.p12`:

`0E:AD:C4:8D:DA:80:30:AE:DE:89:4A:D1:21:CC:C2:22:B3:4E:C8:05:0F:E6:AD:4D:37:AB:B3:F7:FC:77:19:80`

If that file is lost, the app still works but shows a thin address bar at the top.

## Signing password
Until the secret `PDFTOOLKIT_KEYSTORE_PASSWORD` is set (repository
**Settings → Secrets and variables → Actions → New repository secret**), the
workflow only test-builds and publishes **no APK**.
