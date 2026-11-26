const getRenderTemplate = () =>
  foundry.applications?.handlebars?.renderTemplate ?? globalThis.renderTemplate;

export class EgregoraItem extends foundry.documents.Item {
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

    const defaultIcons = {
      skill: "systems/fvtt-egregora/assets/icons/skill.svg",
      talent: "systems/fvtt-egregora/assets/icons/talent.svg",
      quality: "systems/fvtt-egregora/assets/icons/quality.svg",
      defect: "systems/fvtt-egregora/assets/icons/defect.svg",
      gear: "systems/fvtt-egregora/assets/icons/gear.svg",
      weapon: "systems/fvtt-egregora/assets/icons/weapon.svg",
      armor: "systems/fvtt-egregora/assets/icons/armor.svg",
      spell: "systems/fvtt-egregora/assets/icons/spell.svg",
      mutation: "systems/fvtt-egregora/assets/icons/mutation.svg",
      critical: "systems/fvtt-egregora/assets/icons/critical.svg",
    };

    const updates = {};
    if (!data.img || data.img === "icons/svg/item-bag.svg") {
      updates.img = defaultIcons[data.type] || "icons/svg/item-bag.svg";
    }
    if (data.type === "weapon" && !data.system?.skill) {
      updates["system.skill"] = game.i18n.localize("EGREGORA.Skill.melee");
    }
    if (data.type === "weapon") {
      if (data.system?.bonus !== undefined && data.system?.maxBonus === undefined) {
        updates["system.maxBonus"] = Number(data.system.bonus) || 0;
      }
      if (data.system?.durability !== undefined && data.system?.maxDurability === undefined) {
        updates["system.maxDurability"] = Number(data.system.durability) || 0;
      }
    } else if (data.type === "gear") {
      if (data.system?.bonus !== undefined && data.system?.maxBonus === undefined) {
        updates["system.maxBonus"] = Number(data.system.bonus) || 0;
      }
      if (data.system?.durability !== undefined && data.system?.maxDurability === undefined) {
        updates["system.maxDurability"] = Number(data.system.durability) || 0;
      }
    } else if (data.type === "armor") {
      if (data.system?.protection !== undefined && data.system?.maxProtection === undefined) {
        updates["system.maxProtection"] = Number(data.system.protection) || 0;
      }
    }
    if (Object.keys(updates).length > 0) {
      this.updateSource(updates);
    }
  }

  get isBrokenGear() {
    if (this.type === "weapon" || this.type === "gear") {
      const maxDur = Number(this.system.maxDurability) || 0;
      const curDur = Number(this.system.durability) || 0;
      return maxDur > 0 && curDur <= 0;
    }
    if (this.type === "armor") {
      const maxProt = Number(this.system.maxProtection) || 0;
      const curProt = Number(this.system.protection) || 0;
      return maxProt > 0 && curProt <= 0;
    }
    return false;
  }

  get canRepair() {
    if (this.type === "weapon") {
      return (Number(this.system.durability) || 0) < (Number(this.system.maxDurability) || 0)
        || (Number(this.system.bonus) || 0) < (Number(this.system.maxBonus) || 0);
    }
    if (this.type === "gear") {
      return (Number(this.system.durability) || 0) < (Number(this.system.maxDurability) || 0)
        || (Number(this.system.bonus) || 0) < (Number(this.system.maxBonus) || 0);
    }
    if (this.type === "armor") {
      return (Number(this.system.protection) || 0) < (Number(this.system.maxProtection) || 0);
    }
    return false;
  }

  async repair() {
    const updates = {};
    if (this.type === "weapon") {
      if ((Number(this.system.maxDurability) || 0) > (Number(this.system.durability) || 0)) {
        updates["system.durability"] = Number(this.system.maxDurability) || 0;
      }
      if ((Number(this.system.maxBonus) || 0) > (Number(this.system.bonus) || 0)) {
        updates["system.bonus"] = Number(this.system.maxBonus) || 0;
      }
    } else if (this.type === "gear") {
      if ((Number(this.system.maxDurability) || 0) > (Number(this.system.durability) || 0)) {
        updates["system.durability"] = Number(this.system.maxDurability) || 0;
      }
      if ((Number(this.system.maxBonus) || 0) > (Number(this.system.bonus) || 0)) {
        updates["system.bonus"] = Number(this.system.maxBonus) || 0;
      }
    } else if (this.type === "armor") {
      if ((Number(this.system.maxProtection) || 0) > (Number(this.system.protection) || 0)) {
        updates["system.protection"] = Number(this.system.maxProtection) || 0;
      }
    }
    if (!Object.keys(updates).length) return this;
    await this.update(updates);
    ui.notifications.info(game.i18n.format("EGREGORA.Notifications.GearRepaired", { name: this.name }));
    return this;
  }

  async roll(event = null) {
    const actor = this.actor;
    if (!actor) return this.sendToChat();

    switch (this.type) {
      case "skill":
        return actor.openRollDialog(
          {
            attribute: this.system.attribute,
            skill: this,
          },
          event
        );

      case "weapon": {
        if (this.isBrokenGear) {
          ui.notifications.warn(game.i18n.format("EGREGORA.Notifications.GearBroken", { name: this.name }));
          return null;
        }
        const linkedSkill = actor.findSkill(this.system.skill);
        const attribute = linkedSkill?.system?.attribute || this.system.attribute || "strength";
        return actor.openRollDialog(
          {
            attribute,
            skill: linkedSkill,
            gear: this,
          },
          event
        );
      }

      case "armor":
        if (this.isBrokenGear) {
          ui.notifications.warn(game.i18n.format("EGREGORA.Notifications.GearBroken", { name: this.name }));
          return null;
        }
        return actor.rollArmor(this);

      case "gear": {
        if (this.isBrokenGear) {
          ui.notifications.warn(game.i18n.format("EGREGORA.Notifications.GearBroken", { name: this.name }));
          return null;
        }
        const linkedSkill = actor.findSkill(this.system.associatedSkill);
        const attribute = linkedSkill?.system?.attribute || "intelligence";
        return actor.openRollDialog(
          {
            attribute,
            skill: linkedSkill,
            gear: this,
          },
          event
        );
      }

      case "talent": {
        if (this.system.willpowerCost > 0 && actor.system.willpower) {
          if (actor.system.willpower.value < this.system.willpowerCost) {
            ui.notifications.warn(game.i18n.localize("EGREGORA.Notifications.NotEnoughWillpower"));
            return null;
          }
          await actor.update({
            "system.willpower.value": actor.system.willpower.value - this.system.willpowerCost,
          });
        }
        if (this.system.corruptionCost > 0 && actor.system.corruption) {
          const nextPc = Math.min(10, (actor.system.corruption.value || 0) + this.system.corruptionCost);
          await actor.update({ "system.corruption.value": nextPc });
        }
        if (this.system.associatedSkill || this.system.attribute) {
          const linkedSkill = actor.findSkill(this.system.associatedSkill);
          const attribute = linkedSkill?.system?.attribute || this.system.attribute || "intelligence";
          return actor.openRollDialog(
            {
              attribute,
              skill: linkedSkill,
              talent: this,
            },
            event
          );
        }
        return this.sendToChat();
      }

      case "spell":
        return actor.openSpellDialog({ spell: this });

      default:
        return this.sendToChat();
    }
  }

  async sendToChat() {
    const renderTemplate = getRenderTemplate();
    const content = await renderTemplate("systems/fvtt-egregora/templates/chat/item-card.hbs", {
      item: this,
      system: this.system,
      actor: this.actor,
    });
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
    });
  }
}
