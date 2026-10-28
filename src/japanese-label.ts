type WordSegmenter = new (locale: string, options: { granularity: "word" }) => {
  segment(text: string): Iterable<{ segment: string }>;
};
const Segmenter = (Intl as typeof Intl & { Segmenter?: WordSegmenter }).Segmenter;
const segmenter = Segmenter ? new Segmenter("ja", { granularity: "word" }) : undefined;
/** Keep words atomic; attach honorific prefixes, particles and punctuation.
 * Older browsers retain native strict Japanese line breaking as a fallback. */
export function japaneseLabelUnits(text: string): string[] | undefined {
  if (!segmenter || !/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text)) return;
  const units: string[] = [];
  let opening = "";
  for (const { segment } of segmenter.segment(text)) {
    if (/^[（「『(]+$/u.test(segment) || /^[おご]$/u.test(segment)) opening += segment;
    else if (!opening && units.length && (/^[、。）」』！？!?)]+$/u.test(segment) || /^(と|の|を|に|で|が|は|も|へ|や|から|まで)$/u.test(segment))) units[units.length - 1] += segment;
    else { units.push(opening + segment); opening = ""; }
  }
  if (opening) units.push(opening);
  return units;
}
