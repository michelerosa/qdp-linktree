import type { PageModel } from '@/lib/view-model';
import { CountrySelect } from './CountrySelect';
import { SocialIcons } from './SocialIcons';

const SNOWFLAKE = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2v20M4.9 7l14.2 10M19.1 7L4.9 17" />
  </svg>
);

export function LinkPage({ model }: { model: PageModel }) {
  return (
    <main lang={model.lang} className="page">
      <header className="brand">
        <img src="/logo.svg" alt="" width={72} height={72} />
        <h1>Quelli della Pizza</h1>
      </header>

      <ul className="pills">
        {model.pills.map((p) => (
          <li key={p.id}>
            <a href={p.href} className="pill">
              <span className="pill-title">{p.title}</span>
              <span className={`tag tag-${p.kind}`}>
                {p.kind === 'frozen' && SNOWFLAKE}
                {p.tag}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <SocialIcons />

      <CountrySelect
        countryLabel={model.countryLabel}
        changeLabel={model.t.changeCountry}
        current={model.currentValue}
        options={model.options}
        src={model.src}
      />
    </main>
  );
}
