import { EGREGORA_CONFIG } from "../config.mjs";

const DICE_ASSET_BASE = `systems/${EGREGORA_CONFIG.ID}/assets/dice`;

function faceArray(prefix) {
  return [1, 2, 3, 4, 5, 6].map(n => `${DICE_ASSET_BASE}/${prefix}_${n}.png`);
}

export const EGREGORA_DSN_COLORSETS = {
  base: "egregora-base",
  skill: "egregora-skill",
  gear: "egregora-gear",
  corruption: "egregora-corruption",
};

export const MAGIC_PATH_COLORSETS = {
  matter: "egregora-path-matter",
  flux: "egregora-path-flux",
  mind: "egregora-path-mind",
  life: "egregora-path-life",
  echoes: "egregora-path-echoes",
  abyss: "egregora-path-abyss",
};

/**
 * Registers Egrégora 3D dice presets, themes, roles (DSN v6 / Foundry v14),
 * and SFX triggers safely across both Foundry v13 (DSN v5) and v14 (DSN v6).
 */
export async function registerDice3D(dice3d) {
  const ID = EGREGORA_CONFIG.ID;
  const category = game.i18n.localize("EGREGORA.DSN.Category");

  // 1. Register System ("preferred" is supported in both DSN v5 and v6)
  dice3d.addSystem({ id: ID, name: "Egrégora: O Mundo Oculto" }, "preferred");

  // 2. Register Egrégora Colorsets (Themes)
  const colorsets = [
    {
      name: EGREGORA_DSN_COLORSETS.base,
      description: game.i18n.localize("EGREGORA.DSN.Colorset.base"),
      category,
      foreground: "#ffffff",
      background: "#120c0c",
      outline: "#000000",
      edge: "#360a0a",
      texture: "none",
      material: "stone",
    },
    {
      name: EGREGORA_DSN_COLORSETS.skill,
      description: game.i18n.localize("EGREGORA.DSN.Colorset.skill"),
      category,
      foreground: "#f7eac6",
      background: "#14110d",
      outline: "#000000",
      edge: "#6e5325",
      texture: "none",
      material: "stone",
    },
    {
      name: EGREGORA_DSN_COLORSETS.gear,
      description: game.i18n.localize("EGREGORA.DSN.Colorset.gear"),
      category,
      foreground: "#e0ecf5",
      background: "#171d22",
      outline: "#000000",
      edge: "#4a667a",
      texture: "none",
      material: "metal",
    },
    {
      name: EGREGORA_DSN_COLORSETS.corruption,
      description: game.i18n.localize("EGREGORA.DSN.Colorset.corruption"),
      category,
      foreground: "#ffd694",
      background: "#260505",
      outline: "#000000",
      edge: "#991515",
      texture: "none",
      material: "stone",
    },
    // 6 Caminhos de Magia
    {
      name: MAGIC_PATH_COLORSETS.matter,
      description: game.i18n.localize("EGREGORA.DSN.Colorset.pathMatter"),
      category,
      foreground: "#ffe6b8",
      background: "#3b2412",
      outline: "#140a04",
      edge: "#a66c2e",
      texture: "stone",
      material: "metal",
    },
    {
      name: MAGIC_PATH_COLORSETS.flux,
      description: game.i18n.localize("EGREGORA.DSN.Colorset.pathFlux"),
      category,
      foreground: "#e6f4ff",
      background: "#14263d",
      outline: "#07101c",
      edge: "#5ca4d6",
      texture: "astral",
      material: "glass",
    },
    {
      name: MAGIC_PATH_COLORSETS.mind,
      description: game.i18n.localize("EGREGORA.DSN.Colorset.pathMind"),
      category,
      foreground: "#f2dcff",
      background: "#2a1238",
      outline: "#100517",
      edge: "#8e44ad",
      texture: "astral",
      material: "glass",
    },
    {
      name: MAGIC_PATH_COLORSETS.life,
      description: game.i18n.localize("EGREGORA.DSN.Colorset.pathLife"),
      category,
      foreground: "#e4ffd9",
      background: "#122b18",
      outline: "#061209",
      edge: "#4f9454",
      texture: "marble",
      material: "stone",
    },
    {
      name: MAGIC_PATH_COLORSETS.echoes,
      description: game.i18n.localize("EGREGORA.DSN.Colorset.pathEchoes"),
      category,
      foreground: "#e8f0f2",
      background: "#1f262b",
      outline: "#0a0d0f",
      edge: "#7d93a1",
      texture: "cloudy",
      material: "glass",
    },
    {
      name: MAGIC_PATH_COLORSETS.abyss,
      description: game.i18n.localize("EGREGORA.DSN.Colorset.pathAbyss"),
      category,
      foreground: "#ffb8a6",
      background: "#1c0305",
      outline: "#000000",
      edge: "#b31217",
      texture: "fire",
      material: "stone",
    },
  ];

  for (const cs of colorsets) {
    dice3d.addColorset(cs, cs.name === EGREGORA_DSN_COLORSETS.base ? "preferred" : "default");
  }

  // 3. Register Custom 3D Dice Presets (256x256 Faces + Bump + Emissive)
  const sharedBumps = faceArray("bump");
  const sharedEmissives = faceArray("emissive");

  // Standard d6 (used by Panic, Trauma, D66 Criticals & Mutations)
  dice3d.addDicePreset({
    type: "d6",
    labels: faceArray("base"),
    bumpMaps: sharedBumps,
    emissiveMaps: sharedEmissives,
    emissive: 0xff2814,
    emissiveIntensity: 0.9,
    colorset: EGREGORA_DSN_COLORSETS.base,
    system: ID,
  }, "d6");

  // Base / Attribute Die (db)
  dice3d.addDicePreset({
    type: "db",
    labels: faceArray("base"),
    bumpMaps: sharedBumps,
    emissiveMaps: sharedEmissives,
    emissive: 0xff2814,
    emissiveIntensity: 0.95,
    colorset: EGREGORA_DSN_COLORSETS.base,
    system: ID,
  }, "d6");

  // Skill Die (ds)
  dice3d.addDicePreset({
    type: "ds",
    labels: faceArray("skill"),
    bumpMaps: sharedBumps,
    colorset: EGREGORA_DSN_COLORSETS.skill,
    system: ID,
  }, "d6");

  // Gear Die (dg)
  dice3d.addDicePreset({
    type: "dg",
    labels: faceArray("gear"),
    bumpMaps: sharedBumps,
    colorset: EGREGORA_DSN_COLORSETS.gear,
    system: ID,
  }, "d6");

  // Corruption Die (dk)
  dice3d.addDicePreset({
    type: "dk",
    labels: faceArray("corr"),
    bumpMaps: sharedBumps,
    emissiveMaps: sharedEmissives,
    emissive: 0xff1908,
    emissiveIntensity: 1.5,
    colorset: EGREGORA_DSN_COLORSETS.corruption,
    system: ID,
  }, "d6");

  // 4. DSN v6 (Foundry v14) Dice Roles — feature-detected safely
  if (typeof dice3d.addRole === "function") {
    const roleDefs = [
      {
        id: "egregora-base",
        label: "EGREGORA.DSN.Role.base",
        colorset: EGREGORA_DSN_COLORSETS.base,
      },
      {
        id: "egregora-skill",
        label: "EGREGORA.DSN.Role.skill",
        colorset: EGREGORA_DSN_COLORSETS.skill,
      },
      {
        id: "egregora-gear",
        label: "EGREGORA.DSN.Role.gear",
        colorset: EGREGORA_DSN_COLORSETS.gear,
      },
      {
        id: "egregora-corruption",
        label: "EGREGORA.DSN.Role.corruption",
        colorset: EGREGORA_DSN_COLORSETS.corruption,
      },
    ];

    for (const r of roleDefs) {
      dice3d.addRole({
        id: r.id,
        label: r.label,
        group: "EGREGORA.DSN.Category",
        customizable: true,
        dieTypes: ["d6", "db", "ds", "dg", "dk"],
        defaults: {
          global: {
            system: ID,
            colorset: r.colorset,
          },
        },
      }, { package: ID });
    }
  }

  // 5. Custom SFX Trigger for Egrégora Outcomes (works on both DSN v5 & v6)
  if (typeof dice3d.addSFXTrigger === "function") {
    dice3d.addSFXTrigger("egregora-roll", game.i18n.localize("EGREGORA.DSN.SFXTrigger"), [
      { id: "success", name: game.i18n.localize("EGREGORA.DSN.SFX.success") },
      { id: "multiSuccess", name: game.i18n.localize("EGREGORA.DSN.SFX.multiSuccess") },
      { id: "criticalFailure", name: game.i18n.localize("EGREGORA.DSN.SFX.criticalFailure") },
      { id: "contamination", name: game.i18n.localize("EGREGORA.DSN.SFX.contamination") },
    ]);
  }

  // 6. Preload presets on DSN v6 to avoid first-roll stutter
  if (typeof dice3d.preloadPresets === "function") {
    await dice3d.preloadPresets(ID);
  }
}

/**
 * Decorates a YearZeroRoll's terms with per-term Dice So Nice appearance,
 * roles, actorId, and custom SFX triggers.
 */
export function decorateEgregoraRoll(roll, { actor = null, magicPath = null, contaminationTriggered = false } = {}) {
  if (!roll) return roll;

  const ID = EGREGORA_CONFIG.ID;
  if (actor?.id) {
    roll.data ??= {};
    roll.data.actorId = actor.id;
  }

  let useMagicColors = true;
  try {
    useMagicColors = game.settings.get(ID, "enableMagicPathDiceColors");
  } catch {
    useMagicColors = true;
  }

  const magicColorset = (useMagicColors && magicPath && MAGIC_PATH_COLORSETS[magicPath])
    ? MAGIC_PATH_COLORSETS[magicPath]
    : null;

  // On DSN v6 (Foundry v14), registered Dice Roles provide the default system & colorset
  // while still letting players customize each role in DSN settings.
  // On DSN v5 (Foundry v13), Roles do not exist, so we apply per-term appearance directly.
  const hasDsnRoles = typeof game.dice3d?.addRole === "function";

  for (const term of roll.dice ?? []) {
    const type = term.type;
    term.options ??= {};

    if (type === "base") {
      term.options.dsnRole = "egregora-base";
      if (!hasDsnRoles) {
        term.options.appearance = {
          system: ID,
          colorset: EGREGORA_DSN_COLORSETS.base,
        };
      }
    } else if (type === "skill") {
      term.options.dsnRole = "egregora-skill";
      if (magicColorset) {
        term.options.appearance = {
          system: ID,
          colorset: magicColorset,
        };
      } else if (!hasDsnRoles) {
        term.options.appearance = {
          system: ID,
          colorset: EGREGORA_DSN_COLORSETS.skill,
        };
      }
    } else if (type === "gear") {
      term.options.dsnRole = "egregora-gear";
      if (!hasDsnRoles) {
        term.options.appearance = {
          system: ID,
          colorset: EGREGORA_DSN_COLORSETS.gear,
        };
      }
    } else if (type === "corruption") {
      term.options.dsnRole = "egregora-corruption";
      if (!hasDsnRoles) {
        term.options.appearance = {
          system: ID,
          colorset: EGREGORA_DSN_COLORSETS.corruption,
        };
      }
    } else {
      // Standard d6 (Panic, Criticals, Mutations, Trauma)
      if (magicColorset) {
        term.options.appearance = {
          system: ID,
          colorset: magicColorset,
        };
      } else if (!hasDsnRoles) {
        term.options.appearance = {
          system: ID,
          colorset: EGREGORA_DSN_COLORSETS.base,
        };
      }
    }
  }

  // Attach custom SFX trigger result on the first die term
  const firstDie = roll.dice?.[0];
  if (firstDie && roll._evaluated) {
    const totalSuccess = (roll.successCount ?? 0) + (Number(roll.options?.prideBonus) || 0);
    let sfxResult = null;
    if (contaminationTriggered) sfxResult = "contamination";
    else if (roll.isCriticalFailure) sfxResult = "criticalFailure";
    else if (totalSuccess >= 3) sfxResult = "multiSuccess";
    else if (totalSuccess >= 1) sfxResult = "success";

    if (sfxResult) {
      firstDie.options.sfx = { id: "egregora-roll", result: sfxResult };
    }
  }

  return roll;
}
