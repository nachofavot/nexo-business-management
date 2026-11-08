export type SortDirection = 'asc' | 'desc';

export interface Page<T> {
  items: readonly T[];
  page: number;
  pageCount: number;
  totalItems: number;
}

/** Permite encontrar "García" escribiendo "garcia". */
function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function searchItems<T>(
  items: readonly T[],
  query: string,
  getFields: (item: T) => readonly string[],
): readonly T[] {
  const needle = normalizeForSearch(query);
  if (needle === '') return items;

  return items.filter((item) =>
    getFields(item).some((field) => normalizeForSearch(field).includes(needle)),
  );
}

/** `numeric` ordena "Switch de 8" antes que "Switch de 24", como lo leería una persona. */
function compareKeys(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'es', { sensitivity: 'base', numeric: true });
}

function isEmptyKey(key: string | number): boolean {
  return typeof key === 'string' && key.trim() === '';
}

/** Un dato vacío, como una empresa sin cargar, queda al final en los dos sentidos. */
export function sortItems<T>(
  items: readonly T[],
  getKey: (item: T) => string | number,
  direction: SortDirection,
): readonly T[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const keyA = getKey(a);
    const keyB = getKey(b);
    const emptyA = isEmptyKey(keyA);
    const emptyB = isEmptyKey(keyB);
    if (emptyA !== emptyB) return emptyA ? 1 : -1;
    return sign * compareKeys(keyA, keyB);
  });
}

/** Si la página pedida ya no existe, por ejemplo tras un borrado, devuelve la más cercana. */
export function paginate<T>(items: readonly T[], page: number, pageSize: number): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const start = (currentPage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: currentPage,
    pageCount,
    totalItems: items.length,
  };
}
