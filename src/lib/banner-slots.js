/** Home page banner slots and colour themes (safe for client and server). */
export const SLOTS = {
  HOME_HERO: {
    label: "Main banner",
    hint: "The large banner at the top of the home page. Wide photo, about 2400 × 1200.",
  },
  HOME_TILE_1: {
    label: "Large tile",
    hint: "Tall tile on the left, below “Pay your way”. Portrait or square photo.",
  },
  HOME_TILE_2: { label: "Top right tile", hint: "Half colour, half photo. Square photo." },
  HOME_TILE_3: { label: "Bottom right tile", hint: "Half colour, half photo. Square photo." },
};

/** Colour panel for the right-hand tiles. Hero and large tile sit on a dark photo overlay. */
export const THEMES = {
  crimson: { label: "Crimson", panel: "bg-accent text-accent-fg", button: "bg-surface text-brand" },
  emerald: { label: "Emerald", panel: "bg-emerald text-emerald-fg", button: "bg-surface text-fg" },
  saffron: { label: "Saffron", panel: "bg-saffron text-saffron-fg", button: "bg-panel text-on-panel" },
  dark: { label: "Black", panel: "bg-panel text-on-panel", button: "bg-on-panel text-panel" },
};
