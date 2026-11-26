import { EGREGORA_CONFIG } from "../config.mjs";

const { api, sheets } = foundry.applications;
const TextEditor = foundry.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
const FilePicker = foundry.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;

export class EgregoraItemSheet extends api.HandlebarsApplicationMixin(sheets.ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["egregora", "sheet", "item"],
    position: {
      width: 500,
      height: 560,
    },
    window: {
      resizable: true,
    },
    form: {
      submitOnChange: true,
    },
    actions: {
      editImage: EgregoraItemSheet.#onEditImage,
      rollItem: EgregoraItemSheet.#onRollItem,
      chatItem: EgregoraItemSheet.#onChatItem,
      repairItem: EgregoraItemSheet.#onRepairItem,
    },
  };

  static PARTS = {
    sheet: {
      template: "systems/fvtt-egregora/templates/item/item-sheet.hbs",
      scrollable: [".eg-item-body"],
    },
  };

  _onRender(context, options) {
    super._onRender(context, options);
    if (this.document.type === "spell") {
      this.element.querySelectorAll("input[data-spell-path]").forEach(cb => {
        cb.addEventListener("change", async ev => {
          ev.stopPropagation();
          const pathKey = ev.currentTarget.dataset.spellPath;
          const validOrder = Object.keys(EGREGORA_CONFIG.magicPaths);
          const next = new Set(this.document.system.selectedPaths);
          if (ev.currentTarget.checked) {
            next.add(pathKey);
          } else {
            if (next.size <= 1) {
              ev.currentTarget.checked = true;
              ui.notifications.warn(game.i18n.localize("EGREGORA.Magic.MinOnePath"));
              return;
            }
            next.delete(pathKey);
          }
          const ordered = validOrder.filter(k => next.has(k));
          await this.document.update({
            "system.paths": ordered,
            "system.primaryPath": ordered[0] || "echoes",
            "system.secondaryPath": ordered[1] || "",
          });
        });
      });
    }
  }

  async _prepareContext(options) {
    const item = this.document;
    const enrichedDescription = item.system.description
      ? await TextEditor.enrichHTML(item.system.description, {
          secrets: item.isOwner,
          relativeTo: item,
        })
      : "";

    let spellPathOptions = [];
    if (item.type === "spell") {
      const selected = item.system.selectedPaths ?? [item.system.primaryPath || "echoes"];
      spellPathOptions = Object.entries(EGREGORA_CONFIG.magicPaths).map(([key, labelKey]) => ({
        key,
        label: game.i18n.localize(labelKey),
        checked: selected.includes(key),
      }));
    }

    return {
      item,
      system: item.system,
      config: EGREGORA_CONFIG,
      spellPathOptions,
      canRepair: Boolean(item.canRepair),
      editable: this.isEditable,
      owner: item.isOwner,
      enrichedDescription,
    };
  }

  static async #onEditImage(event, target) {
    const attr = target.dataset.edit || "img";
    const current = foundry.utils.getProperty(this.document, attr);
    const fp = new FilePicker({
      type: "image",
      current,
      callback: path => this.document.update({ [attr]: path }),
    });
    return fp.browse();
  }

  static async #onRollItem(event) {
    await this.document.roll(event);
  }

  static async #onChatItem() {
    await this.document.sendToChat();
  }

  static async #onRepairItem() {
    await this.document.repair();
  }
}
