import { ladderFillQuestions } from '../src/questions/ladderFill.js';

const ZERO_HARD_CATS = [
  'إمبراطوريات وحروب',
  'تاريخ إسلامي',
  'تريندات وسوشيال ميديا',
  'جغرافيا وعواصم',
  'سينما ومسرح',
  'كرة القدم',
  'معالم عربية',
  'موسيقى وطرب',
];

const THIN_MINS = {
  'ذكاء يومي وألغاز': { hard: 5, crazy: 3, easy: 20, medium: 15 },
  'لهجات عربية': { hard: 7, crazy: 3 },
  'تراث وأزياء': { hard: 5, crazy: 3 },
};

const CRAZY_ONLY_CATS = [
  'أساطير وخرافات',
  'أعلام وعملات',
  'الأحياء',
  'الاقتصاد والتجارة',
  'الرياضيات والمنطق',
  'ألعاب وتقنية',
  'الفضاء والفلك',
  'الفلسفة والمنطق',
  'الفيزياء',
  'الكيمياء',
  'أمثال شعبية',
  'أنمي ومانغا',
  'جسم الإنسان',
  'شعر وأدب',
  'عالم الحيوان',
  'عالم السيارات',
  'علم النفس والسلوك',
  'علماء واختراعات',
  'فوازير وألغاز',
  'قصص الأنبياء',
  'كرتون أيام زمان',
  'مطبخ عربي',
];

const counts = {};
let answerErrors = 0;

for (const item of ladderFillQuestions) {
  if (!item.choices.includes(item.a)) {
    console.error(`FAIL: answer not in choices — ${item.q.slice(0, 60)}…`);
    answerErrors++;
  }
  const cat = item.category;
  const diff = item.difficulty;
  if (!counts[cat]) counts[cat] = { easy: 0, medium: 0, hard: 0, crazy: 0 };
  counts[cat][diff] = (counts[cat][diff] || 0) + 1;
}

let minErrors = 0;

for (const cat of ZERO_HARD_CATS) {
  const c = counts[cat] || {};
  if ((c.hard || 0) < 8) {
    console.error(`FAIL: ${cat} hard=${c.hard || 0} (need >=8)`);
    minErrors++;
  }
  if ((c.crazy || 0) < 3) {
    console.error(`FAIL: ${cat} crazy=${c.crazy || 0} (need >=3)`);
    minErrors++;
  }
}

for (const [cat, mins] of Object.entries(THIN_MINS)) {
  const c = counts[cat] || {};
  for (const [diff, need] of Object.entries(mins)) {
    if ((c[diff] || 0) < need) {
      console.error(`FAIL: ${cat} ${diff}=${c[diff] || 0} (need >=${need})`);
      minErrors++;
    }
  }
}

for (const cat of CRAZY_ONLY_CATS) {
  const c = counts[cat] || {};
  if ((c.crazy || 0) < 3) {
    console.error(`FAIL: ${cat} crazy=${c.crazy || 0} (need >=3)`);
    minErrors++;
  }
}

console.log('\n=== ladderFill.js Summary ===');
console.log(`Total questions: ${ladderFillQuestions.length}`);
console.log('');
console.log('Category'.padEnd(28) + 'easy  med   hard  crazy');
console.log('-'.repeat(56));

const sorted = Object.keys(counts).sort();
for (const cat of sorted) {
  const c = counts[cat];
  console.log(
    cat.padEnd(28) +
      String(c.easy || 0).padStart(4) +
      String(c.medium || 0).padStart(6) +
      String(c.hard || 0).padStart(6) +
      String(c.crazy || 0).padStart(7)
  );
}

console.log('');
if (answerErrors || minErrors) {
  console.error(`FAILED: ${answerErrors} answer errors, ${minErrors} minimum errors`);
  process.exit(1);
}
console.log('OK: all checks passed');
