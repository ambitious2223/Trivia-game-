import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '../src/questions');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
const counts = {};
for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const re = /category:\s*"([^"]+)"[^}]*difficulty:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const cat = m[1];
    const diff = m[2].replace(/\s+/g, '').toLowerCase();
    if (!counts[cat]) counts[cat] = {};
    counts[cat][diff] = (counts[cat][diff] || 0) + 1;
  }
}
const sorted = Object.keys(counts).sort();
for (const cat of sorted) {
  const d = counts[cat];
  const total = Object.values(d).reduce((a, b) => a + b, 0);
  console.log(`${cat}: total=${total} ${JSON.stringify(d)}`);
}
