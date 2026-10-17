// Catalogue des examens du bilan biologique, d'après le formulaire papier du cabinet.
// Les `id` sont stables : ce sont eux qui sont stockés/transmis (jamais les libellés),
// ce qui permet de renommer un libellé sans casser les anciens bilans.

export const BILAN_CATEGORIES = [
  {
    id: "hemato",
    label: "Hématologie / Inflammation",
    tests: [
      { id: "fns", label: "FNS" },
      { id: "vs", label: "VS" },
      { id: "crp", label: "CRP" },
      { id: "fibrinogene", label: "Fibrinogène" },
      { id: "groupage", label: "Groupage Rh" },
    ],
  },
  {
    id: "hemostase",
    label: "Hémostase",
    tests: [
      { id: "tp_inr", label: "TP - INR" },
      { id: "tck", label: "TCK" },
      { id: "ddimere", label: "D-dimère" },
    ],
  },
  {
    id: "rhumato",
    label: "Rhumatologie",
    tests: [
      { id: "waaler", label: "Waaler Rose" },
      { id: "ccp", label: "AC anti-CCP" },
      { id: "latex", label: "Latex" },
    ],
  },
  {
    id: "diabete",
    label: "Diabète",
    tests: [
      { id: "glycemie_jeun", label: "Glycémie à jeun" },
      { id: "glycemie_pp", label: "Glycémie post-prandiale" },
      { id: "hba1c", label: "HbA1c" },
    ],
  },
  {
    id: "renal",
    label: "Fonction rénale",
    tests: [
      { id: "uree", label: "Urée" },
      { id: "creatinemie", label: "Créatinémie" },
      { id: "ionogramme", label: "Ionogramme sanguin" },
      { id: "proteinurie_24h", label: "Protéinurie des 24h" },
      { id: "acide_urique", label: "Acide urique" },
    ],
  },
  {
    id: "lipides",
    label: "Bilan lipidique",
    tests: [
      { id: "triglycerides", label: "Triglycérides" },
      { id: "cholesterol", label: "Cholestérol (total - LDL - HDL)" },
    ],
  },
  {
    id: "hepatique",
    label: "Bilan hépatique",
    tests: [
      { id: "bilirubine_totale", label: "Bilirubine totale" },
      { id: "bilirubine_conjuguee", label: "Bilirubine conjuguée" },
      { id: "phosphatases", label: "Phosphatases alcalines" },
      { id: "transaminases", label: "SGOT (ASAT) / SGPT (ALAT)" },
    ],
  },
  {
    id: "urines_selles",
    label: "Urines / Selles",
    tests: [
      { id: "ecbu", label: "ECB urinaire + antibiogramme" },
      { id: "parasitologie_selles", label: "Parasitologie des selles" },
    ],
  },
  {
    id: "divers",
    label: "Biochimie / Divers",
    tests: [
      { id: "fer", label: "Fer sérique" },
      { id: "calcemie", label: "Calcémie" },
      { id: "troponine", label: "Troponine" },
      { id: "vitamine_d", label: "Vitamine D" },
    ],
  },
  {
    id: "serologies",
    label: "Sérologies",
    tests: [
      { id: "toxo_rubeole", label: "Toxoplasmose + Rubéole" },
      { id: "hepatites_vih", label: "VIH - HB - HC - HA" },
      { id: "wright", label: "Sérologie de Wright" },
    ],
  },
  {
    id: "thyroide_immuno",
    label: "Thyroïde / Auto-immunité",
    tests: [
      { id: "thyroide", label: "TSH - T4 - Ac anti-TPO" },
      { id: "anti_phospholipides", label: "Ac anti-phospholipides" },
      { id: "anti_ena_adn", label: "Ac anti-ENA / anti-ADN natif" },
    ],
  },
];

// Raccourcis de sélection (ajoutent des examens à la sélection en cours).
// Modifiables librement : seuls les `id` ci-dessus doivent exister.
export const BILAN_PRESETS = [
  { id: "routine", label: "Bilan de routine", tests: ["fns", "glycemie_jeun", "uree", "creatinemie", "cholesterol", "triglycerides", "transaminases"] },
  { id: "diabete", label: "Suivi diabète", tests: ["glycemie_jeun", "hba1c", "creatinemie", "cholesterol", "triglycerides", "ecbu"] },
  { id: "lipidique", label: "Lipidique", tests: ["cholesterol", "triglycerides", "glycemie_jeun"] },
  { id: "renal", label: "Rénal", tests: ["uree", "creatinemie", "ionogramme", "acide_urique", "ecbu"] },
  { id: "inflammatoire", label: "Inflammatoire", tests: ["fns", "vs", "crp", "fibrinogene"] },
];

// Liste à plat dans l'ordre du catalogue.
export const ALL_BILAN_TESTS = BILAN_CATEGORIES.flatMap((c) => c.tests);

// Garde uniquement les ids connus, dans l'ordre du catalogue.
export const normalizeBilanTests = (ids = []) => {
  const set = new Set(ids);
  return ALL_BILAN_TESTS.filter((t) => set.has(t.id)).map((t) => t.id);
};

// [{ id, label, tests: [{ id, label }] }] — uniquement les catégories ayant au moins un examen coché.
export const groupSelectedBilan = (ids = []) => {
  const set = new Set(ids);
  return BILAN_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    tests: c.tests.filter((t) => set.has(t.id)),
  })).filter((g) => g.tests.length > 0);
};