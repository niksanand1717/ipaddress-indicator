#!/bin/sh
# Builds installable zips for every supported GNOME Shell version:
#   dist/<uuid>-gnome45+.zip   -> GNOME Shell 45 and newer (ES modules)
#   dist/<uuid>-gnome40-44.zip -> GNOME Shell 40 - 44 (legacy imports)
set -e

cd "$(dirname "$0")"
UUID=niksanand1717@github.com
DIST=dist

rm -rf "$DIST"
mkdir -p "$DIST/build-modern" "$DIST/build-legacy"

cp extension.js metadata.json stylesheet.css "$DIST/build-modern/"
cp legacy/extension.js legacy/metadata.json stylesheet.css "$DIST/build-legacy/"

(cd "$DIST/build-modern" && zip -qr "../$UUID-gnome45+.zip" .)
(cd "$DIST/build-legacy" && zip -qr "../$UUID-gnome40-44.zip" .)

rm -rf "$DIST/build-modern" "$DIST/build-legacy"
ls -1 "$DIST"
