/* Loads the engines out of index.html exactly as the app ships them, so the
   tests always check the real code rather than a copy of it. */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const PDFLib = require('../lib/pdf-lib.min.js');

function factory(name, args = []) {
  const m = html.match(new RegExp('function ' + name + '\\(([^)]*)\\) \\{[\\s\\S]*?\\n\\}\\n'));
  if (!m) throw new Error(name + ' not found in index.html');
  return new Function('return (' + m[0] + ')')()(...args);
}

module.exports = {
  PDFLib,
  split: () => factory('createEngine', [PDFLib]),
  detector: () => factory('createDetector'),
  numberer: () => factory('createNumberer', [PDFLib]),
  imposer: () => factory('createImposer', [PDFLib]),
  photo: () => factory('createPhoto'),
  seg: () => factory('createSegRefine'),
};
