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
    if (Object.keys(updates).length > 0) {
      this.updateSource(updates);
    }
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
        return actor.rollArmor(this);

      case "gear": {
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
