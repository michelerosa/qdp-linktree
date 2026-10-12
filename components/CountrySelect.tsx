'use client';

import { setCountryHref } from '@/lib/utm';
import type { CountryOption } from '@/lib/view-model';

export function CountrySelect(props: {
  countryLabel: string;
  changeLabel: string;
  current: string;
  options: CountryOption[];
  src: string;
}) {
  return (
    <label className="country">
      <span>
        {props.countryLabel} · <u>{props.changeLabel}</u>
      </span>
      <select
        aria-label={props.changeLabel}
        defaultValue={props.current}
        onChange={(e) => {
          const select = e.currentTarget;
          window.location.href = setCountryHref(select.value, props.src);
          // bfcache: tornando indietro la select mostra il valore corrente e si può riselezionare
          select.value = props.current;
        }}
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
