// Central registry of visual templates. Each one controls which header
// elements appear — everything else (fonts, colors, body layout) stays
// identical across templates.
export const ORDONNANCE_TEMPLATES = [
  {
    id: "classic",
    label: "Complet",
    description: "Nom du médecin en français et en arabe, avec logo.",
    theme: {
      fontFamily: "'Times New Roman', Times, serif",
      primary: "#1e3a5f",
      muted: "#52606d",
      border: "#94a3b8",
      showLogo: true,
      showArabicName: true,
      nameColumnWidth: 170,
    },
  },
  {
    id: "sans_ar",
    label: "Sans nom arabe",
    description: "Uniquement le nom du médecin en français, avec logo.",
    theme: {
      fontFamily: "'Times New Roman', Times, serif",
      primary: "#1e3a5f",
      muted: "#52606d",
      border: "#94a3b8",
      showLogo: true,
      showArabicName: false,
      nameColumnWidth: 340,
    },
  },
  {
    id: "sans_logo",
    label: "Sans logo",
    description: "Nom du médecin en français et en arabe, sans logo.",
    theme: {
      fontFamily: "'Times New Roman', Times, serif",
      primary: "#1e3a5f",
      muted: "#52606d",
      border: "#94a3b8",
      showLogo: false,
      showArabicName: true,
      nameColumnWidth: 210,
    },
  },
];

export const DEFAULT_TEMPLATE_ID = "classic";

export const getTemplate = (id) =>
  ORDONNANCE_TEMPLATES.find((t) => t.id === id) ||
  ORDONNANCE_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID);