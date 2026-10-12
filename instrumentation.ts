export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { store } = await import('./lib/data');
    // Il refresh all'avvio riduce la finestra in cui si serve lo snapshot. Fire-and-forget di proposito:
    // non va atteso, così uno shop giù non ritarda l'avvio dell'app.
    void store.refresh();
  }
}
