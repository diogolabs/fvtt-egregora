import { EGREGORA_CONFIG } from "../config.mjs";
import { executeSpellCast } from "../helpers/rolls.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export class EgregoraSpellDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ actor, spell = null, primaryPath = null } = {}, options = {}) {
    super(options);
    this.actor = actor;
    this.spell = spell;
    this.spellName = spell?.name || "";
    this.attribute = spell?.system?.defaultAttribute || "intelligence";
    this.primaryPath = primaryPath || spell?.system?.primaryPath || "echoes";
    this.secondaryPath = spell?.system?.secondaryPath || "";
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
    position: { width: 470 },
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
        if (name === "spellName") this.spellName = value;
        else if (name === "attribute") this.attribute = value;
        else if (name === "primaryPath") this.primaryPath = value;
        else if (name === "secondaryPath") this.secondaryPath = value;
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
    const p1 = Number(this.actor?.system?.magic?.paths?.[this.primaryPath]) || 0;
    const p2 = this.secondaryPath ? (Number(this.actor?.system?.magic?.paths?.[this.secondaryPath]) || 0) : null;
    const effectivePath = p2 !== null ? Math.min(p1, p2) : p1;
    const totalDice = Math.max(0, attrVal + effectivePath + this.fetishBonus + this.modifier) + this.corruptionDice;

    return {
      actor: this.actor,
      spell: this.spell,
      config: EGREGORA_CONFIG,
      spellName: this.spellName,
      attribute: this.attribute,
      attrVal,
      primaryPath: this.primaryPath,
      secondaryPath: this.secondaryPath,
      effectivePath,
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

  static async #onSubmit() {
    await executeSpellCast(this.actor, {
      spell: this.spell,
      spellName: this.spellName,
      attribute: this.attribute,
      primaryPath: this.primaryPath,
      secondaryPath: this.secondaryPath,
      costPool: this.costPool,
      costAmount: this.costAmount,
      fetishBonus: this.fetishBonus,
      corruptionDice: this.corruptionDice,
      modifier: this.modifier,
      directDamage: this.directDamage,
    });
  }
}
