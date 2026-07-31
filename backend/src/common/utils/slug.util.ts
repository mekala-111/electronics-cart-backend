export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function uniqueSlug(base: string, suffix: string | number): string {
  const slug = slugify(base);
  const tail = slugify(String(suffix));

  return tail ? `${slug}-${tail}` : slug;
}
