/* extension.js
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

import GObject from "gi://GObject";
import St from "gi://St";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Clutter from "gi://Clutter";
import Soup from "gi://Soup";

import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, _("IP Address Indicator"));

      this.label = new St.Label({
        text: _("Loading..."),
        y_align: Clutter.ActorAlign.CENTER,
        style_class: "ip-indicator-label",
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

      // Cancel any request still in flight before starting a new one
      this._cancellable?.cancel();
      this._cancellable = new Gio.Cancellable();

      try {
        const message = Soup.Message.new("GET", "https://api.ipify.org");

        this._httpSession.send_and_read_async(
          message,
          GLib.PRIORITY_DEFAULT,
          this._cancellable,
          (session, result) => {
            try {
              const bytes = session.send_and_read_finish(result);
              if (message.get_status() !== Soup.Status.OK) {
                this.label.set_text(_("Error"));
                console.log(`Error fetching IP: HTTP ${message.get_status()}`);
              } else if (bytes) {
                const decoder = new TextDecoder("utf-8");
                const ip = decoder.decode(bytes.get_data()).trim();
                this.label.set_text(ip);
              } else {
                this.label.set_text(_("No IP"));
              }
            } catch (e) {
              // Request was cancelled (refresh or extension disabled)
              if (e.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                return;
              this.label.set_text(_("Error"));
              console.log(`Error fetching IP: ${e.message}`);
            }
          }
        );
      } catch (e) {
        this.label.set_text(_("Error"));
        console.log(`Error setting up request: ${e.message}`);
      }
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

export default class IPAddressExtension extends Extension {
  enable() {
    this._indicator = new Indicator();
    Main.panel.addToStatusArea(this.uuid, this._indicator, -999, "left");
  }

  disable() {
    this._indicator.destroy();
    this._indicator = null;
  }
}
