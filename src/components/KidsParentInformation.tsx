import type { Translator, TranslationKey } from '../i18n';
export function KidsParentInformation({t,body}:{t:Translator;body:TranslationKey}) {
 return <details className="kids-parent-information"><summary>{t('kidsParentTitle')}</summary><p>{t(body)}</p></details>;
}
export function KidsComfort({t}:{t:Translator}) {
 return <p className="kids-comfort">{t('kidsPacingComfort')} {t('kidsDizzinessComfort')}</p>;
}
