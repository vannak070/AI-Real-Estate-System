import { useEffect, useState } from 'react';
import { Select } from '@era/ui';
import { loadProvinces, label, type ProvinceNode } from '../../data/locations';

export interface LocationValue {
  province?: string;
  district?: string;
  commune?: string;
  village?: string;
}

/**
 * Cascading Province/City -> District/Khan -> Commune/Sangkat -> Phum picker,
 * backed by the real NCDD gazetteer (see data/locations.ts) — not free text.
 * Changing a level resets everything below it, since a child selection from
 * the old parent is no longer valid.
 */
export function LocationPicker({ value, onChange }: { value: LocationValue; onChange: (v: LocationValue) => void }) {
  const [provinces, setProvinces] = useState<ProvinceNode[] | null>(null);

  useEffect(() => {
    loadProvinces().then(setProvinces);
  }, []);

  const province = provinces?.find((p) => p.en === value.province);
  const district = province?.districts.find((d) => d.en === value.district);
  const commune = district?.communes.find((c) => c.en === value.commune);

  if (!provinces) {
    return <p className="text-sm text-gray-400">Loading locations…</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Province / City</span>
        <Select
          className="mt-1 w-full"
          value={value.province ?? ''}
          onChange={(e) => onChange({ province: e.target.value || undefined })}
        >
          <option value="">Select province/city</option>
          {provinces.map((p) => (
            <option key={p.code} value={p.en}>
              {label(p)}
            </option>
          ))}
        </Select>
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">District / Khan</span>
        <Select
          className="mt-1 w-full"
          value={value.district ?? ''}
          disabled={!province}
          onChange={(e) => onChange({ province: value.province, district: e.target.value || undefined })}
        >
          <option value="">Select district/khan</option>
          {province?.districts.map((d) => (
            <option key={d.code} value={d.en}>
              {label(d)}
            </option>
          ))}
        </Select>
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Commune / Sangkat</span>
        <Select
          className="mt-1 w-full"
          value={value.commune ?? ''}
          disabled={!district}
          onChange={(e) =>
            onChange({ province: value.province, district: value.district, commune: e.target.value || undefined })
          }
        >
          <option value="">Select commune/sangkat</option>
          {district?.communes.map((c) => (
            <option key={c.code} value={c.en}>
              {label(c)}
            </option>
          ))}
        </Select>
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Phum (village)</span>
        <Select
          className="mt-1 w-full"
          value={value.village ?? ''}
          disabled={!commune}
          onChange={(e) => onChange({ ...value, village: e.target.value || undefined })}
        >
          <option value="">Select phum</option>
          {commune?.villages.map((v) => (
            <option key={v.code} value={v.en}>
              {label(v)}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}
