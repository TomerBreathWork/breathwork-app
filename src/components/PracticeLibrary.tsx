import type { Translator } from "../i18n";
import {
  practices,
  visibleCategories,
  categoryKey,
  type Category,
  type PracticeId,
} from "../practices";
import { CategoryIcon } from "./CategoryIcon";
import { Icon } from "./Icons";
export function PracticeLibrary({
  t,
  category,
  onCategory,
  onSelect,
  back,
}: {
  t: Translator;
  category: Category | "all";
  onCategory: (category: Category | "all") => void;
  onSelect: (id: PracticeId) => void;
  back: () => void;
}) {
  return (
    <main className="discovery-panel glass-panel" aria-label={t("explore")}>
      <div className="discovery-heading">
        <button className="text-button discovery-back" onClick={back}>
          {t("goBack")}
        </button>
        <h2 tabIndex={-1}>{t("explore")}</h2>
      </div>
      <div
        className="category-filters"
        role="group"
        aria-label={t("practiceCategories")}
      >
        <button
          onClick={() => onCategory("all")}
          aria-pressed={category === "all"}
        >
          {t("allPractices")}
        </button>
        {visibleCategories.map((id) => (
          <button
            key={id}
            onClick={() => onCategory(id)}
            aria-pressed={category === id}
          >
            <CategoryIcon category={id} />
            {t(categoryKey[id])}
          </button>
        ))}
      </div>
      <div className="discovery-scroll practice-list">
        {practices
          .filter(
            (practice) =>
              category === "all" || practice.categories.includes(category),
          )
          .map((practice) => (
            <button
              className="practice-card"
              key={practice.id}
              data-practice={practice.id}
              onClick={() => onSelect(practice.id)}
            >
              <CategoryIcon category={practice.icon} />
              <span>
                <strong>{t(practice.name)}</strong>
                <span>{t(practice.short)}</span>
                <bdi className="practice-rhythm">
                  {practice.rhythm.join(" / ")} {t("seconds")}
                  {practice.ratio ? ` · 1:${practice.ratio}` : ""}
                </bdi>
              </span>
              <Icon name="chevron" />
            </button>
          ))}
      </div>
    </main>
  );
}
