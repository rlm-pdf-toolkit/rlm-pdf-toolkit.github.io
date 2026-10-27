# Third-party software and models

These are included in, or loaded by, the toolkit. Their own licences apply to
them; the copies in `lib/` and `models/` are unchanged.

| Component | Version | Where | Licence | Source |
|---|---|---|---|---|
| pdf-lib | 1.17.1 | `lib/pdf-lib.min.js` | MIT | https://github.com/Hopding/pdf-lib |
| pdf.js (pdfjs-dist) | 3.11.174 | `lib/pdf.min.js`, `lib/pdf.worker.min.js` | Apache-2.0 | https://github.com/mozilla/pdf.js |
| JSZip | 3.10.1 | `lib/jszip.min.js` | MIT (dual MIT / GPL-3.0; used under MIT) | https://github.com/Stuk/jszip |
| TensorFlow.js | 4.22.0 | `lib/tf.min.js` | Apache-2.0 | https://github.com/tensorflow/tfjs |
| tesseract.js | 5.1.0 | loaded from cdnjs only when OCR is switched on | Apache-2.0 | https://github.com/naptha/tesseract.js |
| Selfie segmentation model | — | `models/selfie.json`, `models/selfie.bin` | Apache-2.0 (Google MediaPipe) | https://github.com/google/mediapipe |
| Robust Video Matting model | — | `models/rvm.json`, `models/rvm.bin` | GPL-3.0 | https://github.com/PeterL1n/RobustVideoMatting |
| TensorFlow.js conversions of both models | 3.0.4 | as above | MIT | https://github.com/vladmandic/human-models |

**Note on GPL-3.0.** The Robust Video Matting model ("precise" background
removal) is licensed under GPL-3.0. Sharing the toolkit with that model inside
means sharing it under GPL-3.0 terms: anyone who receives it may use, study,
change and pass it on, and its source must stay available — which it already is,
since this repository is public and the app is its own source. If a different
licence is ever needed for the toolkit, remove `models/rvm.*` and keep the
"fast" model (Apache-2.0) only.
