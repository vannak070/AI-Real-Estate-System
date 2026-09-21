/**
 * Cambodia's administrative divisions (Province/City -> District/Khan ->
 * Commune/Sangkat -> Phum/village), sourced from the NCDD gazetteer via the
 * MIT-licensed `cambodia-gazetteer` dataset (github.com/RathanakSreang/
 * cambodia-gazetteer). Real official codes/names, not invented — the file
 * is lazy-loaded (dynamic import) since it's ~1.1MB, only needed when the
 * location picker actually renders.
 */

export interface LocationNode {
  code: string;
  en: string;
  km: string;
}

export interface CommuneNode extends LocationNode {
  villages: LocationNode[];
}

export interface DistrictNode extends LocationNode {
  communes: CommuneNode[];
}

export interface ProvinceNode extends LocationNode {
  districts: DistrictNode[];
}

let cache: ProvinceNode[] | null = null;

export async function loadProvinces(): Promise<ProvinceNode[]> {
  if (!cache) {
    const mod = await import('./khmer-locations.json');
    cache = mod.default as ProvinceNode[];
  }
  return cache;
}

export function label(node: LocationNode): string {
  return `${node.en} — ${node.km}`;
}
