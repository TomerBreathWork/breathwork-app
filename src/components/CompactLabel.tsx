import { memo, type CSSProperties } from "react";
import { japaneseLabelUnits } from "../japanese-label";
/** Only Japanese labels gain wrappers; English and Hebrew retain their layout. */
export const CompactLabel = memo(function CompactLabel({ children }: { children: string }) {
  const units = japaneseLabelUnits(children);
  if (!units) return <>{children}</>;
  return <span className="compact-ja-label" lang="ja" aria-label={children} style={{ "--label-length": [...children].length } as CSSProperties}>
    {units.map((unit, index) => <span key={index} className="ja-text-unit" style={{ "--unit-length": [...unit].length } as CSSProperties}>{unit}</span>)}
  </span>;
});
