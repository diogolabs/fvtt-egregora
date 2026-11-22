import { EGREGORA_CONFIG } from "../config.mjs";
import { EgregoraRollDialog } from "../applications/roll-dialog.mjs";
import { EgregoraSpellDialog } from "../applications/spell-dialog.mjs";
import {
  executeEgregoraRoll,
  rollContaminationTest,
  rollCriticalTable,
  rollFearTest,
  rollHibernationTest,
  rollMutationTable,
  rollPanicTable,
  rollPermanentTraumaCheck,
  rollVehicleCritTable,
} from "../helpers/rolls.mjs";

export class EgregoraActor extends foundry.documents.Actor {
  get isBroken() {
    if (this.type === "vehicle") {
      return Boolean(this.system.wrecked) || (this.system.hull?.value ?? 1) <= 0;
    }
    return (this.system.health?.value ?? 1) <= 0 || (this.system.mental?.value ?? 1) <= 0;
  }

  findSkill(nameOrKey) {
    if (!nameOrKey) return null;
    const norm = String(nameOrKey).trim().toLowerCase();
    const coreMatch = EGREGORA_CONFIG.coreSkills.find(
      sk => sk.key.toLowerCase() === norm || game.i18n.localize(sk.nameKey).trim().toLowerCase() === norm
    );
    const targetKey = coreMatch?.key?.toLowerCase() ?? norm;
    return this.items.find(it =>
      it.type === "skill" &&
      (
        it.system.skillKey?.toLowerCase() === targetKey ||
        it.system.skillKey?.toLowerCase() === norm ||
        it.name.trim().toLowerCase() === norm
      )
    ) || null;
  }

  async seedCoreSkills() {
    if (!["character", "npc"].includes(this.type)) return;
    const existingKeys = new Set(
      this.items
        .filter(i => i.type === "skill")
        .map(i => (i.system.skillKey || i.name).toLowerCase())
    );

    const toCreate = [];
    for (const sk of EGREGORA_CONFIG.coreSkills) {
      const locName = game.i18n.localize(sk.nameKey);
      if (existingKeys.has(sk.key.toLowerCase()) || existingKeys.has(locName.toLowerCase())) {
        continue;
      }
      toCreate.push({
        name: locName,
        type: "skill",
        img: "systems/fvtt-egregora/assets/icons/skill.svg",
        system: {
          skillKey: sk.key,
          attribute: sk.attribute,
          level: 0,
          isKeySkill: false,
        },
      });
    }

    if (toCreate.length > 0) {
      await this.createEmbeddedDocuments("Item", toCreate);
    }
  }

  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

    const updates = {};
    const defaultIcons = {
      character: "systems/fvtt-egregora/assets/icons/character.svg",
      npc: "systems/fvtt-egregora/assets/icons/npc.svg",
      vehicle: "systems/fvtt-egregora/assets/icons/vehicle.svg",
    };

    if (!data.img || data.img === "icons/svg/mystery-man.svg") {
      updates.img = defaultIcons[data.type] || "icons/svg/mystery-man.svg";
    }

    if (data.type === "character") {
      updates.prototypeToken = {
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        sight: { enabled: true },
      };
    } else if (data.type === "vehicle") {
      updates.prototypeToken = {
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
      };
    }

    let autoSeed = true;
    try {
      autoSeed = game.settings.get(EGREGORA_CONFIG.ID, "autoSeedCoreSkills");
    } catch {
      autoSeed = true;
    }

    if (autoSeed && ["character", "npc"].includes(data.type) && !data.items?.some(i => i.type === "skill")) {
      const existingItems = Array.isArray(data.items) ? [...data.items] : [];
      for (const sk of EGREGORA_CONFIG.coreSkills) {
        existingItems.push({
          name: game.i18n.localize(sk.nameKey),
          type: "skill",
          img: "systems/fvtt-egregora/assets/icons/skill.svg",
          system: {
            skillKey: sk.key,
            attribute: sk.attribute,
            level: 0,
            isKeySkill: false,
          },
        });
      }
      updates.items = existingItems;
    }

    this.updateSource(updates);
  }

  async openRollDialog(options = {}, event = null) {
    const dialog = new EgregoraRollDialog({
      actor: this,
      ...options,
    });
    return dialog.wait(event);
  }

  async openSpellDialog(options = {}) {
    const dialog = new EgregoraSpellDialog({
      actor: this,
      ...options,
    });
    dialog.render(true);
    return dialog;
  }

  async rollArmor(armorItem) {
    const rating = Number(armorItem.system.protection) || 0;
    if (rating <= 0) {
      ui.notifications.warn(game.i18n.localize("EGREGORA.Notifications.NoDiceToRoll"));
      return null;
    }
    return executeEgregoraRoll(this, {
      gear: armorItem,
      gearBonus: rating,
      maxPush: 0,
      flavor: `${game.i18n.localize("EGREGORA.Armor.Roll")}: ${armorItem.name}`,
      rollType: "armor",
    });
  }

  async rollContamination() {
    return rollContaminationTest(this);
  }

  async rollFear(attribute = "intelligence", allies = 0) {
    return rollFearTest(this, attribute, allies);
  }

  async rollPanic() {
    return rollPanicTable(this);
  }

  async rollPermanentTrauma() {
    return rollPermanentTraumaCheck(this);
  }

  async rollCritical() {
    return rollCriticalTable(this, true);
  }

  async rollMutation(tier = null) {
    const pc = Number(this.system.corruption?.value) || 0;
    const resolvedTier = tier || (pc >= 8 ? "aberrant" : pc >= 6 ? "notable" : "minor");
    return rollMutationTable(this, resolvedTier, true);
  }

  async rollHibernation(modifier = 0) {
    return rollHibernationTest(this, modifier);
  }

  async rollVehicleCritical() {
    return rollVehicleCritTable(this);
  }
}
