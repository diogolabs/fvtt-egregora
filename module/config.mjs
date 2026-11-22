export const EGREGORA_CONFIG = {
  ID: "fvtt-egregora",

  attributes: {
    strength: "EGREGORA.Attribute.strength",
    agility: "EGREGORA.Attribute.agility",
    intelligence: "EGREGORA.Attribute.intelligence",
    empathy: "EGREGORA.Attribute.empathy",
  },

  attributeAbbr: {
    strength: "EGREGORA.AttributeAbbr.strength",
    agility: "EGREGORA.AttributeAbbr.agility",
    intelligence: "EGREGORA.AttributeAbbr.intelligence",
    empathy: "EGREGORA.AttributeAbbr.empathy",
  },

  physicalAttributes: ["strength", "agility"],
  mentalAttributes: ["intelligence", "empathy"],

  // 12 Perícias Oficiais de Egrégora: O Mundo Oculto
  coreSkills: [
    { key: "potency", nameKey: "EGREGORA.Skill.potency", attribute: "strength" },
    { key: "melee", nameKey: "EGREGORA.Skill.melee", attribute: "strength" },
    { key: "endurance", nameKey: "EGREGORA.Skill.endurance", attribute: "strength" },
    { key: "ranged", nameKey: "EGREGORA.Skill.ranged", attribute: "agility" },
    { key: "movement", nameKey: "EGREGORA.Skill.movement", attribute: "agility" },
    { key: "stealth", nameKey: "EGREGORA.Skill.stealth", attribute: "agility" },
    { key: "erudition", nameKey: "EGREGORA.Skill.erudition", attribute: "intelligence" },
    { key: "observation", nameKey: "EGREGORA.Skill.observation", attribute: "intelligence" },
    { key: "survival", nameKey: "EGREGORA.Skill.survival", attribute: "intelligence" },
    { key: "healing", nameKey: "EGREGORA.Skill.healing", attribute: "empathy" },
    { key: "intuition", nameKey: "EGREGORA.Skill.intuition", attribute: "empathy" },
    { key: "persuasion", nameKey: "EGREGORA.Skill.persuasion", attribute: "empathy" },
  ],

  // Os 6 Caminhos da Magia
  magicPaths: {
    matter: "EGREGORA.Magic.Path.matter",
    flux: "EGREGORA.Magic.Path.flux",
    mind: "EGREGORA.Magic.Path.mind",
    life: "EGREGORA.Magic.Path.life",
    echoes: "EGREGORA.Magic.Path.echoes",
    abyss: "EGREGORA.Magic.Path.abyss",
  },

  magicAptitudeLevels: {
    0: { label: "EGREGORA.Magic.Aptitude.0", focus: 0, maxPath: 0 },
    1: { label: "EGREGORA.Magic.Aptitude.1", focus: 2, maxPath: 2 },
    2: { label: "EGREGORA.Magic.Aptitude.2", focus: 4, maxPath: 3 },
    3: { label: "EGREGORA.Magic.Aptitude.3", focus: 6, maxPath: 5 },
  },

  ageBrackets: {
    young: { label: "EGREGORA.Age.young", attrPoints: 14, skillPoints: 10 },
    adult: { label: "EGREGORA.Age.adult", attrPoints: 12, skillPoints: 12 },
    elder: { label: "EGREGORA.Age.elder", attrPoints: 10, skillPoints: 14 },
  },

  archetypes: {
    religiousLeader: "EGREGORA.Archetype.religiousLeader",
    artist: "EGREGORA.Archetype.artist",
    combatant: "EGREGORA.Archetype.combatant",
    occultist: "EGREGORA.Archetype.occultist",
    academic: "EGREGORA.Archetype.academic",
    investigator: "EGREGORA.Archetype.investigator",
    politician: "EGREGORA.Archetype.politician",
    beggar: "EGREGORA.Archetype.beggar",
    medic: "EGREGORA.Archetype.medic",
    criminal: "EGREGORA.Archetype.criminal",
  },

  groupTypes: {
    veilOperatives: "EGREGORA.Group.veilOperatives",
    contractHunters: "EGREGORA.Group.contractHunters",
    occultCartographers: "EGREGORA.Group.occultCartographers",
    cultists: "EGREGORA.Group.cultists",
    veilRenegades: "EGREGORA.Group.veilRenegades",
    underworldMerchants: "EGREGORA.Group.underworldMerchants",
    dormantLegacy: "EGREGORA.Group.dormantLegacy",
  },

  sects: {
    none: "EGREGORA.Sect.none",
    veiledDawn: "EGREGORA.Sect.veiledDawn",
    brotherhoodSaintVictor: "EGREGORA.Sect.brotherhoodSaintVictor",
    saltAndIron: "EGREGORA.Sect.saltAndIron",
    blackRoseCircle: "EGREGORA.Sect.blackRoseCircle",
    greenConsortium: "EGREGORA.Sect.greenConsortium",
    brokenAxisOrder: "EGREGORA.Sect.brokenAxisOrder",
  },

  talentCategories: {
    archetype: "EGREGORA.Talent.Category.archetype",
    group: "EGREGORA.Talent.Category.group",
    general: "EGREGORA.Talent.Category.general",
    exclusive: "EGREGORA.Talent.Category.exclusive",
    supernatural: "EGREGORA.Talent.Category.supernatural",
  },

  qualityCategories: {
    supernatural: "EGREGORA.TraitCategory.supernatural",
    physical: "EGREGORA.TraitCategory.physical",
    mental: "EGREGORA.TraitCategory.mental",
    occult: "EGREGORA.TraitCategory.occult",
    social: "EGREGORA.TraitCategory.social",
  },

  mutationTiers: {
    minor: "EGREGORA.Mutation.Tier.minor",
    notable: "EGREGORA.Mutation.Tier.notable",
    aberrant: "EGREGORA.Mutation.Tier.aberrant",
  },

  ranges: {
    engaged: "EGREGORA.Range.engaged",
    short: "EGREGORA.Range.short",
    medium: "EGREGORA.Range.medium",
    long: "EGREGORA.Range.long",
    extreme: "EGREGORA.Range.extreme",
  },

  difficulties: [
    { key: "easy", label: "EGREGORA.Difficulty.easy", mod: 1 },
    { key: "average", label: "EGREGORA.Difficulty.average", mod: 0 },
    { key: "demanding", label: "EGREGORA.Difficulty.demanding", mod: -1 },
    { key: "hard", label: "EGREGORA.Difficulty.hard", mod: -2 },
    { key: "formidable", label: "EGREGORA.Difficulty.formidable", mod: -3 },
  ],

  // Estágios de Corrupção (0-10 PC)
  corruptionStages: [
    { id: "pure", min: 0, max: 0, labelKey: "EGREGORA.Corruption.Stage.pure", penalty: 0 },
    { id: "tainted", min: 1, max: 3, labelKey: "EGREGORA.Corruption.Stage.tainted", penalty: -1 },
    { id: "corrupted", min: 4, max: 6, labelKey: "EGREGORA.Corruption.Stage.corrupted", penalty: -1 },
    { id: "deformed", min: 7, max: 9, labelKey: "EGREGORA.Corruption.Stage.deformed", penalty: -2 },
    { id: "shadowBeast", min: 10, max: 99, labelKey: "EGREGORA.Corruption.Stage.shadowBeast", penalty: -3 },
  ],

  // Tabela de Qualidade de Sucessos Mágicos (1 a 5+)
  magicSuccessQuality: [
    { min: 1, max: 1, key: "s1" },
    { min: 2, max: 2, key: "s2" },
    { min: 3, max: 3, key: "s3" },
    { min: 4, max: 4, key: "s4" },
    { min: 5, max: 99, key: "s5" },
  ],

  // Tabela de Pânico de Egrégora (1D6 + Corrupção)
  panicTable: [
    { min: 1, max: 6, key: "r6" },
    { min: 7, max: 7, key: "r7" },
    { min: 8, max: 8, key: "r8" },
    { min: 9, max: 9, key: "r9" },
    { min: 10, max: 10, key: "r10" },
    { min: 11, max: 11, key: "r11" },
    { min: 12, max: 12, key: "r12" },
    { min: 13, max: 13, key: "r13" },
    { min: 14, max: 14, key: "r14" },
    { min: 15, max: 99, key: "r15" },
  ],

  // Tabelas D66 de Mutações da Corrupção (Leves: 4 PC, Notáveis: 6 PC, Aberrantes: 8 PC)
  mutationsTable: {
    minor: [
      { min: 11, max: 13, key: "m11" },
      { min: 14, max: 16, key: "m14" },
      { min: 21, max: 23, key: "m22" },
      { min: 24, max: 26, key: "m24" },
      { min: 31, max: 33, key: "m31" },
      { min: 34, max: 36, key: "m34" },
      { min: 41, max: 43, key: "m41" },
      { min: 44, max: 46, key: "m44" },
      { min: 51, max: 56, key: "m51" },
      { min: 61, max: 63, key: "m61" },
      { min: 64, max: 64, key: "m64" },
      { min: 65, max: 65, key: "m65" },
      { min: 66, max: 66, key: "m66" },
    ],
    notable: [
      { min: 11, max: 13, key: "n11" },
      { min: 14, max: 16, key: "n14" },
      { min: 21, max: 23, key: "n22" },
      { min: 24, max: 26, key: "n24" },
      { min: 31, max: 33, key: "n31" },
      { min: 34, max: 36, key: "n34" },
      { min: 41, max: 43, key: "n41" },
      { min: 44, max: 46, key: "n44" },
      { min: 51, max: 56, key: "n51" },
      { min: 61, max: 63, key: "n61" },
      { min: 64, max: 64, key: "n64" },
      { min: 65, max: 66, key: "n65" },
    ],
    aberrant: [
      { min: 11, max: 13, key: "a11" },
      { min: 14, max: 16, key: "a14" },
      { min: 21, max: 23, key: "a22" },
      { min: 24, max: 26, key: "a24" },
      { min: 31, max: 33, key: "a31" },
      { min: 34, max: 36, key: "a34" },
      { min: 41, max: 43, key: "a41" },
      { min: 44, max: 46, key: "a44" },
      { min: 51, max: 56, key: "a51" },
      { min: 61, max: 63, key: "a61" },
      { min: 64, max: 65, key: "a64" },
      { min: 66, max: 66, key: "a66" },
    ],
  },

  // Tabela D66 de Ferimentos Críticos oficial de Egrégora
  criticalInjuriesTable: [
    { min: 11, max: 11, key: "11", lethal: false, timeLimit: "—", healMod: 0, healingTime: "—" },
    { min: 12, max: 12, key: "12", lethal: false, timeLimit: "—", healMod: 0, healingTime: "—" },
    { min: 13, max: 13, key: "13", lethal: false, timeLimit: "—", healMod: 0, healingTime: "D6" },
    { min: 14, max: 14, key: "14", lethal: false, timeLimit: "—", healMod: 0, healingTime: "D6" },
    { min: 15, max: 15, key: "15", lethal: false, timeLimit: "—", healMod: 0, healingTime: "D6" },
    { min: 16, max: 16, key: "16", lethal: false, timeLimit: "—", healMod: 0, healingTime: "2D6" },
    { min: 21, max: 21, key: "21", lethal: false, timeLimit: "—", healMod: 0, healingTime: "D6" },
    { min: 22, max: 22, key: "22", lethal: false, timeLimit: "—", healMod: 0, healingTime: "2D6" },
    { min: 23, max: 23, key: "23", lethal: false, timeLimit: "—", healMod: 0, healingTime: "2D6" },
    { min: 24, max: 24, key: "24", lethal: false, timeLimit: "—", healMod: 0, healingTime: "2D6" },
    { min: 25, max: 25, key: "25", lethal: false, timeLimit: "—", healMod: 0, healingTime: "2D6" },
    { min: 26, max: 26, key: "26", lethal: false, timeLimit: "—", healMod: 0, healingTime: "D6" },
    { min: 31, max: 31, key: "31", lethal: false, timeLimit: "—", healMod: 0, healingTime: "2D6" },
    { min: 32, max: 32, key: "32", lethal: false, timeLimit: "—", healMod: 0, healingTime: "3D6" },
    { min: 33, max: 33, key: "33", lethal: false, timeLimit: "—", healMod: 0, healingTime: "3D6" },
    { min: 34, max: 34, key: "34", lethal: false, timeLimit: "—", healMod: 0, healingTime: "2D6" },
    { min: 35, max: 35, key: "35", lethal: false, timeLimit: "—", healMod: 0, healingTime: "2D6" },
    { min: 36, max: 36, key: "36", lethal: true, timeLimit: "D6 dias", healMod: 0, healingTime: "2D6" },
    { min: 41, max: 41, key: "41", lethal: true, timeLimit: "D6 dias", healMod: 0, healingTime: "3D6" },
    { min: 42, max: 42, key: "42", lethal: true, timeLimit: "D6 dias", healMod: 0, healingTime: "4D6" },
    { min: 43, max: 43, key: "43", lethal: true, timeLimit: "D6 dias", healMod: 0, healingTime: "4D6" },
    { min: 44, max: 44, key: "44", lethal: true, timeLimit: "D6 horas", healMod: 0, healingTime: "4D6" },
    { min: 45, max: 45, key: "45", lethal: true, timeLimit: "D6 horas", healMod: 0, healingTime: "4D6" },
    { min: 46, max: 46, key: "46", lethal: true, timeLimit: "D6 horas", healMod: 0, healingTime: "2D6" },
    { min: 51, max: 51, key: "51", lethal: true, timeLimit: "D6 horas", healMod: 0, healingTime: "4D6" },
    { min: 52, max: 52, key: "52", lethal: true, timeLimit: "D6 horas", healMod: 0, healingTime: "4D6" },
    { min: 53, max: 53, key: "53", lethal: true, timeLimit: "D6 minutos", healMod: 0, healingTime: "D6" },
    { min: 54, max: 54, key: "54", lethal: true, timeLimit: "D6 minutos", healMod: -1, healingTime: "2D6" },
    { min: 55, max: 55, key: "55", lethal: true, timeLimit: "D6 minutos", healMod: -1, healingTime: "D6" },
    { min: 56, max: 56, key: "56", lethal: true, timeLimit: "D6 minutos", healMod: -1, healingTime: "D6" },
    { min: 61, max: 64, key: "61", lethal: true, timeLimit: "D6 minutos", healMod: -1, healingTime: "—" },
    { min: 65, max: 66, key: "65", lethal: true, timeLimit: "Imediato", healMod: 0, healingTime: "—" },
  ],

  // Tabela D66 de Danos Críticos em Veículos
  vehicleCritTable: [
    { min: 11, max: 13, key: "v11" },
    { min: 14, max: 16, key: "v14" },
    { min: 21, max: 23, key: "v21" },
    { min: 24, max: 26, key: "v24" },
    { min: 31, max: 33, key: "v31" },
    { min: 34, max: 36, key: "v34" },
    { min: 41, max: 43, key: "v41" },
    { min: 44, max: 46, key: "v44" },
    { min: 51, max: 53, key: "v51" },
    { min: 54, max: 56, key: "v54" },
    { min: 61, max: 63, key: "v61" },
    { min: 64, max: 66, key: "v64" },
  ],
};

export function getCorruptionStage(value) {
  const n = Math.max(0, Number(value) || 0);
  return EGREGORA_CONFIG.corruptionStages.find(s => n >= s.min && n <= s.max)
    || EGREGORA_CONFIG.corruptionStages[0];
}
