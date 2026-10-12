# qdp.link — pagina link geolocalizzata

Data: 12/10/2026 · Stato: design approvato

## Obiettivo

Una pagina stile Linktree, da mettere nella bio di Instagram e ovunque serva, che
mostra i social e i siti di Quelli della Pizza. I siti cambiano in base alla
nazione del visitatore. La pagina è **viva**: le nazioni servite da ogni shop si
leggono in automatico da WooCommerce, senza elenchi mantenuti a mano.

## Decisioni

| Tema | Decisione |
|---|---|
| Hosting | App Next.js su Sevalla, dominio `qdp.link` (`www` reindirizza all'apex) |
| Dati delle nazioni | Lettura in sola lettura della «Località di vendita» di WooCommerce di ogni shop |
| Contenuti | Config e traduzioni nel repo, nessun pannello admin |
| Lingua | Segue la nazione (it, fr, de, es, en) |
| Social | Uguali per tutti |
| Cambio paese | Selettore in fondo alla pagina più cookie, `?c=xx` e `/xx` |
| Analytics | Solo UTM sui link in uscita, nessun tracciamento sulla pagina |
| Grafica | Variante «E · Pill outline» del canvas mockup |

Canvas dei mockup: https://claude.ai/artifact/51bc8ZbPQuVWtTLJD5VHzf (`Pills.dc.html`).

## 1. Siti in gioco e regola di scelta

L'unico elenco fisso nel codice è quello dei siti, ognuno con un ruolo:

| Sito | Ruolo | Priorità | Nazioni |
|---|---|---|---|
| quellidellapizza.it (B2B) | fresco | 1 | da WooCommerce |
| quellidellapizza.fr | fresco | 1 | da WooCommerce |
| quellidellapizza.de | fresco | 1 | da WooCommerce |
| quellidellapizza.es | fresco | 1 | da WooCommerce |
| quellidellapizza.eu | fresco | 2 | da WooCommerce |
| casa.quellidellapizza.it | casa | 1 | da WooCommerce |
| frozen.quellidellapizza.com | surgelato | 1 | da WooCommerce |
| pizzafellas.com | vetrina | — | US (fissa in config) |
| inmeddegen.se | vetrina | — | SE (fissa in config) |
| quellidellapizza.com | ripiego | — | tutte le altre |

**Regola per la nazione X:**

1. Per ogni ruolo shop (fresco, casa, surgelato) si mostra il sito con la priorità
   più alta tra quelli che servono X. La priorità risolve le sovrapposizioni: se
   .eu abilitasse la Francia, in Francia vincerebbe comunque .fr.
2. Le vetrine compaiono **sempre** nel loro paese. Uno shop che serve lo stesso
   paese si aggiunge, non la sostituisce.
3. Se non è comparso niente, si mostra quellidellapizza.com.

Ordine delle pill: fresco, casa, surgelato, vetrina, ripiego.

Esempi: IT → B2B, CASA, Frozen · FR → .fr, Frozen · AT → .de · PL → .eu
(più Frozen se lo serve) · SE → inmeddegen.se (più .eu se un giorno la serve) ·
US → pizzafellas.com · BR → .com.

### Lettura da WooCommerce

- Endpoint `GET /wp-json/wc/v3/settings/general` con chiavi REST **in sola
  lettura** dedicate a ogni shop. La logica è la stessa di qdp-hub
  (`app/api/clienti/allowed-countries/route.ts`).
- `woocommerce_allowed_countries` ha tre valori:
  - `specific`: si usa `woocommerce_specific_allowed_countries`;
  - `all_except`: tutte le nazioni tranne `woocommerce_all_except_countries`;
  - `all`: **contato come nessuna nazione**, con un warning nel log. Altrimenti
    quel sito coprirebbe il mondo intero e .com sparirebbe.
- I dati restano in memoria. Il refresh gira **in background ogni ora**, quindi
  le richieste dei visitatori non aspettano mai WooCommerce.
- Se uno shop fallisce si tiene la sua ultima versione buona. All'avvio a freddo
  si parte da `data/snapshot.json` nel repo, rigenerato a mano con
  `npm run snapshot`.

## 2. Rilevamento della nazione

Si decide lato server, a ogni richiesta, con la prima fonte disponibile:

1. percorso `qdp.link/fr`;
2. parametro `?c=fr`;
3. cookie `qdp_country`, impostato dal selettore, valido 1 anno;
4. header `CF-IPCountry`, aggiunto da Cloudflare davanti a Sevalla;
5. nessun dato (header assente, `XX`, `T1`): «Altro paese», cioè .com.

I codici sconosciuti si ignorano e si passa alla fonte successiva.

**Da verificare per primo:** che Sevalla passi `CF-IPCountry` all'app. Se non lo
passa, si ripiega su MaxMind GeoLite2 locale, con lo stesso flusso.

## 3. Pagina

- Dall'alto: logo SVG, «Quelli della Pizza», le pill dei siti, la riga dei
  social e in fondo «‹Paese› · cambia paese».
- **Pill:** bordo nero, titolo breve e un'etichetta colorata: Fresco (giallo
  #FFD000), Surgelato (azzurro con il fiocco), Casa e Catalogo (grigio). Sulla
  vetrina va il nome del brand. Tutta la pill è un link e si apre nella stessa
  scheda.
- **Social:** [Instagram](https://instagram.com/quellidellapizza/),
  [TikTok](https://www.tiktok.com/@quellidellapizza),
  [YouTube](https://www.youtube.com/QuelliDellaPizza),
  [Facebook](https://facebook.com/quellidellapizza),
  [LinkedIn](https://linkedin.com/company/quellidellapizza/).
- **Lingua:** quella del paese se è tra it, fr, de, es, en; altrimenti la prima
  supportata in `Accept-Language`; altrimenti en. La pagina imposta
  `<html lang>`.
- **Cambio paese:** `<select>` nativo con le nazioni servite da almeno un sito
  (dai dati vivi), le vetrine e «Altro paese». La scelta imposta il cookie e
  ricarica la pagina.
- **UTM:** `utm_source=<src>&utm_medium=social&utm_campaign=linktree&utm_content=<paese>`.
  `src` vale `instagram` di default e si cambia con `?src=tiktok` (ecc.).
- **Tecnica:** rendering lato server a ogni richiesta, senza cache CDN condivisa
  perché il contenuto cambia per paese. Un solo font (Archivo). Anteprima OG con
  logo e nome. Pagina indicizzabile.

## 4. Errori e monitoraggio

| Caso | Comportamento |
|---|---|
| Shop giù o in errore | Ultima versione buona di quello shop, warning nel log |
| Avvio a freddo con tutti gli shop giù | Snapshot JSON |
| Header geo assente | Lingua dal browser, paese «Altro» (.com), selettore visibile |
| Shop su «vendi a tutte» | Nessuna nazione, warning nel log |

`GET /health` restituisce, per ogni shop, l'ora dell'ultimo refresh riuscito e il
numero di nazioni. Risponde 503 se uno shop non si aggiorna da più di 24 ore
(serve all'uptime check). Niente Sentry.

## 5. Test (Vitest)

- Funzione pura di scelta dei siti: casi IT, FR, AT, PL, SE, US, BR, la
  sovrapposizione .fr/.eu e uno shop su «vendi a tutte».
- Parsing delle impostazioni WooCommerce (`specific`, `all_except`, `all`).
- Scelta della lingua, ordine di decisione del paese, costruzione degli UTM.
- Un test di rendering della pagina con dati finti.

## 6. Configurazione e deploy

- Env su Sevalla: URL e chiavi REST in sola lettura dei 7 shop WooCommerce (IT,
  FR, DE, ES, EU, CASA, FROZEN). Sono stringhe di una riga, quindi niente base64.
- Auto-deploy da `main` con
  `ignore_deploy_paths = ["docs/**", "*.md", ".claude/**"]` impostati da subito.
- Dominio `qdp.link` (da registrare) come dominio custom su Sevalla, con `www`
  che reindirizza all'apex.

## Fuori scope

Pannello admin, contatori di click lato server, social diversi per paese, link in
evidenza temporanei.
