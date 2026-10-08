import { Coffee, CookingPot, Flame, Hamburger, House, Utensils, type LucideIcon } from "lucide-react";

export type CuisineLook = { key: string; label: string; icon: LucideIcon; bg: string; text: string; soft: string };

/** Each kind of food gets its own signboard colour and icon. */
const LOOKS: (CuisineLook & { match: RegExp })[] = [
  { key: "chai", label: "Chai & snacks", match: /chai|tea|snack|paratha/i, icon: Coffee, bg: "bg-haldi", text: "text-chai", soft: "bg-haldi-light" },
  { key: "biryani", label: "Biryani", match: /biryani|rice|pulao/i, icon: CookingPot, bg: "bg-chili", text: "text-white", soft: "bg-chili-light" },
  { key: "desi", label: "Desi", match: /desi|karahi|bbq|tikka|dhaba/i, icon: Flame, bg: "bg-patti", text: "text-white", soft: "bg-patti-light" },
  { key: "fast", label: "Burgers", match: /burger|fast|pizza|fries/i, icon: Hamburger, bg: "bg-neel", text: "text-white", soft: "bg-neel-light" },
  { key: "home", label: "Home food", match: /home|ghar|ammi/i, icon: House, bg: "bg-gulabi", text: "text-white", soft: "bg-gulabi-light" },
];

const FALLBACK: CuisineLook = { key: "other", label: "Other", icon: Utensils, bg: "bg-chai", text: "text-white", soft: "bg-chai-line" };

export function cuisineLook(cuisine: string, name = ""): CuisineLook {
  return LOOKS.find((l) => l.match.test(cuisine) || l.match.test(name)) ?? FALLBACK;
}

export const CUISINE_FILTERS = LOOKS.map(({ key, label, icon }) => ({ key, label, icon }));
