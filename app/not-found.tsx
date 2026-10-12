import logo from '@/assets/logo.svg';

export default function NotFound() {
  return (
    <main lang="it" className="page">
      <header className="brand">
        <h1>
          <img src={logo.src} alt="Quelli della Pizza" width={144} height={144} />
        </h1>
      </header>
      <p>Pagina non trovata</p>
      <ul className="pills">
        <li>
          <a href="/" className="pill">
            <span className="pill-title">Vai a qdp.link</span>
          </a>
        </li>
      </ul>
    </main>
  );
}
