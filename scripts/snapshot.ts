import { writeFileSync } from 'node:fs';
import { SHOPS } from '../lib/sites';
import { fetchShopCountries } from '../lib/wc';

async function main() {
  const out: Record<string, string[]> = {};
  for (const s of SHOPS) {
    out[s.id] = await fetchShopCountries(s.id);
    console.log(`${s.id}: ${out[s.id].length} nazioni`);
  }
  writeFileSync('data/snapshot.json', JSON.stringify(out, null, 2) + '\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
