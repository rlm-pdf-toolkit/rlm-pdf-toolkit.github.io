# PDF & Photo Toolkit

*Created by Ram Lakhan Meena, INSPECTOR CBIC · 2026-10-27*

Split a PDF to fit an upload limit, compress it, reorder its pages, fill and
sign it, number the pages by hand — and make the passport photo and signature
every form asks for, in exactly the size, resolution and file size it wants.

- **Cost:** ₹0. No Play Store, no server, no subscription.
- **Private:** the PDF and the photos are worked on inside the phone or
  computer. Nothing is uploaded, ever.
- **Works offline** once it has been opened (reading scans with OCR excepted).

**Open it:** https://rlm-pdf-toolkit.github.io/
**Android app:** https://github.com/rlm-pdf-toolkit/rlm-pdf-toolkit.github.io/releases/latest/download/PDF-Toolkit.apk

---

## 1. What it does

| Tab | What for |
|---|---|
| **Split by size** | Upload limit of 5 MB? It measures every page and suggests where to cut so each part fits. Cut by eye on page previews, name each part, download as a ZIP. |
| **Compress** | Quality slider 0–100 with a recommended setting and a before/after preview of a page. Also puts 2, 4, 6, 8 or 9 pages on one sheet. |
| **Organise pages** | Move, turn, remove, duplicate pages; insert another PDF or a blank page anywhere. Click a page to see it full screen, zoom in, and act on it there. Undo. |
| **Number & stamp** | Pencil-style page numbers that skip blank pages; a line of text anywhere; a watermark; your signature, blended into the paper so it looks signed. |
| **Auto-split** | Splits a bundle where a new document begins — printed page numbers restarting, a heading, a blank separator sheet. Reads scans with OCR. |
| **Fill & edit** | Click anywhere to type. The text takes the **font, size and colour of the printed text beside it** and sits on its line. Ticks, crosses, boxes, lines, white-out, highlight, photos and signatures. |
| **Photo & sign** | Passport/form photo and signature: crop, size in mm/cm/inch/pixels, DPI written into the file, KB limits met automatically, background removed (also behind hair), name and date below, a print sheet of copies. **Take it with the camera** right in the app. |

## 2. Put it on your phone

### Android — as an app (APK)
1. On the phone, open **https://github.com/rlm-pdf-toolkit/rlm-pdf-toolkit.github.io/releases/latest/download/PDF-Toolkit.apk**
2. Tap the downloaded file → **Install**. The first time, Android asks to allow
   installs from Chrome / Files: **Settings → Allow from this source**, back, **Install**.
   Play Protect may say "unknown app": **More details → Install anyway**.

### Android or computer — from the browser
Open **https://rlm-pdf-toolkit.github.io/** in Chrome or Edge and
tap **Install as an app** at the top (or ⋮ → **Add to Home screen** → **Install**).

### iPhone / iPad
Open the address in **Safari** → **Share** → **Add to Home Screen**.

## 3. Updates

Every change pushed to this repository is live on the website within a minute
or two, and reaches the Android app too — the app opens the website, so it does
not need a new APK. When a newer version is ready, the open app shows
**"A newer version is ready — Update now"**.

The APK itself is rebuilt by GitHub only when the `android/` folder changes.

## 4. Its own address, apart from Kaasu
The toolkit has a website of its own, **https://rlm-pdf-toolkit.github.io/**, served from this
repository (`rlm-pdf-toolkit.github.io` in the free GitHub organization
`rlm-pdf-toolkit`). It must not go back into a folder of
`rlm1711204.github.io`: that website is Kaasu's, and a Kaasu installed from
Chrome opens every link on it — so the toolkit's link would open Kaasu.

**If the address shows 404:** open **https://github.com/rlm-pdf-toolkit/rlm-pdf-toolkit.github.io/settings/pages**, set
**Source → Deploy from a branch**, **Branch → main**, folder **/ (root)**, **Save**.

**Full-screen Android app:** `.well-known/assetlinks.json` in this repository
is the website vouching for the APK (see `android/README.md`).

## 5. Files

| Path | What it is |
|---|---|
| `index.html` | The whole toolkit. Its first comment carries the **version log**, newest first. |
| `sw.js` | Keeps the app on the phone for offline use. Raise `VERSION` with each release. |
| `manifest.webmanifest`, `icons/` | What makes it installable, and its icon. |
| `lib/` | The libraries it runs on, kept here so it never depends on another website. |
| `models/` | The two background-removal models, loaded only when used. |
| `android/` | The Android app (see `android/README.md`). |
| `.well-known/assetlinks.json` | Lets the Android app open full screen. |
| `tests/` | Checks for the engines inside `index.html`: `npm test` (Node 18+). |
| `colab/` | The original Colab notebook the toolkit grew from (v1.0). |

## 6. Version history
Every version from v1.0 is a commit of its own in this repository's history,
dated to its version-log entry, with that entry as the commit message —
`git log` (or the **Commits** page on GitHub) shows what changed in each.

## 7. Credits and licences
Built on pdf-lib (MIT), pdf.js (Apache-2.0), JSZip (MIT), TensorFlow.js
(Apache-2.0) and, for OCR only, tesseract.js (Apache-2.0). Background removal
uses Google MediaPipe's selfie segmentation model (Apache-2.0) and Robust Video
Matting by Peter Lin (**GPL-3.0**), as converted in `@vladmandic/human-models`
(MIT). Details in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
