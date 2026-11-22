import { EGREGORA_CONFIG } from "../config.mjs";
import { EgregoraCombat } from "../documents/combat.mjs";

const DialogV2 = foundry.applications?.api?.DialogV2;

/**
 * Open a dialog to swap a combatant's initiative card with another combatant
 * (or, for GMs, manually assign a specific card 1-10).
 * @param {EgregoraCombat} combat
 * @param {Combatant} combatant
 */
export async function openInitiativeCardDialog(combat, combatant) {
  const currentCard = combatant.initiative;
  const cardImg = currentCard != null ? EgregoraCombat.getCardImage(currentCard) : null;

  const swapTargets = combat.turns.filter(
    c => c.id !== combatant.id && !c.isDefeated && c.initiative != null,
  );

  const targetOptionsHtml = swapTargets
    .map(t => `<option value="${t.id}">${foundry.utils.escapeHTML(t.name)} (#${t.initiative})</option>`)
    .join("");

  const manualOptionsHtml = Array.from({ length: EgregoraCombat.DECK_SIZE }, (_, idx) => {
    const val = idx + 1;
    const selected = Number(currentCard) === val ? "selected" : "";
    return `<option value="${val}" ${selected}>${game.i18n.localize("EGREGORA.Combat.CardLabel")} ${val}</option>`;
  }).join("");

  const content = `
    <div class="eg-init-dialog">
      ${cardImg ? `
        <div class="eg-init-dialog-preview">
          <img src="${cardImg}" alt="${currentCard}" />
          <div class="eg-init-dialog-meta">
            <strong>${foundry.utils.escapeHTML(combatant.name)}</strong>
            <span>${game.i18n.format("EGREGORA.Combat.CurrentCard", { card: currentCard })}</span>
          </div>
        </div>
      ` : ""}
      ${swapTargets.length ? `
        <div class="form-group">
          <label>${game.i18n.localize("EGREGORA.Combat.SwapWithLabel")}</label>
          <select name="targetId">${targetOptionsHtml}</select>
        </div>
      ` : `<p class="eg-init-dialog-hint">${game.i18n.localize("EGREGORA.Combat.NoSwapTargets")}</p>`}
      ${game.user.isGM ? `
        <hr />
        <div class="form-group">
          <label>${game.i18n.localize("EGREGORA.Combat.ManualCardLabel")}</label>
          <select name="manualCard">${manualOptionsHtml}</select>
        </div>
      ` : ""}
    </div>
  `;

  const buttons = [];

  if (swapTargets.length) {
    buttons.push({
      action: "swap",
      label: game.i18n.localize("EGREGORA.Combat.SwapButton"),
      icon: "fa-solid fa-right-left",
      default: true,
      callback: async (_event, _button, dialog) => {
        const root = dialog.element ?? dialog;
        const targetId = root.querySelector("select[name='targetId']")?.value;
        if (targetId) {
          await combat.swapInitiative(combatant.id, targetId);
        }
      },
    });
  }

  if (game.user.isGM) {
    buttons.push({
      action: "setCard",
      label: game.i18n.localize("EGREGORA.Combat.SetCardButton"),
      icon: "fa-solid fa-pen-to-square",
      callback: async (_event, _button, dialog) => {
        const root = dialog.element ?? dialog;
        const val = Number(root.querySelector("select[name='manualCard']")?.value);
        if (val >= 1 && val <= EgregoraCombat.DECK_SIZE) {
          const ID = EGREGORA_CONFIG.ID;
          await combatant.update({
            initiative: val,
            [`flags.${ID}.cardValue`]: val,
            [`flags.${ID}.cardImg`]: EgregoraCombat.getCardImage(val),
          });
        }
      },
    });
  }

  buttons.push({
    action: "cancel",
    label: game.i18n.localize("Cancel"),
    icon: "fa-solid fa-xmark",
  });

  if (DialogV2) {
    await DialogV2.wait({
      window: { title: game.i18n.localize("EGREGORA.Combat.InitiativeSwapTitle") },
      content,
      buttons,
      rejectClose: false,
    });
  } else {
    const legacyButtons = {};
    for (const btn of buttons) {
      legacyButtons[btn.action] = {
        label: btn.label,
        icon: `<i class="${btn.icon}"></i>`,
        callback: html => {
          const el = html instanceof HTMLElement ? html : html[0];
          return btn.callback?.(null, null, el);
        },
      };
    }
    new Dialog({
      title: game.i18n.localize("EGREGORA.Combat.InitiativeSwapTitle"),
      content,
      buttons: legacyButtons,
      default: buttons[0]?.action ?? "cancel",
    }).render(true);
  }
}

/**
 * Refresh the deck status bar inside the Combat Tracker header.
 * Always removes stale bars first so Foundry v13/v14 ApplicationV2 partial renders,
 * encounter switches, or combat deletion never leave outdated counts or stale listeners.
 * @param {CombatTracker} app
 * @param {HTMLElement} root
 */
function refreshDeckBar(app, root) {
  if (!root) return;
  root.querySelectorAll(".eg-combat-deck-bar").forEach(el => el.remove());

  if (!EgregoraCombat.isCardInitiativeEnabled()) return;

  const combat = app?.viewed ?? game.combat;
  if (!combat) return;

  const headerEl = root.querySelector("header.combat-tracker-header")
    ?? root.querySelector(".combat-tracker-header");
  if (!headerEl) return;

  const remaining = combat.getAvailableCards().length;
  const bar = document.createElement("div");
  bar.className = "eg-combat-deck-bar";
  bar.innerHTML = `
    <span class="eg-deck-pill" title="${game.i18n.localize("EGREGORA.Combat.DeckRemainingHint")}">
      <i class="fa-solid fa-layer-group"></i>
      ${game.i18n.format("EGREGORA.Combat.DeckRemaining", { remaining, total: EgregoraCombat.DECK_SIZE })}
    </span>
    ${game.user.isGM ? `
      <span class="eg-deck-actions">
        <button type="button" class="eg-redeal-btn eg-recall-btn" title="${game.i18n.localize("EGREGORA.Combat.RecallAllHint")}">
          <i class="fa-solid fa-rotate-left"></i>
          <span>${game.i18n.localize("EGREGORA.Combat.RecallAll")}</span>
        </button>
        <button type="button" class="eg-redeal-btn eg-shuffle-btn" title="${game.i18n.localize("EGREGORA.Combat.RedealAllHint")}">
          <i class="fa-solid fa-shuffle"></i>
          <span>${game.i18n.localize("EGREGORA.Combat.RedealAll")}</span>
        </button>
      </span>
    ` : ""}
  `;

  const recallBtn = bar.querySelector(".eg-recall-btn");
  if (recallBtn) {
    recallBtn.addEventListener("click", async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const liveCombat = app?.viewed ?? game.combat;
      if (!liveCombat) return;
      await liveCombat.resetAll();
      ui.notifications.info(game.i18n.localize("EGREGORA.Combat.DeckRecalled"));
    });
  }

  const shuffleBtn = bar.querySelector(".eg-shuffle-btn");
  if (shuffleBtn) {
    shuffleBtn.addEventListener("click", async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const liveCombat = app?.viewed ?? game.combat;
      if (!liveCombat) return;
      await liveCombat.redealAll();
    });
  }

  headerEl.appendChild(bar);
}

/**
 * Enhance Foundry's Combat Tracker DOM (v13 & v14 compatible) with:
 * - Visual initiative card thumbnails (1-10)
 * - Fast Action & Slow Action toggle buttons per combatant
 * - Swap Initiative Card button & GM Recall / Redeal buttons
 */
export function registerCombatTrackerHooks() {
  Hooks.on("renderCombatTracker", (app, html) => {
    const root = app?.element ?? (html instanceof HTMLElement ? html : html?.[0]);
    if (!root) return;

    // 1. Always refresh (or clean up) the deck bar first
    refreshDeckBar(app, root);

    if (!EgregoraCombat.isCardInitiativeEnabled()) return;

    const combat = app?.viewed ?? game.combat;
    if (!combat) return;

    const ID = EGREGORA_CONFIG.ID;

    // 2. Enhance each combatant row
    const rows = root.querySelectorAll("li.combatant[data-combatant-id]");
    for (const row of rows) {
      const combatantId = row.dataset.combatantId;
      const combatant = combat.combatants.get(combatantId);
      if (!combatant) continue;

      const isOwner = Boolean(combatant.isOwner || game.user.isGM);
      const rawInit = combatant.initiative;
      const initVal = rawInit !== null && rawInit !== undefined && rawInit !== "" ? Number(rawInit) : NaN;
      const hasCard = Number.isInteger(initVal) && initVal >= 1 && initVal <= EgregoraCombat.DECK_SIZE;

      // 2a. Replace initiative display with card thumbnail
      const initContainer = row.querySelector(".token-initiative");
      if (initContainer && hasCard) {
        const cardImg = combatant.getFlag(ID, "cardImg") || EgregoraCombat.getCardImage(initVal);
        const cardBtn = document.createElement("button");
        cardBtn.type = "button";
        cardBtn.className = "eg-init-card-btn";
        cardBtn.title = isOwner
          ? game.i18n.format("EGREGORA.Combat.CardClickSwapTooltip", { card: initVal })
          : `${game.i18n.localize("EGREGORA.Combat.CardLabel")} ${initVal}`;
        cardBtn.innerHTML = `
          <img src="${cardImg}" alt="${initVal}" loading="lazy" />
          <span class="eg-init-card-num">${initVal}</span>
        `;
        cardBtn.addEventListener("click", async ev => {
          ev.preventDefault();
          ev.stopPropagation();
          const liveCombat = app?.viewed ?? game.combat;
          const liveCombatant = liveCombat?.combatants.get(combatantId);
          if (!liveCombat || !liveCombatant) return;
          if (isOwner) {
            await openInitiativeCardDialog(liveCombat, liveCombatant);
          } else {
            const ImagePopoutCls = foundry.applications?.apps?.ImagePopout ?? globalThis.ImagePopout;
            if (ImagePopoutCls) {
              new ImagePopoutCls({
                src: cardImg,
                window: { title: `${liveCombatant.name} — ${game.i18n.localize("EGREGORA.Combat.CardLabel")} ${initVal}` },
              }).render(true);
            }
          }
        });

        initContainer.innerHTML = "";
        initContainer.appendChild(cardBtn);
      }

      // 2b. Add Slow Action, Fast Action, and Swap Card controls
      const controlsContainer = row.querySelector(".combatant-controls");
      if (controlsContainer) {
        controlsContainer.querySelector(".eg-combat-actions")?.remove();

        const slowUsed = Boolean(combatant.getFlag(ID, "slowAction"));
        const fastUsed = Boolean(combatant.getFlag(ID, "fastAction"));

        const actionsWrap = document.createElement("span");
        actionsWrap.className = "eg-combat-actions";

        const slowBtn = document.createElement("button");
        slowBtn.type = "button";
        slowBtn.className = `inline-control combatant-control eg-action-btn ${slowUsed ? "is-used" : ""}`;
        slowBtn.title = game.i18n.localize(
          slowUsed ? "EGREGORA.Combat.SlowActionUsed" : "EGREGORA.Combat.SlowActionReady",
        );
        slowBtn.innerHTML = `<i class="fa-solid fa-hourglass-half"></i>`;
        slowBtn.disabled = !isOwner;
        slowBtn.addEventListener("click", async ev => {
          ev.preventDefault();
          ev.stopPropagation();
          const liveCombat = app?.viewed ?? game.combat;
          if (isOwner && liveCombat) await liveCombat.toggleAction(combatantId, "slowAction");
        });

        const fastBtn = document.createElement("button");
        fastBtn.type = "button";
        fastBtn.className = `inline-control combatant-control eg-action-btn ${fastUsed ? "is-used" : ""}`;
        fastBtn.title = game.i18n.localize(
          fastUsed ? "EGREGORA.Combat.FastActionUsed" : "EGREGORA.Combat.FastActionReady",
        );
        fastBtn.innerHTML = `<i class="fa-solid fa-bolt"></i>`;
        fastBtn.disabled = !isOwner;
        fastBtn.addEventListener("click", async ev => {
          ev.preventDefault();
          ev.stopPropagation();
          const liveCombat = app?.viewed ?? game.combat;
          if (isOwner && liveCombat) await liveCombat.toggleAction(combatantId, "fastAction");
        });

        actionsWrap.appendChild(slowBtn);
        actionsWrap.appendChild(fastBtn);

        if (isOwner && hasCard) {
          const swapBtn = document.createElement("button");
          swapBtn.type = "button";
          swapBtn.className = "inline-control combatant-control eg-swap-btn";
          swapBtn.title = game.i18n.localize("EGREGORA.Combat.SwapButton");
          swapBtn.innerHTML = `<i class="fa-solid fa-right-left"></i>`;
          swapBtn.addEventListener("click", async ev => {
            ev.preventDefault();
            ev.stopPropagation();
            const liveCombat = app?.viewed ?? game.combat;
            const liveCombatant = liveCombat?.combatants.get(combatantId);
            if (liveCombat && liveCombatant) {
              await openInitiativeCardDialog(liveCombat, liveCombatant);
            }
          });
          actionsWrap.appendChild(swapBtn);
        }

        controlsContainer.prepend(actionsWrap);
      }
    }
  });

  // Ensure the deck bar stays in sync on combat creation/deletion/combatant changes
  const syncTrackerDeckBar = () => {
    const tracker = ui.combat;
    if (tracker?.element) {
      refreshDeckBar(tracker, tracker.element);
    }
  };
  Hooks.on("createCombat", syncTrackerDeckBar);
  Hooks.on("deleteCombat", syncTrackerDeckBar);
  Hooks.on("updateCombat", syncTrackerDeckBar);
  Hooks.on("createCombatant", syncTrackerDeckBar);
  Hooks.on("updateCombatant", syncTrackerDeckBar);
  Hooks.on("deleteCombatant", syncTrackerDeckBar);
}
