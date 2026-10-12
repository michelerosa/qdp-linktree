export default function NotFound() {
  return (
    <main lang="it" className="page">
      <header className="brand">
        <img src="/logo.svg" alt="" width={72} height={72} />
        <h1>Quelli della Pizza</h1>
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
