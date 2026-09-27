/* extension.js (legacy build for GNOME Shell 40 - 44)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const { GObject, St, Gio, GLib, Clutter, Soup } = imports.gi;
const ByteArray = imports.byteArray;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Me = ExtensionUtils.getCurrentExtension();
const _ = imports.gettext.gettext;

const IP_URL = "https://api.ipify.org";

// GNOME Shell 40-42 ship libsoup 2.4, GNOME 43+ ships libsoup 3
const SOUP3 = Soup.MAJOR_VERSION >= 3;

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, _("IP Address Indicator"));

      this.label = new St.Label({
        text: _("Loading..."),
        y_align: Clutter.ActorAlign.CENTER,
        style_class: "system-status-icon",
      });

      this.add_child(this.label);

      // Create menu item to refresh IP
      let refreshItem = new PopupMenu.PopupMenuItem(_("Refresh IP"));
      let copyToClipboard = new PopupMenu.PopupMenuItem(
        _("Copy IP to Clipboard")
      );

      copyToClipboard.connect("activate", () => {
        St.Clipboard.get_default().set_text(
          St.ClipboardType.CLIPBOARD,
          this.label.get_text()
        );
      });

      refreshItem.connect("activate", () => {
        this._updateIP();
      });

      this.menu.addMenuItem(refreshItem);
      this.menu.addMenuItem(copyToClipboard);

      // Create a Soup Session
      this._httpSession = new Soup.Session();

      // Initial IP update
      this._updateIP();

      // Update IP every 5 minutes
      this._timeout = GLib.timeout_add_seconds(
        GLib.PRIORITY_DEFAULT,
        300,
        () => {
          this._updateIP();
          return GLib.SOURCE_CONTINUE;
        }
      );
    }

    _updateIP() {
      this.label.set_text(_("Loading...")); // Show loading state

      try {
        const message = Soup.Message.new("GET", IP_URL);

        if (SOUP3) this._fetchSoup3(message);
        else this._fetchSoup2(message);
      } catch (e) {
        this.label.set_text(_("Error"));
        log(`Error setting up request: ${e.message}`);
      }
    }

    _fetchSoup3(message) {
      // Cancel any request still in flight before starting a new one
      if (this._cancellable) this._cancellable.cancel();
      this._cancellable = new Gio.Cancellable();

      this._httpSession.send_and_read_async(
        message,
        GLib.PRIORITY_DEFAULT,
        this._cancellable,
        (session, result) => {
          try {
            const bytes = session.send_and_read_finish(result);
            if (message.get_status() !== Soup.Status.OK)
              this._setError(`HTTP ${message.get_status()}`);
            else if (bytes)
              this._setIP(ByteArray.toString(bytes.get_data()));
            else this.label.set_text(_("No IP"));
          } catch (e) {
            // Request was cancelled (refresh or extension disabled)
            if (e.matches && e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
              return;
            this._setError(e.message);
          }
        }
      );
    }

    _fetchSoup2(message) {
      // Cancel any request still in flight before starting a new one
      if (this._pendingMessage)
        this._httpSession.cancel_message(
          this._pendingMessage,
          Soup.Status.CANCELLED
        );
      this._pendingMessage = message;

      this._httpSession.queue_message(message, (session, msg) => {
        if (msg.status_code === Soup.Status.CANCELLED) return;
        this._pendingMessage = null;

        if (msg.status_code !== Soup.Status.OK)
          this._setError(`HTTP ${msg.status_code}`);
        else if (msg.response_body.data)
          this._setIP(msg.response_body.data);
        else this.label.set_text(_("No IP"));
      });
    }

    _setIP(text) {
      this.label.set_text(text.trim());
    }

    _setError(reason) {
      this.label.set_text(_("Error"));
      log(`Error fetching IP: ${reason}`);
    }

    destroy() {
      if (this._timeout) {
        GLib.source_remove(this._timeout);
        this._timeout = null;
      }

      if (this._cancellable) {
        this._cancellable.cancel();
        this._cancellable = null;
      }

      if (this._httpSession) {
        this._httpSession.abort();
        this._httpSession = null;
      }

      super.destroy();
    }
  }
);

class IPAddressExtension {
  enable() {
    this._indicator = new Indicator();
    Main.panel.addToStatusArea(Me.uuid, this._indicator, -999, "left");
  }

  disable() {
    this._indicator.destroy();
    this._indicator = null;
  }
}

function init() {
  return new IPAddressExtension();
}
