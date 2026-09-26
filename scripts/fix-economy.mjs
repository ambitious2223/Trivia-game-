import fs from 'fs';
const p = 'scripts/complete-ladder.mjs';
let s = fs.readFileSync(p, 'utf8');
const old = "    ['ما المصطلح الذي يصف رkود النشاط الاقtصادي؟', 'الرkoud', ['الانكمash', 'التضخm', 'الرkoud', 'الخصخصة'], 'crazy'],";
const neu = "    ['ما المصطلح الذي يصف رkود النشاط الاقtصادي؟', 'الرkود', ['الانكمash', 'التضخm', 'الرkود', 'الخصخصة'], 'crazy'],";
if (!s.includes(old)) {
  // try line 37 variant
  const lines = s.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('رkود النشاط')) {
      lines[i] = neu;
      console.log('fixed line', i + 1);
    }
  }
  s = lines.join('\n');
} else {
  s = s.replace(old, neu);
}
fs.writeFileSync(p, s);
