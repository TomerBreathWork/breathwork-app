import {readFileSync,writeFileSync} from 'node:fs';
const locales=Object.fromEntries(['en','he','ja'].map(language=>[language,JSON.parse(readFileSync(new URL(`../src/locales/${language}.json`,import.meta.url),'utf8'))]));
const escape=value=>value.replaceAll('|','\\|').replaceAll('\n',' ');
const rows=Object.keys(locales.en).map(key=>`| ${key} | ${['en','he','ja'].map(language=>escape(locales[language][key])).join(' | ')} |`);
writeFileSync(new URL('../docs/translations.md',import.meta.url),'# Breath Flow translation review\n\nGenerated from `src/locales/{en,he,ja}.json`. Run `node scripts/generate-translations.mjs` after editing. Branding stays unchanged. Native-speaker review is welcome. Named placeholders must match in every language. Add new media-name keys in the dictionaries and `sceneKeys` in `src/i18n.ts`.\n\n| Key | English | עברית | 日本語 |\n| --- | --- | --- | --- |\n'+rows.join('\n')+'\n');
