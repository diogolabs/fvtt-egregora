import { EGREGORA_CONFIG } from "../config.mjs";

const BaseCombat = foundry.documents?.Combat ?? globalThis.Combat;

function getRenderTemplate() {
  return foundry.applications?.handlebars?.renderTemplate ?? globalThis.renderTemplate;
}

/**
 * Custom Combat document implementing Year Zero Engine / Vaesen card-based initiative (1-10).
 * Lowest card acts first (1 -> 10). Supports card swapping and Fast/Slow action tracking.
 */
export class EgregoraCombat extends BaseCombat {
  static DECK_SIZE = 10;

  /**
   * Whether card-based initiative is currently active in world settings.
   * @returns {boolean}
   */
  static isCardInitiativeEnabled() {
    try {
      return game.settings.get(EGREGORA_CONFIG.ID, "useCardInitiative") !== false;
    } catch {
      return true;
    }
  }

  /**
   * Resolve the image path for an initiative card (1-10).
   * @param {number} cardValue
   * @returns {string}
   */
  static getCardImage(cardValue) {
    const n = Math.max(1, Math.min(EgregoraCombat.DECK_SIZE, Math.round(Number(cardValue) || 1)));
    return `systems/${EGREGORA_CONFIG.ID}/assets/cards/card_${n}.jpg`;
  }

  /**
   * Return available card values (1-10) not currently held by other combatants.
   * @param {string[]} [excludeIds=[]] Combatant IDs whose current cards should be treated as available.
   * @returns {number[]}
   */
  getAvailableCards(excludeIds = []) {
    const excludeSet = new Set(excludeIds);
    const used = new Set();
    for (const c of this.combatants) {
      if (excludeSet.has(c.id)) continue;
      if (c.initiative === null || c.initiative === undefined || c.initiative === "") continue;
      const val = Number(c.initiative);
      if (Number.isInteger(val) && val >= 1 && val <= EgregoraCombat.DECK_SIZE) {
        used.add(val);
      }
    }
    const available = [];
    for (let i = 1; i <= EgregoraCombat.DECK_SIZE; i++) {
      if (!used.has(i)) available.push(i);
    }
    return available;
  }

  /**
   * Sort combatants in ascending order (1 acts first, 10 acts last) when card initiative is enabled.
   * Unrolled combatants (initiative == null) appear at the bottom.
   * @override
   */
  _sortCombatants(a, b) {
    if (!EgregoraCombat.isCardInitiativeEnabled()) {
      return super._sortCombatants(a, b);
    }
    const ia = Number.isNumeric(a.initiative) ? Number(a.initiative) : Infinity;
    const ib = Number.isNumeric(b.initiative) ? Number(b.initiative) : Infinity;
    const diff = ia - ib;
    if (diff !== 0) return diff;
    return (a.name || "").localeCompare(b.name || "") || a.id.localeCompare(b.id);
  }

  /**
   * Deal unique initiative cards (1-10) to the requested combatants.
   * @override
   */
  async rollInitiative(ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
    if (!EgregoraCombat.isCardInitiativeEnabled()) {
      return super.rollInitiative(ids, { formula, updateTurn, messageOptions });
    }

    const ID = EGREGORA_CONFIG.ID;
    ids = typeof ids === "string" ? [ids] : Array.from(ids);
    const currentId = this.combatant?.id;
    const renderTpl = getRenderTemplate();

    let pool = this.getAvailableCards(ids);
    let reshuffledNotified = false;

    const updates = [];
    const messages = [];
    const templatePath = `systems/${ID}/templates/chat/initiative-card.hbs`;

    for (const id of ids) {
      const combatant = this.combatants.get(id);
      if (!combatant || combatant.isDefeated) continue;

      if (pool.length === 0) {
        pool = Array.from({ length: EgregoraCombat.DECK_SIZE }, (_, idx) => idx + 1);
        if (!reshuffledNotified) {
          ui.notifications.info(game.i18n.localize("EGREGORA.Combat.DeckReshuffled"));
          reshuffledNotified = true;
        }
      }

      const pickIndex = Math.floor(Math.random() * pool.length);
      const [cardValue] = pool.splice(pickIndex, 1);
      const cardImg = EgregoraCombat.getCardImage(cardValue);

      updates.push({
        _id: combatant.id,
        initiative: cardValue,
        [`flags.${ID}.cardValue`]: cardValue,
        [`flags.${ID}.cardImg`]: cardImg,
        [`flags.${ID}.fastAction`]: false,
        [`flags.${ID}.slowAction`]: false,
      });

      const content = await renderTpl(templatePath, {
        combatantName: combatant.name,
        tokenImg: combatant.img,
        cardValue,
        cardImg,
      });

      const isHidden = Boolean(combatant.hidden || combatant.token?.hidden);
      const messageData = foundry.utils.mergeObject(
        {
          speaker: ChatMessage.getSpeaker({
            actor: combatant.actor,
            token: combatant.token,
            alias: combatant.name,
          }),
          flavor: game.i18n.format("EGREGORA.Combat.DrewInitiativeCard", {
            name: combatant.name,
            card: cardValue,
          }),
          content,
          whisper: isHidden ? game.users.filter(u => u.isGM).map(u => u.id) : [],
          flags: { "core.initiativeRoll": true, [`${ID}.initiativeCard`]: cardValue },
        },
        messageOptions,
      );
      messages.push(messageData);
    }

    if (!updates.length) return this;

    await this.updateEmbeddedDocuments("Combatant", updates);

    if (game.user.isGM) {
      if (updateTurn && currentId) {
        const turnIndex = this.turns.findIndex(t => t.id === currentId);
        if (turnIndex >= 0 && turnIndex !== this.turn) {
          await this.update({ turn: turnIndex });
        }
      } else if (this.started && this.turn === null) {
        await this.update({ turn: 0 });
      }
    }

    if (messages.length) {
      const ChatMessageCls = ChatMessage.implementation ?? ChatMessage;
      await ChatMessageCls.create(messages);
    }

    return this;
  }

  /**
   * Reset all initiatives, card flags, and action states (returns all cards to the deck).
   * @override
   */
  async resetAll() {
    const ID = EGREGORA_CONFIG.ID;
    const updates = this.combatants.map(c => ({
      _id: c.id,
      initiative: null,
      [`flags.${ID}.cardValue`]: null,
      [`flags.${ID}.cardImg`]: null,
      [`flags.${ID}.fastAction`]: false,
      [`flags.${ID}.slowAction`]: false,
    }));
    if (updates.length) {
      await this.updateEmbeddedDocuments("Combatant", updates);
    }
    if (game.user.isGM) {
      await this.update({ turn: null });
    }
    return this;
  }

  /**
   * Reset Fast/Slow action flags on all combatants for a new round.
   */
  async resetActions() {
    const ID = EGREGORA_CONFIG.ID;
    const updates = this.combatants.map(c => ({
      _id: c.id,
      [`flags.${ID}.fastAction`]: false,
      [`flags.${ID}.slowAction`]: false,
    }));
    if (updates.length) {
      await this.updateEmbeddedDocuments("Combatant", updates);
    }
  }

  /**
   * Advance to the next round: reset Fast/Slow actions and optionally redeal cards.
   * @override
   */
  async nextRound() {
    await this.resetActions();
    const res = await super.nextRound();

    if (EgregoraCombat.isCardInitiativeEnabled()) {
      const autoRedeal = game.settings.get(EGREGORA_CONFIG.ID, "autoRedealInitiative");
      if (autoRedeal) {
        const activeIds = this.combatants.filter(c => !c.isDefeated).map(c => c.id);
        if (activeIds.length) {
          await this.rollInitiative(activeIds, { updateTurn: false });
          await this.update({ turn: 0 });
        }
      }
    }

    return res;
  }

  /**
   * Reshuffle and deal fresh cards to all non-defeated combatants.
   */
  async redealAll() {
    const activeIds = this.combatants.filter(c => !c.isDefeated).map(c => c.id);
    if (!activeIds.length) return this;
    await this.resetAll();
    return this.rollInitiative(activeIds, { updateTurn: false });
  }

  /**
   * Swap initiative cards between two combatants.
   * Players without GM permissions relay the request over the system socket.
   * @param {string} combatantIdA
   * @param {string} combatantIdB
   */
  async swapInitiative(combatantIdA, combatantIdB) {
    if (!combatantIdA || !combatantIdB || combatantIdA === combatantIdB) return;

    const cA = this.combatants.get(combatantIdA);
    const cB = this.combatants.get(combatantIdB);
    if (!cA || !cB) return;

    if (!game.user.isGM) {
      const activeGM = game.users.find(u => u.isGM && u.active);
      if (!activeGM) {
        ui.notifications.warn(game.i18n.localize("EGREGORA.Combat.NoActiveGMForSwap"));
        return;
      }
      game.socket.emit(`system.${EGREGORA_CONFIG.ID}`, {
        action: "swapInitiative",
        combatId: this.id,
        combatantIdA,
        combatantIdB,
      });
      return;
    }

    const ID = EGREGORA_CONFIG.ID;
    const initA = cA.initiative;
    const initB = cB.initiative;

    const updates = [
      {
        _id: cA.id,
        initiative: initB,
        [`flags.${ID}.cardValue`]: initB,
        [`flags.${ID}.cardImg`]: initB != null ? EgregoraCombat.getCardImage(initB) : null,
      },
      {
        _id: cB.id,
        initiative: initA,
        [`flags.${ID}.cardValue`]: initA,
        [`flags.${ID}.cardImg`]: initA != null ? EgregoraCombat.getCardImage(initA) : null,
      },
    ];

    const currentId = this.combatant?.id;
    await this.updateEmbeddedDocuments("Combatant", updates);

    if (currentId) {
      const idx = this.turns.findIndex(t => t.id === currentId);
      if (idx >= 0 && idx !== this.turn) {
        await this.update({ turn: idx });
      }
    }

    const ChatMessageCls = ChatMessage.implementation ?? ChatMessage;
    await ChatMessageCls.create({
      speaker: ChatMessage.getSpeaker({ alias: game.i18n.localize("EGREGORA.Combat.InitiativeSwapTitle") }),
      content: `<div class="eg-chat-card eg-init-swap-card">
        <p>${game.i18n.format("EGREGORA.Combat.SwappedInitiativeMsg", {
          nameA: foundry.utils.escapeHTML(cA.name),
          cardA: initA ?? "—",
          nameB: foundry.utils.escapeHTML(cB.name),
          cardB: initB ?? "—",
        })}</p>
      </div>`,
    });
  }

  /**
   * Toggle Fast or Slow action flag on a combatant.
   * @param {string} combatantId
   * @param {"fastAction"|"slowAction"} actionType
   */
  async toggleAction(combatantId, actionType) {
    if (actionType !== "fastAction" && actionType !== "slowAction") return;
    const combatant = this.combatants.get(combatantId);
    if (!combatant) return;
    const ID = EGREGORA_CONFIG.ID;
    const current = Boolean(combatant.getFlag(ID, actionType));
    await combatant.setFlag(ID, actionType, !current);
  }
}

/**
 * Register socket handler so players can request initiative card swaps executed by the active GM.
 */
export function registerCombatSocket() {
  const ID = EGREGORA_CONFIG.ID;
  game.socket.on(`system.${ID}`, async payload => {
    if (!payload || payload.action !== "swapInitiative") return;
    // Only the first active GM handles the socket request to avoid duplicates.
    const primaryGM = game.users.activeGM ?? game.users.find(u => u.isGM && u.active);
    if (!game.user.isGM || (primaryGM && primaryGM.id !== game.user.id)) return;

    const combat = game.combats.get(payload.combatId);
    if (!combat) return;
    await combat.swapInitiative(payload.combatantIdA, payload.combatantIdB);
  });
}
