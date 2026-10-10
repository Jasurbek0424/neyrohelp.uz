/** "Bosh og‘rig‘ining turlari" → "bosh-ogrigining-turlari" (sarlavha id lari, mundarija) */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[‘’ʻʼ'`]/g, '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
