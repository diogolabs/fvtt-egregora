import { EGREGORA_CONFIG } from "./config.mjs";

export function registerSettings() {
  const ID = EGREGORA_CONFIG.ID;

  game.settings.register(ID, "autoSeedCoreSkills", {
    name: "EGREGORA.Settings.autoSeedCoreSkills.name",
    hint: "EGREGORA.Settings.autoSeedCoreSkills.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(ID, "enableDoomPoints", {
    name: "EGREGORA.Settings.enableDoomPoints.name",
    hint: "EGREGORA.Settings.enableDoomPoints.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(ID, "doomPoints", {
    name: "EGREGORA.Settings.doomPoints.name",
    hint: "EGREGORA.Settings.doomPoints.hint",
    scope: "world",
    config: true,
    type: Number,
    default: 0,
  });

  game.settings.register(ID, "enableMagicPathDiceColors", {
    name: "EGREGORA.Settings.enableMagicPathDiceColors.name",
    hint: "EGREGORA.Settings.enableMagicPathDiceColors.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(ID, "useCardInitiative", {
    name: "EGREGORA.Settings.useCardInitiative.name",
    hint: "EGREGORA.Settings.useCardInitiative.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => ui.combat?.render?.(),
  });

  game.settings.register(ID, "autoRedealInitiative", {
    name: "EGREGORA.Settings.autoRedealInitiative.name",
    hint: "EGREGORA.Settings.autoRedealInitiative.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });
}

export function registerStatusEffects() {
  CONFIG.statusEffects = [
    { id: "dead", name: "EFFECT.StatusDead", img: "icons/svg/skull.svg" },
    { id: "broken", name: "EGREGORA.Status.broken", img: "icons/svg/blood.svg" },
    { id: "collapse", name: "EGREGORA.Status.collapse", img: "icons/svg/daze.svg" },
    { id: "terrified", name: "EGREGORA.Status.terrified", img: "icons/svg/terror.svg" },
    { id: "stunned", name: "EGREGORA.Status.stunned", img: "icons/svg/stun.svg" },
    { id: "prone", name: "EGREGORA.Status.prone", img: "icons/svg/falling.svg" },
    { id: "grappled", name: "EGREGORA.Status.grappled", img: "icons/svg/net.svg" },
  ];
}
