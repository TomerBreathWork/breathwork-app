import { CompactLabel } from "./CompactLabel";
import type { Translator } from "../i18n";
import {
  practicesForFilter,
  visibleCategories,
  categoryKey,
  type LibraryFilter,
  type PracticeId,
} from "../practices";
import { BeeArtwork } from "./BeeArtwork";
import { Fragment } from "react";
import { FlowerCandleStill } from "../prototypes/FlowerCandleCircle";
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
  category: LibraryFilter;
  onCategory: (category: LibraryFilter) => void;
  onSelect: (id: PracticeId) => void;
  back: () => void;
}) {
  const displayed = practicesForFilter(category);
  return (
    <main className="discovery-panel glass-panel" aria-label={t("explore")}>
      <div className="discovery-heading">
        <button className="text-button discovery-back" onClick={back}>
          <CompactLabel>{t("goBack")}</CompactLabel>
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
          <CompactLabel>{t("allPractices")}</CompactLabel>
        </button>
        {visibleCategories.map((id) => (
          <button
            key={id}
            onClick={() => onCategory(id)}
            aria-pressed={category === id}
          >
            <CategoryIcon category={id} />
            <CompactLabel>{t(categoryKey[id])}</CompactLabel>
          </button>
        ))}
        <button onClick={() => onCategory("kids")} aria-pressed={category === "kids"}><CompactLabel>{t("categoryKids")}</CompactLabel></button>
      </div>
      <div className="discovery-scroll practice-list">
        {displayed
          .map((practice,index) => (
            <Fragment key={practice.id}>
            {category === "all" && practice.audience === "kids" && displayed[index-1]?.audience !== "kids" && <h3 className="kids-group-title">{t("categoryKids")}</h3>}
            <button
              className={`practice-card ${practice.audience === "kids" ? "kids-card" : ""}`}
              key={practice.id}
              data-practice={practice.id}
              onClick={() => onSelect(practice.id)}
            >
              {practice.id === "bee-breathing" ? <span className="kids-card-art"><BeeArtwork kind="bee" /></span> : practice.audience === "kids" ? <span className="kids-card-art"><FlowerCandleStill kind="flower" /><FlowerCandleStill kind="candle" /></span> : <CategoryIcon category={practice.icon} />}
              <span>
                <strong><CompactLabel>{t(practice.name)}</CompactLabel></strong>
                <span>{t(practice.short)}</span>
                <bdi className="practice-rhythm">
                  {(practice.audience === "kids" ? [practice.rhythm[0],practice.rhythm[2]] : practice.rhythm).join(" / ")} {t("seconds")}
                  {practice.ratio ? ` · 1:${practice.ratio}` : ""}
                </bdi>
              </span>
              <Icon name="chevron" />
            </button>
            </Fragment>
          ))}
      </div>
    </main>
  );
}
