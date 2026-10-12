export default function NotFound() {
  return (
    <main lang="it" className="page">
      <header className="brand">
        <h1>
          <img src="/logo.svg" alt="Quelli della Pizza" width={96} height={96} />
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
