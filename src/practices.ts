import type { Rhythm } from "./engine.ts";
import type { TranslationKey } from "./i18n";
export type Category = "calm" | "energy" | "focus";
export type BreathingRoute = "nose" | "mouth";
export type PracticeId = "coherent" | "box" | "equal" | "extended" | "478";
export interface Practice {
  id: PracticeId;
  name: TranslationKey;
  short: TranslationKey;
  explanation: TranslationKey;
  benefit: TranslationKey;
  useCases: TranslationKey;
  caution?: TranslationKey;
  categories: Category[];
  icon: Category;
  rhythm: Rhythm;
  ratio?: 1 | 2;
  customization: "paired" | "equalPhases" | "phases";
  routes: { inhale: BreathingRoute; exhale: BreathingRoute };
  preset: string;
}
const nasal = { inhale: "nose", exhale: "nose" } as const;
export const practices: Practice[] = [
  {
    id: "coherent",
    name: "coherentBreathing",
    short: "coherentShort",
    explanation: "coherentExplanation",
    benefit: "coherentBenefit",
    useCases: "coherentUse",
    categories: ["calm", "focus"],
    icon: "focus",
    rhythm: [5.5, 0, 5.5, 0],
    customization: "paired",
    ratio: 1,
    routes: nasal,
    preset: "coherentBreathing",
  },
  {
    id: "box",
    name: "boxBreathing",
    short: "boxShort",
    explanation: "boxExplanation",
    benefit: "boxBenefit",
    useCases: "boxUse",
    caution: "holdCaution",
    categories: ["focus", "calm"],
    icon: "focus",
    rhythm: [4, 4, 4, 4],
    customization: "equalPhases",
    routes: nasal,
    preset: "boxBreathing",
  },
  {
    id: "equal",
    name: "equalName",
    short: "equalShort",
    explanation: "equalExplanation",
    benefit: "equalBenefit",
    useCases: "equalUse",
    categories: ["energy", "focus"],
    icon: "energy",
    rhythm: [4.5, 0, 4.5, 0],
    customization: "paired",
    ratio: 1,
    routes: nasal,
    preset: "custom",
  },
  {
    id: "extended",
    name: "extendedName",
    short: "extendedShort",
    explanation: "extendedExplanation",
    benefit: "extendedBenefit",
    useCases: "extendedUse",
    categories: ["calm"],
    icon: "calm",
    rhythm: [4, 0, 8, 0],
    customization: "paired",
    ratio: 2,
    routes: nasal,
    preset: "custom",
  },
  {
    id: "478",
    name: "eveningUnwind",
    short: "478Short",
    explanation: "478Explanation",
    benefit: "478Benefit",
    useCases: "478Use",
    caution: "holdCaution",
    categories: ["calm"],
    icon: "calm",
    rhythm: [4, 7, 8, 0],
    customization: "phases",
    routes: { inhale: "nose", exhale: "mouth" },
    preset: "eveningUnwind",
  },
];
export const categories: Category[] = ["calm", "energy", "focus"];
export const categoryKey = {
  calm: "categoryCalm",
  energy: "categoryEnergy",
  focus: "categoryFocus",
} as const;
export const getPractice = (id: unknown) =>
  practices.find((practice) => practice.id === id);
export const practiceForPreset = (preset: string) =>
  ({
    coherentBreathing: "coherent",
    boxBreathing: "box",
    eveningUnwind: "478",
  })[preset] ?? "custom";
/** Guided controls deliberately use a compact 0.5–10s base range. Full Custom
 * controls remain available on Home. Ratios never round their derived exhale. */
export function adjustPractice(practice: Practice, seconds: number): Rhythm {
  const base =
    Math.round(
      Math.min(10, Math.max(0.5, Number.isFinite(seconds) ? seconds : 0.5)) * 2,
    ) / 2;
  return practice.customization === "equalPhases"
    ? [base, base, base, base]
    : [base, 0, base * (practice.ratio ?? 1), 0];
}
export const isAdjusted = (practice: Practice, rhythm: Rhythm) =>
  rhythm.some((seconds, index) => seconds !== practice.rhythm[index]);
