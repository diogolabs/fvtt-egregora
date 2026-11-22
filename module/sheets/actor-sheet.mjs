import { EGREGORA_CONFIG } from "../config.mjs";
import { executeEgregoraRoll } from "../helpers/rolls.mjs";

const { api, sheets } = foundry.applications;
const TextEditor = foundry.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
const FilePicker = foundry.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;

export class EgregoraActorSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["egregora", "sheet", "actor"],
    position: {
      width: 840,
      height: 860,
    },
    window: {
      resizable: true,
    },
    form: {
      submitOnChange: true,
    },
    actions: {
      editImage: EgregoraActorSheet.#onEditImage,
      switchTab: EgregoraActorSheet.#onSwitchTab,
      setAttributeBox: EgregoraActorSheet.#onSetAttributeBox,
      setTrackBox: EgregoraActorSheet.#onSetTrackBox,
      rollAttribute: EgregoraActorSheet.#onRollAttribute,
      rollItem: EgregoraActorSheet.#onRollItem,
      chatItem: EgregoraActorSheet.#onChatItem,
      createItem: EgregoraActorSheet.#onCreateItem,
      editItem: EgregoraActorSheet.#onEditItem,
      deleteItem: EgregoraActorSheet.#onDeleteItem,
      toggleItemBool: EgregoraActorSheet.#onToggleItemBool,
      seedCoreSkills: EgregoraActorSheet.#onSeedCoreSkills,
      castMagicPath: EgregoraActorSheet.#onCastMagicPath,
      rollContamination: EgregoraActorSheet.#onRollContamination,
      rollFear: EgregoraActorSheet.#onRollFear,
      rollPanic: EgregoraActorSheet.#onRollPanic,
      rollPermanentTrauma: EgregoraActorSheet.#onRollPermanentTrauma,
      rollMutation: EgregoraActorSheet.#onRollMutation,
      rollCritTable: EgregoraActorSheet.#onRollCritTable,
      rollHibernation: EgregoraActorSheet.#onRollHibernation,
      rollResources: EgregoraActorSheet.#onRollResources,
      rollVehicleDrive: EgregoraActorSheet.#onRollVehicleDrive,
      rollVehicleRam: EgregoraActorSheet.#onRollVehicleRam,
      rollVehicleArmor: EgregoraActorSheet.#onRollVehicleArmor,
      rollVehicleCrit: EgregoraActorSheet.#onRollVehicleCrit,
    },
  };

  static PARTS = {
    nav: {
      template: "systems/fvtt-egregora/templates/actor/sheet-nav.hbs",
    },
    main: {
      template: "systems/fvtt-egregora/templates/actor/main.hbs",
      scrollable: [""],
    },
    occult: {
      template: "systems/fvtt-egregora/templates/actor/occult.hbs",
      scrollable: [""],
    },
    biography: {
      template: "systems/fvtt-egregora/templates/actor/biography.hbs",
      scrollable: [""],
    },
    npc: {
      template: "systems/fvtt-egregora/templates/actor/npc.hbs",
      scrollable: [""],
    },
    vehicle: {
      template: "systems/fvtt-egregora/templates/actor/vehicle.hbs",
      scrollable: [""],
    },
  };

  #activeTab = "main";

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    if (!this.options.classes.includes(this.document.type)) {
      this.options.classes.push(this.document.type);
    }

    if (this.document.type === "npc") {
      options.parts = ["npc"];
    } else if (this.document.type === "vehicle") {
      options.parts = ["vehicle"];
    } else {
      options.parts = ["nav", "main", "occult", "biography"];
    }
  }

  _onRender(context, options) {
    super._onRender(context, options);

    // Inline edits for embedded Items (level, damage, bonus, protection, agilityPenalty, durability, points)
    this.element.querySelectorAll("[data-item-field]").forEach(el => {
      el.addEventListener("change", async ev => {
        ev.stopPropagation();
        const row = ev.currentTarget.closest("[data-item-id]");
        const item = this.actor.items.get(row?.dataset?.itemId);
        if (!item) return;
        const field = ev.currentTarget.dataset.itemField;
        const value = ev.currentTarget.type === "checkbox"
          ? ev.currentTarget.checked
          : ev.currentTarget.dataset.dtype === "Number"
            ? Number(ev.currentTarget.value) || 0
            : ev.currentTarget.value;
        await item.update({ [field]: value });
      });
    });

    // Enforce active tab visibility for character sheet
    if (this.document.type === "character") {
      this.element.querySelectorAll(".eg-tab-panel").forEach(panel => {
        panel.classList.toggle("active", panel.dataset.tab === this.#activeTab);
      });
      this.element.querySelectorAll("[data-action='switchTab']").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === this.#activeTab);
      });
    }
  }

  async _prepareContext(options) {
    const actor = this.document;
    const system = actor.system;
    const items = [...actor.items];

    // Group skills by attribute in official sheet order
    const coreOrder = new Map(EGREGORA_CONFIG.coreSkills.map((s, idx) => [s.key, idx]));
    const skills = items
      .filter(i => i.type === "skill")
      .sort((a, b) => {
        const oa = coreOrder.has(a.system.skillKey) ? coreOrder.get(a.system.skillKey) : 99;
        const ob = coreOrder.has(b.system.skillKey) ? coreOrder.get(b.system.skillKey) : 99;
        if (oa !== ob) return oa - ob;
        return a.name.localeCompare(b.name);
      });

    const skillGroups = ["strength", "agility", "intelligence", "empathy"].map(attr => ({
      attribute: attr,
      attributeLabel: game.i18n.localize(EGREGORA_CONFIG.attributes[attr]),
      skills: skills.filter(s => s.system.attribute === attr),
    }));

    const talents = items.filter(i => i.type === "talent").sort((a, b) => a.name.localeCompare(b.name));
    const qualities = items.filter(i => i.type === "quality").sort((a, b) => a.name.localeCompare(b.name));
    const defects = items.filter(i => i.type === "defect").sort((a, b) => a.name.localeCompare(b.name));
    const gear = items.filter(i => i.type === "gear").sort((a, b) => a.name.localeCompare(b.name));
    const weapons = items.filter(i => i.type === "weapon").sort((a, b) => a.name.localeCompare(b.name));
    const armors = items.filter(i => i.type === "armor").sort((a, b) => a.name.localeCompare(b.name));
    const spells = items.filter(i => i.type === "spell").sort((a, b) => a.name.localeCompare(b.name));
    const mutations = items.filter(i => i.type === "mutation").sort((a, b) => a.name.localeCompare(b.name));
    const criticals = items.filter(i => i.type === "critical").sort((a, b) => a.name.localeCompare(b.name));

    // Build interactive boxes for attributes (6 boxes matching official sheet visual)
    const attributeEntries = ["strength", "agility", "intelligence", "empathy"].map(key => {
      const val = Number(system.attributes?.[key]?.value) || 0;
      const boxes = [];
      for (let i = 1; i <= 6; i++) {
        boxes.push({ index: i, filled: i <= val });
      }
      return {
        key,
        label: game.i18n.localize(EGREGORA_CONFIG.attributes[key]),
        value: val,
        boxes,
      };
    });

    // Willpower & Corruption 10-box tracks
    const wpVal = Number(system.willpower?.value) || 0;
    const willpowerBoxes = Array.from({ length: 10 }, (_, idx) => ({
      index: idx + 1,
      filled: idx + 1 <= wpVal,
    }));

    const pcVal = Number(system.corruption?.value) || 0;
    const corruptionBoxes = Array.from({ length: 10 }, (_, idx) => ({
      index: idx + 1,
      filled: idx + 1 <= pcVal,
      milestone: [4, 6, 8, 10].includes(idx + 1),
    }));

    // Magic Paths rows
    const magicPaths = Object.entries(EGREGORA_CONFIG.magicPaths).map(([key, labelKey]) => ({
      key,
      label: game.i18n.localize(labelKey),
      value: Number(system.magic?.paths?.[key]) || 0,
    }));

    const enrichedBiography = system.biography
      ? await TextEditor.enrichHTML(system.biography, { secrets: actor.isOwner, relativeTo: actor })
      : "";
    const enrichedNotes = system.notes
      ? await TextEditor.enrichHTML(system.notes, { secrets: actor.isOwner, relativeTo: actor })
      : "";

    const effects = [...actor.effects].map(e => ({
      id: e.id,
      name: e.name,
      img: e.img,
      disabled: e.disabled,
      duration: e.duration?.label || "",
    }));

    return {
      actor,
      system,
      config: EGREGORA_CONFIG,
      editable: this.isEditable,
      owner: actor.isOwner,
      isGM: game.user.isGM,
      activeTab: this.#activeTab,
      isBroken: actor.isBroken,
      attributeEntries,
      willpowerBoxes,
      corruptionBoxes,
      corruptionStageLabel: system.corruptionStage?.labelKey
        ? game.i18n.localize(system.corruptionStage.labelKey)
        : "",
      magicPaths,
      skills,
      skillGroups,
      talents,
      qualities,
      defects,
      gear,
      weapons,
      armors,
      spells,
      mutations,
      criticals,
      effects,
      enrichedBiography,
      enrichedNotes,
      doomPoints: game.settings.get(EGREGORA_CONFIG.ID, "doomPoints") || 0,
      enableDoomPoints: game.settings.get(EGREGORA_CONFIG.ID, "enableDoomPoints") || false,
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

  static #onSwitchTab(event, target) {
    const tab = target.dataset.tab;
    if (!tab) return;
    this.#activeTab = tab;
    this.element.querySelectorAll(".eg-tab-panel").forEach(panel => {
      panel.classList.toggle("active", panel.dataset.tab === tab);
    });
    this.element.querySelectorAll("[data-action='switchTab']").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });
  }

  static async #onSetAttributeBox(event, target) {
    if (!this.isEditable) return;
    const attr = target.dataset.attribute;
    const idx = Number(target.dataset.index) || 0;
    const current = Number(this.actor.system.attributes?.[attr]?.value) || 0;
    const nextVal = current === idx ? Math.max(0, idx - 1) : idx;
    await this.actor.update({ [`system.attributes.${attr}.value`]: nextVal });
  }

  static async #onSetTrackBox(event, target) {
    if (!this.isEditable) return;
    const field = target.dataset.field;
    const idx = Number(target.dataset.index) || 0;
    const current = Number(foundry.utils.getProperty(this.actor, field)) || 0;
    const nextVal = current === idx ? Math.max(0, idx - 1) : idx;
    await this.actor.update({ [field]: nextVal });

    if (field === "system.corruption.value" && nextVal > current) {
      if ([4, 6, 8].includes(nextVal)) {
        ui.notifications.warn(game.i18n.format("EGREGORA.Notifications.CorruptionMutationMilestone", { pc: nextVal }));
      } else if (nextVal >= 10) {
        ui.notifications.error(game.i18n.localize("EGREGORA.Notifications.ShadowBeastReached"));
      }
    }
  }

  static async #onRollAttribute(event, target) {
    const attribute = target.dataset.attribute || "strength";
    await this.actor.openRollDialog({ attribute }, event);
  }

  static async #onRollItem(event, target) {
    const itemId = target.closest("[data-item-id]")?.dataset?.itemId;
    const item = this.actor.items.get(itemId);
    if (item) await item.roll(event);
  }

  static async #onChatItem(event, target) {
    const itemId = target.closest("[data-item-id]")?.dataset?.itemId;
    const item = this.actor.items.get(itemId);
    if (item) await item.sendToChat();
  }

  static async #onCreateItem(event, target) {
    const type = target.dataset.type || "gear";
    const defaultName = game.i18n.localize(`TYPES.Item.${type}`);
    const itemData = {
      name: `${game.i18n.localize("EGREGORA.New")} ${defaultName}`,
      type,
      system: {},
    };
    if (type === "skill" && target.dataset.attribute) {
      itemData.system.attribute = target.dataset.attribute;
    }
    const [created] = await this.actor.createEmbeddedDocuments("Item", [itemData]);
    created?.sheet?.render(true);
  }

  static #onEditItem(event, target) {
    const itemId = target.closest("[data-item-id]")?.dataset?.itemId;
    const item = this.actor.items.get(itemId);
    item?.sheet?.render(true);
  }

  static async #onDeleteItem(event, target) {
    const itemId = target.closest("[data-item-id]")?.dataset?.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    await item.delete();
  }

  static async #onToggleItemBool(event, target) {
    const itemId = target.closest("[data-item-id]")?.dataset?.itemId;
    const field = target.dataset.field;
    const item = this.actor.items.get(itemId);
    if (!item || !field) return;
    const cur = Boolean(foundry.utils.getProperty(item, field));
    await item.update({ [field]: !cur });
  }

  static async #onSeedCoreSkills() {
    await this.actor.seedCoreSkills();
  }

  static async #onCastMagicPath(event, target) {
    const primaryPath = target.dataset.path || "echoes";
    await this.actor.openSpellDialog({ primaryPath });
  }

  static async #onRollContamination() {
    await this.actor.rollContamination();
  }

  static async #onRollFear(event, target) {
    const attr = target.dataset.attribute || "intelligence";
    await this.actor.rollFear(attr, 0);
  }

  static async #onRollPanic() {
    await this.actor.rollPanic();
  }

  static async #onRollPermanentTrauma() {
    await this.actor.rollPermanentTrauma();
  }

  static async #onRollMutation(event, target) {
    const tier = target.dataset.tier || null;
    await this.actor.rollMutation(tier);
  }

  static async #onRollCritTable() {
    await this.actor.rollCritical();
  }

  static async #onRollHibernation() {
    await this.actor.rollHibernation(0);
  }

  static async #onRollResources() {
    const res = Number(this.actor.system.resources) || 0;
    await executeEgregoraRoll(this.actor, {
      attrScore: res,
      maxPush: 0,
      flavor: game.i18n.localize("EGREGORA.ResourcesRoll"),
      rollType: "resources",
    });
  }

  static async #onRollVehicleDrive() {
    const man = Number(this.actor.system.maneuverability) || 0;
    await executeEgregoraRoll(this.actor, {
      gearBonus: Math.max(0, man),
      modifier: man < 0 ? man : 0,
      maxPush: 1,
      flavor: `${game.i18n.localize("EGREGORA.Vehicle.Maneuver")}: ${this.actor.name}`,
      rollType: "vehicle",
    });
  }

  static async #onRollVehicleRam() {
    const man = Number(this.actor.system.maneuverability) || 0;
    await executeEgregoraRoll(this.actor, {
      gearBonus: Math.max(1, man),
      damage: this.actor.system.rammingDamage || 1,
      maxPush: 1,
      flavor: `${game.i18n.localize("EGREGORA.Vehicle.Ram")}: ${this.actor.name}`,
      rollType: "attack",
    });
  }

  static async #onRollVehicleArmor() {
    const armor = Number(this.actor.system.armor) || 0;
    await executeEgregoraRoll(this.actor, {
      gearBonus: armor,
      maxPush: 0,
      flavor: `${game.i18n.localize("EGREGORA.Vehicle.ArmorRoll")}: ${this.actor.name}`,
      rollType: "armor",
    });
  }

  static async #onRollVehicleCrit() {
    await this.actor.rollVehicleCritical();
  }
}
