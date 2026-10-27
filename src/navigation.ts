import type { PracticeId } from "./practices.ts";
import { getPractice } from "./practices.ts";
export type Screen =
  | { name: "home" }
  | { name: "library" }
  | { name: "details"; id: PracticeId };
export function screenFromHistory(state: unknown): Screen {
  const view = (state as { breathFlowView?: Screen } | null)?.breathFlowView;
  if (view?.name === "library") return { name: "library" };
  if (view?.name === "details" && getPractice(view.id))
    return { name: "details", id: view.id };
  return { name: "home" };
}
