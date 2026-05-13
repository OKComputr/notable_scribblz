/*
 * Headless verification of the Option B patch to Notable v1.5.1
 * src/renderer/utils/markdown.ts (the `attachment()` extension).
 *
 * Runs showdown with:
 *  (a) the ORIGINAL set of attachment-output rules from v1.5.1
 *  (b) the PATCHED set (extra rule that converts <a href="@attachment/foo.png">
 *      into an inline <img>)
 *
 * against the same input markdown, writing both HTML outputs side by side
 * so you can see the difference.
 */

const showdown = require('showdown');
const path = require('path');
const fs = require('fs');

const attachmentsPath = path.join(__dirname, 'fixtures', 'attachments');
const outPath = path.join(__dirname, 'preview.html');
const token = '@attachment';

function encodeFilePath (p) { return p.split('/').map(encodeURIComponent).join('/'); }

/* ---- ORIGINAL extension (verbatim from v1.5.1 markdown.ts:399-428) ---- */
function originalAttachmentExt () {
  return [
    { type: 'output',
      regex: `<(img|source)(.*?)src="${token}/([^"]+)"(.*?)>`,
      replace ( match, $1, $2, $3, $4 ) {
        $3 = decodeURI ( $3 );
        const filePath = path.join ( attachmentsPath, $3 );
        return `<${$1}${$2}src="file://${encodeFilePath ( filePath )}" class="attachment" data-filename="${$3}"${$4}>`;
      }
    },
    { type: 'output',
      regex: `<a(.*?)href="${token}/([^"]+)"(.*?)></a>`,
      replace ( match, $1, $2, $3 ) {
        $2 = decodeURI ( $2 );
        const basename = path.basename ( $2 );
        const filePath = path.join ( attachmentsPath, $2 );
        return `<a${$1}href="file://${encodeFilePath ( filePath )}" class="attachment button highlight" data-filename="${$2}"${$3}><i class="icon small">paperclip</i><span>${basename}</span></a>`;
      }
    },
    { type: 'output',
      regex: `<a(.*?)href="${token}/([^"]+)"(.*?)>`,
      replace ( match, $1, $2, $3 ) {
        $2 = decodeURI ( $2 );
        const filePath = path.join ( attachmentsPath, $2 );
        return `<a${$1}href="file://${encodeFilePath ( filePath )}" class="attachment" data-filename="${$2}"${$3}><i class="icon xsmall">paperclip</i>`;
      }
    }
  ];
}

/* ---- PATCHED extension (Option B, copied verbatim from patched markdown.ts) ---- */
function patchedAttachmentExt () {
  const IMAGE_EXTS = new Set ([ 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico' ]);
  return [
    { type: 'output',
      regex: `<(img|source)(.*?)src="${token}/([^"]+)"(.*?)>`,
      replace ( match, $1, $2, $3, $4 ) {
        $3 = decodeURI ( $3 );
        const filePath = path.join ( attachmentsPath, $3 );
        return `<${$1}${$2}src="file://${encodeFilePath ( filePath )}" class="attachment" data-filename="${$3}"${$4}>`;
      }
    },
    { type: 'output',  // NEW: image attachment links → inline <img>
      regex: `<a(.*?)href="${token}/([^"]+)"(.*?)>(.*?)</a>`,
      replace ( match, $1, $2, $3, $4 ) {
        const ext = path.extname ( $2 ).slice ( 1 ).toLowerCase ();
        if ( !IMAGE_EXTS.has ( ext ) ) return match;
        const decoded = decodeURI ( $2 );
        const basename = path.basename ( decoded );
        const filePath = path.join ( attachmentsPath, decoded );
        return `<img src="file://${encodeFilePath ( filePath )}" alt="${basename}" class="attachment" data-filename="${decoded}">`;
      }
    },
    { type: 'output',
      regex: `<a(.*?)href="${token}/([^"]+)"(.*?)></a>`,
      replace ( match, $1, $2, $3 ) {
        $2 = decodeURI ( $2 );
        const basename = path.basename ( $2 );
        const filePath = path.join ( attachmentsPath, $2 );
        return `<a${$1}href="file://${encodeFilePath ( filePath )}" class="attachment button highlight" data-filename="${$2}"${$3}><i class="icon small">paperclip</i><span>${basename}</span></a>`;
      }
    },
    { type: 'output',
      regex: `<a(.*?)href="${token}/([^"]+)"(.*?)>`,
      replace ( match, $1, $2, $3 ) {
        $2 = decodeURI ( $2 );
        const filePath = path.join ( attachmentsPath, $2 );
        return `<a${$1}href="file://${encodeFilePath ( filePath )}" class="attachment" data-filename="${$2}"${$3}><i class="icon xsmall">paperclip</i>`;
      }
    }
  ];
}

showdown.extension('attachOriginal', originalAttachmentExt);
showdown.extension('attachPatched',  patchedAttachmentExt);

const noteMarkdown = `# My note

Here is an image I attached:

[screenshot.png](@attachment/screenshot.png)

And a markdown image (always rendered inline, both before and after):

![also screenshot.png](@attachment/screenshot.png)

And a non-image link, which should stay a link both before and after:

[report.pdf](@attachment/report.pdf)
`;

const convOriginal = new showdown.Converter({ extensions: ['attachOriginal'] });
const convPatched  = new showdown.Converter({ extensions: ['attachPatched']  });

const htmlBefore = convOriginal.makeHtml(noteMarkdown);
const htmlAfter  = convPatched.makeHtml(noteMarkdown);

console.log('=== BEFORE (current behavior) ===\n');
console.log(htmlBefore);
console.log('\n=== AFTER (Option B patch) ===\n');
console.log(htmlAfter);

const css = `
body { font-family: -apple-system, system-ui, sans-serif; padding: 24px; max-width: 760px; margin: 0 auto; }
.preview { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 28px; }
.preview h1 { font-size: 1.2em; margin-top: 0; color: #333; }
.label { font-weight: 600; color: #666; margin-bottom: 8px; font-size: 0.85em; text-transform: uppercase; }
img.attachment { max-width: 100%; border-radius: 4px; }
a.attachment.button { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border: 1px solid #ccc; border-radius: 4px; text-decoration: none; color: #333; background: #f5f5f5; }
a.attachment { color: #2a6ed4; text-decoration: none; }
a.attachment::before { content: '\\1F4CE'; margin-right: 4px; }
i.icon { display: none; }
`;

const page = `<!doctype html><meta charset="utf-8"><title>Notable attachment preview test</title>
<style>${css}</style>
<div class="preview"><div class="label">Before — Option B not applied</div>${htmlBefore}</div>
<div class="preview"><div class="label">After — Option B applied (image attachment renders inline)</div>${htmlAfter}</div>`;

fs.writeFileSync(outPath, page);
console.log('\nWrote ' + outPath);
