# IP Address Indicator Extension

This GNOME Shell extension displays your public IP address in the top panel and provides options to refresh the IP address and copy it to the clipboard.

## Features

- Display public IP address in the top panel
- Refresh IP address manually
- Copy IP address to clipboard

## Supported GNOME Shell versions

| GNOME Shell | Example distros | Source |
|---|---|---|
| 45, 46, 47, 48, 49, 50 | Ubuntu 23.10, 24.04 LTS, 24.10, 25.04, 25.10, 26.04 LTS; Fedora 39+ | repo root (`extension.js`) |
| 40, 41, 42, 43, 44 | Ubuntu 21.10, 22.04 LTS, 22.10, 23.04; Fedora 34–38; Debian 12 | `legacy/extension.js` |

GNOME 45 replaced the old `imports.*` module system with ES modules, so an
extension can't run on both from one package. This repo ships two builds that
share the same UUID.

Check your version with `gnome-shell --version`.

## Installation

1. Clone the repository and build the zips:
   ```sh
   git clone https://github.com/niksanand1717/ipaddress-indicator.git
   cd ipaddress-indicator
   ./build.sh
   ```
2. Install the zip that matches your GNOME Shell version:
   ```sh
   # GNOME 45 and newer
   gnome-extensions install --force dist/niksanand1717@github.com-gnome45+.zip
   # GNOME 40 - 44
   gnome-extensions install --force dist/niksanand1717@github.com-gnome40-44.zip
   ```
3. Log out and back in (on Wayland), or press `Alt+F2`, type `r`, and press Enter (on X11).
4. Enable it:
   ```sh
   gnome-extensions enable niksanand1717@github.com
   ```

To publish on extensions.gnome.org, upload both zips as separate versions.
