import { EGREGORA_CONFIG } from "../config.mjs";

const DICE_ASSET_BASE = `systems/${EGREGORA_CONFIG.ID}/assets/dice`;

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

export const MAGIC_PATH_SYSTEMS = {
  matter: `${EGREGORA_CONFIG.ID}-matter`,
  flux: `${EGREGORA_CONFIG.ID}-flux`,
  mind: `${EGREGORA_CONFIG.ID}-mind`,
  life: `${EGREGORA_CONFIG.ID}-life`,
  echoes: `${EGREGORA_CONFIG.ID}-echoes`,
  abyss: `${EGREGORA_CONFIG.ID}-abyss`,
};

/**
 * Registers Egrégora rounded-corner polished-marble 3D dice models (.glb),
 * glossy themes, DSN v6 Dice Roles, and SFX triggers across Foundry v13 (DSN v5) & v14 (DSN v6).
 */
export async function registerDice3D(dice3d) {
  const ID = EGREGORA_CONFIG.ID;
  const category = game.i18n.localize("EGREGORA.DSN.Category");

  // 1. Register Primary System ("preferred" works on both DSN v5 and v6)
  dice3d.addSystem({ id: ID, name: "Egrégora: O Mundo Oculto" }, "preferred");

  // 2. Register Egrégora Glossy Polished-Marble Colorsets (Themes)
  // Using DSN's "pristine" material (clearcoat glossy finish) so standard dice also match the marble polish.
  const colorsets = [
    {
      name: EGREGORA_DSN_COLORSETS.base,
      description: game.i18n.localize("EGREGORA.DSN.Colorset.base"),
      category,
      foreground: "#ffffff",
      background: "#140d0f",
      outline: "#000000",
      edge: "#470e0e",
      texture: "marble",
      material: "pristine",
    },
    {
      name: EGREGORA_DSN_COLORSETS.skill,
      description: game.i18n.localize("EGREGORA.DSN.Colorset.skill"),
      category,
      foreground: "#f7eac6",
      background: "#161411",
      outline: "#000000",
      edge: "#8c692a",
      texture: "marble",
      material: "pristine",
    },
    {
      name: EGREGORA_DSN_COLORSETS.gear,
      description: game.i18n.localize("EGREGORA.DSN.Colorset.gear"),
      category,
      foreground: "#e4f0fa",
      background: "#161c22",
      outline: "#000000",
      edge: "#5c809c",
      texture: "marble",
      material: "pristine",
    },
    {
      name: EGREGORA_DSN_COLORSETS.corruption,
      description: game.i18n.localize("EGREGORA.DSN.Colorset.corruption"),
      category,
      foreground: "#ffdca8",
      background: "#2a0608",
      outline: "#000000",
      edge: "#b31717",
      texture: "marble",
      material: "pristine",
    },
    // 6 Caminhos de Magia (todos padronizados com mármore liso polido)
    {
      name: MAGIC_PATH_COLORSETS.matter,
      description: game.i18n.localize("EGREGORA.DSN.Colorset.pathMatter"),
      category,
      foreground: "#ffebbf",
      background: "#2e1c0f",
      outline: "#120903",
      edge: "#b87832",
      texture: "marble",
      material: "pristine",
    },
    {
      name: MAGIC_PATH_COLORSETS.flux,
      description: game.i18n.localize("EGREGORA.DSN.Colorset.pathFlux"),
      category,
      foreground: "#e8f6ff",
      background: "#102036",
      outline: "#060e1a",
      edge: "#5caee6",
      texture: "marble",
      material: "pristine",
    },
    {
      name: MAGIC_PATH_COLORSETS.mind,
      description: game.i18n.localize("EGREGORA.DSN.Colorset.pathMind"),
      category,
      foreground: "#f5e3ff",
      background: "#241034",
      outline: "#0e0415",
      edge: "#9b50bd",
      texture: "marble",
      material: "pristine",
    },
    {
      name: MAGIC_PATH_COLORSETS.life,
      description: game.i18n.localize("EGREGORA.DSN.Colorset.pathLife"),
      category,
      foreground: "#e8ffde",
      background: "#0f2616",
      outline: "#051008",
      edge: "#4ea860",
      texture: "marble",
      material: "pristine",
    },
    {
      name: MAGIC_PATH_COLORSETS.echoes,
      description: game.i18n.localize("EGREGORA.DSN.Colorset.pathEchoes"),
      category,
      foreground: "#edf4f8",
      background: "#1c2228",
      outline: "#090c0e",
      edge: "#8da6b8",
      texture: "marble",
      material: "pristine",
    },
    {
      name: MAGIC_PATH_COLORSETS.abyss,
      description: game.i18n.localize("EGREGORA.DSN.Colorset.pathAbyss"),
      category,
      foreground: "#ffc8bc",
      background: "#1e0408",
      outline: "#000000",
      edge: "#c41620",
      texture: "marble",
      material: "pristine",
    },
  ];

  for (const cs of colorsets) {
    dice3d.addColorset(cs, cs.name === EGREGORA_DSN_COLORSETS.base ? "preferred" : "default");
  }

  // 3. Register Custom Rounded-Corner Polished-Marble 3D Models (.glb)
  // Standard d6 (used by Panic, Trauma, D66 Criticals & Mutations)
  dice3d.addDicePreset({
    type: "d6",
    modelFile: `${DICE_ASSET_BASE}/d6_base.glb`,
    system: ID,
  }, "d6");

  // Base / Attribute Die (db)
  dice3d.addDicePreset({
    type: "db",
    modelFile: `${DICE_ASSET_BASE}/d6_base.glb`,
    system: ID,
  }, "d6");

  // Skill Die (ds)
  dice3d.addDicePreset({
    type: "ds",
    modelFile: `${DICE_ASSET_BASE}/d6_skill.glb`,
    system: ID,
  }, "d6");

  // Gear Die (dg)
  dice3d.addDicePreset({
    type: "dg",
    modelFile: `${DICE_ASSET_BASE}/d6_gear.glb`,
    system: ID,
  }, "d6");

  // Corruption Die (dk)
  dice3d.addDicePreset({
    type: "dk",
    modelFile: `${DICE_ASSET_BASE}/d6_corr.glb`,
    system: ID,
  }, "d6");

  // 4. Register Rounded Polished-Marble 3D Variants for all 6 Magic Paths
  const pathMeta = [
    { key: "matter", labelKey: "EGREGORA.DSN.Colorset.pathMatter" },
    { key: "flux", labelKey: "EGREGORA.DSN.Colorset.pathFlux" },
    { key: "mind", labelKey: "EGREGORA.DSN.Colorset.pathMind" },
    { key: "life", labelKey: "EGREGORA.DSN.Colorset.pathLife" },
    { key: "echoes", labelKey: "EGREGORA.DSN.Colorset.pathEchoes" },
    { key: "abyss", labelKey: "EGREGORA.DSN.Colorset.pathAbyss" },
  ];

  for (const p of pathMeta) {
    const sysId = MAGIC_PATH_SYSTEMS[p.key];
    const modelFile = `${DICE_ASSET_BASE}/d6_path_${p.key}.glb`;
    dice3d.addSystem({ id: sysId, name: game.i18n.localize(p.labelKey) }, "default");
    for (const dieType of ["d6", "db", "ds"]) {
      dice3d.addDicePreset({
        type: dieType,
        modelFile,
        system: sysId,
      }, "d6");
    }
  }

  // 5. DSN v6 (Foundry v14) Dice Roles — feature-detected safely
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

  // 6. Custom SFX Trigger for Egrégora Outcomes (works on both DSN v5 & v6)
  if (typeof dice3d.addSFXTrigger === "function") {
    dice3d.addSFXTrigger("egregora-roll", game.i18n.localize("EGREGORA.DSN.SFXTrigger"), [
      { id: "success", name: game.i18n.localize("EGREGORA.DSN.SFX.success") },
      { id: "multiSuccess", name: game.i18n.localize("EGREGORA.DSN.SFX.multiSuccess") },
      { id: "criticalFailure", name: game.i18n.localize("EGREGORA.DSN.SFX.criticalFailure") },
      { id: "contamination", name: game.i18n.localize("EGREGORA.DSN.SFX.contamination") },
    ]);
  }

  // 7. Preload primary presets on DSN v6 to avoid first-roll stutter
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

  const magicSystem = (useMagicColors && magicPath && MAGIC_PATH_SYSTEMS[magicPath])
    ? MAGIC_PATH_SYSTEMS[magicPath]
    : null;
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
      if (magicSystem) {
        term.options.appearance = {
          system: magicSystem,
          colorset: magicColorset || EGREGORA_DSN_COLORSETS.skill,
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
      if (magicSystem) {
        term.options.appearance = {
          system: magicSystem,
          colorset: magicColorset || EGREGORA_DSN_COLORSETS.base,
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
