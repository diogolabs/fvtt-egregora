import { EGREGORA_CONFIG } from "../config.mjs";
import {
  computeDicePool,
  executeEgregoraRoll,
  getDefaultRollMode,
  normalizeRollMode,
} from "../helpers/rolls.mjs";

const { HandlebarsApplicationMixin, ApplicationV2, DialogV2 } = foundry.applications.api;

export class EgregoraRollDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({
    actor,
    attribute = "strength",
    skill = null,
    gear = null,
    talent = null,
    modifier = 0,
    maxPush = undefined,
    customTitle = "",
  } = {}, options = {}) {
    super(options);
    this.actor = actor;
    this.attribute = attribute || skill?.system?.attribute || "strength";
    this.skillId = skill?.id || "";
    this.gearId = gear?.id || "";
    this.talentId = talent?.id || "";
    this.difficultyMod = 0;
    this.helpDice = 0;
    this.customMod = Number(modifier) || 0;
    this.corruptionDice = 0;
    this.aimedShot = false;
    this.usePride = false;
    this.passiveRoll = maxPush === 0;
    this.overrideMaxPush = maxPush;
    this.customTitle = customTitle;

    this.options.window.title = customTitle || `${actor.name} — ${game.i18n.localize("EGREGORA.RollDialog.Title")}`;
  }

  static DEFAULT_OPTIONS = {
    classes: ["egregora", "egregora-dialog", "egregora-roll-dialog"],
    position: { width: 470 },
    window: {
      title: "EGREGORA.RollDialog.Title",
      icon: "fa-solid fa-dice-d6",
      resizable: false,
    },
    tag: "form",
    form: {
      handler: EgregoraRollDialog.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: false,
    },
    actions: {
      adjustMod: EgregoraRollDialog.#onAdjustMod,
    },
  };

  static PARTS = {
    form: {
      template: "systems/fvtt-egregora/templates/dialog/roller.hbs",
    },
  };

  get selectedSkill() {
    return this.actor.items.get(this.skillId) || null;
  }

  get selectedGear() {
    return this.actor.items.get(this.gearId) || null;
  }

  get selectedTalent() {
    return this.actor.items.get(this.talentId) || null;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelectorAll("select, input[type='number'], input[type='checkbox']").forEach(el => {
      el.addEventListener("change", ev => this.#onFieldChange(ev));
    });
  }

  #onFieldChange(event) {
    const target = event.currentTarget;
    const name = target.name;
    if (!name) return;

    if (name === "attribute") this.attribute = target.value;
    else if (name === "skillId") {
      this.skillId = target.value;
      const sk = this.selectedSkill;
      if (sk?.system?.attribute) this.attribute = sk.system.attribute;
    } else if (name === "gearId") this.gearId = target.value;
    else if (name === "talentId") this.talentId = target.value;
    else if (name === "difficultyMod") this.difficultyMod = Number(target.value) || 0;
    else if (name === "helpDice") this.helpDice = Math.min(3, Math.max(0, Number(target.value) || 0));
    else if (name === "customMod") this.customMod = Number(target.value) || 0;
    else if (name === "corruptionDice") this.corruptionDice = Math.max(0, Number(target.value) || 0);
    else if (name === "aimedShot") this.aimedShot = target.checked;
    else if (name === "usePride") this.usePride = target.checked;
    else if (name === "passiveRoll") this.passiveRoll = target.checked;

    this.render();
  }

  static #onAdjustMod(event, target) {
    const delta = Number(target.dataset.delta) || 0;
    this.customMod += delta;
    this.render();
  }

  async _prepareContext() {
    const actor = this.actor;
    const skill = this.selectedSkill;
    const gear = this.selectedGear;
    const talent = this.selectedTalent;

    const attrData = actor.system.attributes?.[this.attribute] ?? { value: 3, mod: 0 };
    const attrScore = Math.max(0, (Number(attrData.value) || 0) + (Number(attrData.mod) || 0));
    const skillScore = skill ? Number(skill.system.level) || 0 : 0;
    const gearBonus = gear ? Number(gear.system.bonus) || 0 : 0;
    const talentMod = talent ? Number(talent.system.modifier) || 0 : 0;

    // Penalidade de armadura em testes de Agilidade
    const armorPenalty = this.attribute === "agility" ? (Number(actor.system.armorPenalty) || 0) : 0;
    // Penalidade de estágio de Corrupção em Empatia (Manchado/Corrompido -1, Deformado -2)
    const pc = Number(actor.system.corruption?.value) || 0;
    const corruptionSocialPenalty = this.attribute === "empathy" && pc >= 1
      ? (pc >= 7 ? -2 : -1)
      : 0;

    const aimMod = this.aimedShot ? 2 : 0;
    const totalModifier = this.difficultyMod + this.helpDice + this.customMod + talentMod + armorPenalty + corruptionSocialPenalty + aimMod;

    const maxCorruptionDice = Math.min(attrScore, Math.max(0, 10 - pc));
    const corruptionDice = Math.min(this.corruptionDice, maxCorruptionDice);
    this.corruptionDice = corruptionDice;

    const poolPreview = computeDicePool(attrScore, skillScore, gearBonus, totalModifier);
    const parts = [];
    if (poolPreview.base > 0) parts.push(`${poolPreview.base} ${game.i18n.localize("EGREGORA.RollDialog.Base")}`);
    if (poolPreview.skill > 0) parts.push(`${poolPreview.skill} ${game.i18n.localize("EGREGORA.RollDialog.Skill")}`);
    if (poolPreview.gear > 0) parts.push(`${poolPreview.gear} ${game.i18n.localize("EGREGORA.RollDialog.Gear")}`);
    if (corruptionDice > 0) parts.push(`${corruptionDice} ${game.i18n.localize("EGREGORA.Corruption.Label")}`);
    const previewText = parts.join(" + ") || "0D6";

    const skills = actor.items.filter(i => i.type === "skill").sort((a, b) => a.name.localeCompare(b.name));
    const gears = actor.items.filter(i => ["weapon", "gear"].includes(i.type)).sort((a, b) => a.name.localeCompare(b.name));
    const talents = actor.items.filter(i => i.type === "talent").sort((a, b) => a.name.localeCompare(b.name));
    const canUsePride = Boolean(actor.system.traits?.pride?.text) && !actor.system.traits.pride.used;

    return {
      actor,
      config: EGREGORA_CONFIG,
      attribute: this.attribute,
      attrScore,
      skillId: this.skillId,
      skill,
      skillScore,
      gearId: this.gearId,
      gear,
      gearBonus,
      talentId: this.talentId,
      talent,
      talentMod,
      armorPenalty,
      corruptionSocialPenalty,
      difficultyMod: this.difficultyMod,
      helpDice: this.helpDice,
      customMod: this.customMod,
      corruptionDice,
      maxCorruptionDice,
      currentCorruption: pc,
      aimedShot: this.aimedShot,
      totalModifier,
      canUsePride,
      usePride: this.usePride,
      passiveRoll: this.passiveRoll,
      previewText,
      skills,
      gears,
      talents,
    };
  }

  static async #onSubmit(event) {
    const rollMode = normalizeRollMode(event.submitter?.dataset?.rollMode || getDefaultRollMode());
    await this._performRoll(rollMode);
  }

  async _performRoll(rollMode) {
    if (this.actor.isBroken) {
      const proceed = await DialogV2.confirm({
        window: { title: this.actor.name, icon: "fa-solid fa-skull" },
        content: `<p>${game.i18n.format("EGREGORA.RollDialog.ActorBrokenConfirm", { name: this.actor.name })}</p>`,
        modal: true,
      });
      if (!proceed) return null;
    }

    const ctx = await this._prepareContext();
    const attrLabel = game.i18n.localize(EGREGORA_CONFIG.attributes[ctx.attribute] || ctx.attribute);
    const labelParts = [];
    if (this.customTitle) {
      labelParts.push(this.customTitle);
    } else {
      if (ctx.skill) labelParts.push(`${ctx.skill.name} (${attrLabel})`);
      else labelParts.push(attrLabel);
      if (ctx.gear) labelParts.push(ctx.gear.name);
      if (ctx.talent) labelParts.push(ctx.talent.name);
    }

    const maxPush = (this.passiveRoll || this.overrideMaxPush === 0) ? 0 : (this.overrideMaxPush ?? 1);

    const breakdown = [];
    if (ctx.armorPenalty !== 0) breakdown.push(`${game.i18n.localize("EGREGORA.Armor.Penalty")}: ${ctx.armorPenalty}`);
    if (ctx.corruptionSocialPenalty !== 0) breakdown.push(`${game.i18n.localize("EGREGORA.Corruption.Label")}: ${ctx.corruptionSocialPenalty}`);
    if (ctx.talentMod !== 0) breakdown.push(`${ctx.talent.name}: ${ctx.talentMod > 0 ? "+" : ""}${ctx.talentMod}`);
    if (ctx.difficultyMod !== 0) breakdown.push(`${game.i18n.localize("EGREGORA.Difficulty.Label")}: ${ctx.difficultyMod > 0 ? "+" : ""}${ctx.difficultyMod}`);
    if (ctx.helpDice > 0) breakdown.push(`${game.i18n.localize("EGREGORA.Help")}: +${ctx.helpDice}`);
    if (ctx.aimedShot) breakdown.push(`${game.i18n.localize("EGREGORA.AimedShot")}: +2`);
    if (ctx.customMod !== 0) breakdown.push(`${game.i18n.localize("EGREGORA.Modifier")}: ${ctx.customMod > 0 ? "+" : ""}${ctx.customMod}`);

    const damage = ctx.gear?.type === "weapon" ? Number(ctx.gear.system.damage) || 0 : 0;

    this.close();
    this.result = executeEgregoraRoll(this.actor, {
      attribute: ctx.attribute,
      attrScore: ctx.attrScore,
      skill: ctx.skill,
      skillScore: ctx.skillScore,
      gear: ctx.gear,
      gearBonus: ctx.gearBonus,
      corruptionDice: ctx.corruptionDice,
      modifier: ctx.totalModifier,
      maxPush,
      flavor: labelParts.join(" + "),
      damage,
      usePride: ctx.usePride,
      rollMode,
      rollType: ctx.gear?.type === "weapon" ? "attack" : "skill",
      breakdown,
    });
    return this.result;
  }

  async wait(event = null) {
    if (event?.shiftKey) {
      return this._performRoll(getDefaultRollMode());
    }
    return new Promise(resolve => {
      this.addEventListener("close", async () => {
        resolve(await this.result);
      }, { once: true });
      this.render(true);
    });
  }
}
