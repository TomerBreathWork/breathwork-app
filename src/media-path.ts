// Return null for malformed catalog paths so one invalid asset cannot crash the app.
export function resolveMediaPath(file: unknown, base: string): string | null {
 if(typeof file!=='string'||file.split('/').includes('..')||!/^media\/[\w .\-/]+\.(jpe?g|png|webp|mp3|wav|ogg)$/i.test(file))return null;
 return `${base}${file.split('/').map(encodeURIComponent).join('/')}`;
}
