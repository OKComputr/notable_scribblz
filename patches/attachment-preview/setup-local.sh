#!/usr/bin/env bash
#
# setup-local.sh — bootstrap a local Notable v1.5.1 build with the
# attachment-preview patch applied. macOS only. Apple Silicon supported via
# Rosetta 2 (macOS prompts to install it the first time Electron 5 launches).
#
# Usage:  bash setup-local.sh [target-directory]
# Default target-directory: ~/notable-app
#
# Idempotent: safe to re-run if a step fails.

set -eo pipefail

NOTABLE_DIR="${1:-$HOME/notable-app}"
PATCH_FILE="$(cd "$(dirname "$0")" && pwd)/0001-attachment-preview.patch"

if [ ! -f "$PATCH_FILE" ]; then
  echo "Could not find the feature patch at: $PATCH_FILE" >&2
  echo "Run this script from inside a checkout of notable_scribblz." >&2
  exit 1
fi

step() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }

# ---------- 1. nvm + Node 16 ----------

if ! [ -s "$HOME/.nvm/nvm.sh" ]; then
  step "Installing nvm (one-time)..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"

step "Installing/using Node 16 (v1.5.1 was written for Node 12-16)..."
nvm install 16 >/dev/null
nvm use 16

# ---------- 2. Clone notable v1.5.1 ----------

if [ ! -d "$NOTABLE_DIR/.git" ]; then
  step "Cloning notable/notable into $NOTABLE_DIR..."
  git clone --quiet https://github.com/notable/notable.git "$NOTABLE_DIR"
fi
cd "$NOTABLE_DIR"
git checkout --quiet v1.5.1

# ---------- 3. Apply feature patch ----------

if git apply --check "$PATCH_FILE" >/dev/null 2>&1; then
  step "Applying attachment-preview feature patch..."
  git apply "$PATCH_FILE"
elif git apply --check --reverse "$PATCH_FILE" >/dev/null 2>&1; then
  step "Feature patch already applied; skipping."
else
  echo "Could not apply patch (and not already applied). Aborting." >&2
  exit 1
fi

# ---------- 4. Environment workarounds ----------

step "Patching package.json (deleted forks → published versions)..."
node - <<'NODEEOF'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.devDependencies['electron-webpack'] = '^2.8.2';
pkg.dependencies['electron-updater']    = '4.0.6';
pkg.overrides = Object.assign({}, pkg.overrides, {
  'caporal' : '^1.4.0',
  'gulp-if' : '^3.0.0'
});
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
NODEEOF

step "Fixing asciimath2tex import (package layout changed)..."
sed -i.bak "s|asciimath2tex/asciimath2tex\\.js|asciimath2tex|" \
  src/renderer/utils/asciimath.ts
rm -f src/renderer/utils/asciimath.ts.bak

step "Configuring git URL rewrites for old ssh+git:// transitives..."
git config --global --add url."https://github.com/".insteadOf "ssh://git@github.com/" 2>/dev/null || true
git config --global --add url."https://github.com/".insteadOf "git://github.com/"        2>/dev/null || true

# ---------- 5. npm install ----------

step "npm install (this takes a few minutes)..."
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps --no-audit --no-fund

# ---------- 6. node_modules patches ----------

step "Disabling fork-ts-checker (modern @types reject older code)..."
sed -i.bak 's|if (isTranspileOnly && !configurator.isTest)|if (false \&\& isTranspileOnly \&\& !configurator.isTest)|' \
  node_modules/electron-webpack/out/configurators/ts.js
rm -f node_modules/electron-webpack/out/configurators/ts.js.bak

step "Stubbing electron-updater (avoids fs/promises issue on Electron 5)..."
cat > node_modules/electron-updater/out/main.js <<'JSEOF'
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { EventEmitter } = require("events");
const noop = () => {};
function buildStub () {
  const e = new EventEmitter();
  e.checkForUpdates = noop; e.checkForUpdatesAndNotify = noop;
  e.downloadUpdate  = noop; e.quitAndInstall          = noop;
  e.setFeedURL      = noop;
  e.logger = { info: noop, warn: noop, error: noop, debug: noop };
  return e;
}
const stub = buildStub();
exports.autoUpdater     = stub;
exports.AppUpdater      = function () { return buildStub(); };
exports.NsisUpdater     = function () { return buildStub(); };
exports.MacUpdater      = function () { return buildStub(); };
exports.AppImageUpdater = function () { return buildStub(); };
exports.NoOpLogger      = { info: noop, warn: noop, error: noop, debug: noop };
exports.Provider          = function () {};
exports.CancellationToken = function () {};
exports.UpdaterSignal     = function () {};
exports.DOWNLOAD_PROGRESS = "download-progress";
exports.UPDATE_DOWNLOADED = "update-downloaded";
JSEOF

# ---------- 7. Build prerequisites ----------

step "Building prerequisites..."
mkdir -p src/renderer/template/dist/css src/renderer/template/dist/javascript

if ! npm run svelto:dev >/tmp/svelto.log 2>&1; then
  echo "    svelto build failed (caporal API drift) — stubbing CSS instead."
  echo "    UI chrome will be unstyled, but the patch under test still works."
  : > src/renderer/template/dist/css/notable.min.css
fi

npm run monaco
npm run iconfont
npm run tutorial

# ---------- 8. cash-dom + svelto plugin shim ----------

step "Writing cash-dom + svelto plugin shim (replaces notable.min.js)..."
cat > src/renderer/template/dist/javascript/notable.min.js <<'JSEOF'
// cash-dom + svelto plugin no-op shim. Replaces the svelto-built notable.min.js.
// Svelto's plugins (.layoutResizable, .modal, .popover, ...) become chainable
// no-ops so React mounting succeeds.
var $ = require('cash-dom');
$ = $.default || $;
$.$document = $(document);
$.$window   = $(window);
$.$body     = $(document.body);
$.$html     = $(document.documentElement);

function dummyInstance () {
  return new Proxy(function () {}, {
    get:   function (_t, p) { return p === 'then' ? undefined : function () { return dummyInstance(); }; },
    apply: function ()      { return dummyInstance(); }
  });
}
[ 'widgetize','layoutResizable','modal','popover','tooltip','tagbox','dropdown',
  'tabs','datepicker','select','toggle','noty','placeholder','navbar','range',
  'checkbox','radio','toast','toaster','colorpicker','switch','accordion',
  'stepper','carousel','sortable','resizable','spinner','autocomplete',
  'expander','menu','button','card','list'
].forEach(function (name) {
  $.fn[name] = function () { return this; };
  if ($[name] == null) $[name] = function () { return dummyInstance(); };
});

window.$    = $;
window.cash = $;
window.jQuery = $;
JSEOF

# ---------- 9. Done ----------

cat <<EOM

\033[1;32m=== Setup complete ===\033[0m

To launch Notable:

    cd $NOTABLE_DIR
    export NVM_DIR="\$HOME/.nvm" && . "\$NVM_DIR/nvm.sh"
    nvm use 16
    npm run dev

The first launch:
  - takes ~30-60 seconds to compile the renderer
  - prompts for a data directory — click "Use a custom location" and pick
    any empty folder
  - on Apple Silicon, prompts to install Rosetta 2 — accept (Electron 5
    has no native arm64 build)

Once running, create a note containing:

    [screenshot.png](@attachment/screenshot.png)

...drop a PNG named screenshot.png into the attachments/ subdirectory of your
data folder, and the preview pane shows it inline. That's the patch.

The UI chrome will look unstyled — that's the stubbed CSS bypassing the
broken svelto build, not the patch.
EOM
