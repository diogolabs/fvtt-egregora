import { EGREGORA_CONFIG } from "../config.mjs";
import { executeSpellCast, normalizeMagicPaths } from "../helpers/rolls.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export class EgregoraSpellDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ actor, spell = null, primaryPath = null, paths = null } = {}, options = {}) {
    super(options);
    this.actor = actor;
    this.spell = spell;
    this.spellName = spell?.name || "";
    this.attribute = spell?.system?.defaultAttribute || "intelligence";
    this.selectedPaths = normalizeMagicPaths(
      paths ?? spell?.system?.selectedPaths,
      primaryPath || spell?.system?.primaryPath || "echoes",
      spell?.system?.secondaryPath || ""
    );
    this.costPool = "willpower";
    const baseCost = spell ? Number(spell.system.willpowerCost) || 1 : 1;
    this.costAmount = spell?.system?.inGrimoire ? Math.max(1, baseCost - 1) : baseCost;
    this.fetishBonus = 0;
    this.corruptionDice = 0;
    this.modifier = 0;
    this.directDamage = Boolean(spell?.system?.directDamage);

    this.options.window.title = `${game.i18n.localize("EGREGORA.Magic.Cast")}: ${spell?.name || actor.name}`;
  }

  static DEFAULT_OPTIONS = {
    classes: ["egregora", "egregora-dialog", "egregora-spell-dialog"],
    position: { width: 490 },
    window: {
      title: "EGREGORA.Magic.Cast",
      icon: "fa-solid fa-wand-sparkles",
      resizable: false,
    },
    tag: "form",
    form: {
      handler: EgregoraSpellDialog.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  static PARTS = {
    form: {
      template: "systems/fvtt-egregora/templates/dialog/spell-roller.hbs",
    },
  };

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelectorAll("select, input").forEach(el => {
      el.addEventListener("change", ev => {
        const { name, type, checked, value } = ev.currentTarget;
        if (!name) return;
        if (name === "magicPath" && type === "checkbox") {
          const pathKey = value;
          const next = new Set(this.selectedPaths);
          if (checked) {
            next.add(pathKey);
          } else {
            if (next.size <= 1) {
              // Keep at least 1 Magic Path selected
              ev.currentTarget.checked = true;
              ui.notifications.warn(game.i18n.localize("EGREGORA.Magic.MinOnePath"));
              return;
            }
            next.delete(pathKey);
          }
          this.selectedPaths = normalizeMagicPaths([...next]);
        } else if (name === "spellName") this.spellName = value;
        else if (name === "attribute") this.attribute = value;
        else if (name === "costPool") this.costPool = value;
        else if (name === "costAmount") this.costAmount = Math.max(1, Number(value) || 1);
        else if (name === "fetishBonus") this.fetishBonus = Math.max(0, Number(value) || 0);
        else if (name === "corruptionDice") this.corruptionDice = Math.max(0, Number(value) || 0);
        else if (name === "modifier") this.modifier = Number(value) || 0;
        else if (name === "directDamage" && type === "checkbox") this.directDamage = checked;
        this.render();
      });
    });
  }

  async _prepareContext() {
    const attrVal = Number(this.actor?.system?.attributes?.[this.attribute]?.value) || 0;
    const pathOptions = Object.entries(EGREGORA_CONFIG.magicPaths).map(([key, labelKey]) => ({
      key,
      label: game.i18n.localize(labelKey),
      focus: Number(this.actor?.system?.magic?.paths?.[key]) || 0,
      checked: this.selectedPaths.includes(key),
    }));

    const selectedValues = this.selectedPaths.map(
      key => Number(this.actor?.system?.magic?.paths?.[key]) || 0
    );
    const effectivePath = selectedValues.length ? Math.min(...selectedValues) : 0;
    const highestPath = selectedValues.length ? Math.max(...selectedValues) : 0;
    const totalDice = Math.max(0, attrVal + effectivePath + this.fetishBonus + this.modifier) + this.corruptionDice;
    const selectedPathsDisplay = this.selectedPaths
      .map(key => game.i18n.localize(EGREGORA_CONFIG.magicPaths[key]))
      .join(" + ");

    return {
      actor: this.actor,
      spell: this.spell,
      config: EGREGORA_CONFIG,
      spellName: this.spellName,
      attribute: this.attribute,
      attrVal,
      pathOptions,
      selectedPaths: this.selectedPaths,
      selectedPathsCount: this.selectedPaths.length,
      selectedPathsDisplay,
      effectivePath,
      highestPath,
      costPool: this.costPool,
      costAmount: this.costAmount,
      fetishBonus: this.fetishBonus,
      corruptionDice: this.corruptionDice,
      modifier: this.modifier,
      directDamage: this.directDamage,
      totalDice,
      wpAvailable: this.actor?.system?.willpower?.value ?? 0,
      hpAvailable: this.actor?.system?.health?.value ?? 0,
      pmAvailable: this.actor?.system?.mental?.value ?? 0,
    };
  }

  static async #onSubmit(event, form, formData) {
    const raw = formData?.object ?? {};
    const directDamage = form?.querySelector("input[name='directDamage']")
      ? Boolean(form.querySelector("input[name='directDamage']").checked)
      : (raw.directDamage !== undefined ? Boolean(raw.directDamage) : this.directDamage);

    await executeSpellCast(this.actor, {
      spell: this.spell,
      spellName: raw.spellName ?? this.spellName,
      attribute: raw.attribute || this.attribute,
      paths: this.selectedPaths,
      primaryPath: this.selectedPaths[0] || "echoes",
      secondaryPath: this.selectedPaths[1] || "",
      costPool: raw.costPool || this.costPool,
      costAmount: raw.costAmount !== undefined ? Math.max(1, Number(raw.costAmount) || 1) : this.costAmount,
      fetishBonus: raw.fetishBonus !== undefined ? Math.max(0, Number(raw.fetishBonus) || 0) : this.fetishBonus,
      corruptionDice: raw.corruptionDice !== undefined ? Math.max(0, Number(raw.corruptionDice) || 0) : this.corruptionDice,
      modifier: raw.modifier !== undefined ? (Number(raw.modifier) || 0) : this.modifier,
      directDamage,
    });
  }
}
