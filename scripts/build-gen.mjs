/**
 * Builds scripts/generate-ladder-fill.mjs (inline data) + src/questions/ladderFill.js
 * Run: node scripts/build-gen.mjs && node scripts/verify-ladder-fill.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const genPath = path.join(dir, 'generate-ladder-fill.mjs');
const outPath = path.join(dir, '../src/questions/ladderFill.js');

function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
function serRow([q, a, c, d]) {
  return `    ['${esc(q)}', '${esc(a)}', [${c.map((x) => `'${esc(x)}'`).join(', ')}], '${d}']`;
}
function q(category, question, answer, choices, difficulty) {
  if (!choices.includes(answer)) throw new Error(`Mismatch [${category}] "${answer}" for: ${question.slice(0, 50)}`);
  const points = difficulty === 'easy' ? 50 : difficulty === 'medium' ? 100 : 200;
  return { category, q: question, a: answer, choices, difficulty, points, power: false };
}
function batch(category, rows) {
  return rows.map(([question, answer, choices, difficulty]) => q(category, question, answer, choices, difficulty));
}

const banks = {
  empires: (await import('../src/questions/empiresAndWars.js')).empiresAndWarsQuestions,
  islamic: (await import('../src/questions/islamicHistory.js')).islamicHistoryQuestions,
  trending: (await import('../src/questions/trending.js')).trendingQuestions,
  geo: (await import('../src/questions/geographyCapitals.js')).geographyCapitalsQuestions,
  cinema: (await import('../src/questions/cinemaAndTheater.js')).cinemaAndTheaterQuestions,
  football: (await import('../src/questions/football.js')).footballQuestions,
  landmarks: (await import('../src/questions/arabLandmarks.js')).arabLandmarksQuestions,
  music: (await import('../src/questions/musicAndSinging.js')).musicAndSingingQuestions,
  daily: (await import('../src/questions/dailyLifePuzzles.js')).dailyLifePuzzlesQuestions,
  accents: (await import('../src/questions/accents.js')).accentQuestions,
  heritage: (await import('../src/questions/heritageAndFashion.js')).heritageAndFashionQuestions,
  myths: (await import('../src/questions/mythsAndLegends.js')).mythsAndLegendsQuestions,
  flags: (await import('../src/questions/flags.js')).flagsQuestions,
  biology: (await import('../src/questions/biology.js')).biologyQuestions,
  economics: (await import('../src/questions/economics.js')).economicsQuestions,
  math: (await import('../src/questions/mathematics.js')).mathematicsQuestions,
  gaming: (await import('../src/questions/gamingTech.js')).gamingTechQuestions,
  space: (await import('../src/questions/spaceAstronomy.js')).spaceAstronomyQuestions,
  philosophy: (await import('../src/questions/philosophy.js')).philosophyQuestions,
  physics: (await import('../src/questions/physics.js')).physicsQuestions,
  chemistry: (await import('../src/questions/chemistry.js')).chemistryQuestions,
  proverbs: (await import('../src/questions/proverbs.js')).proverbsQuestions,
  anime: (await import('../src/questions/anime.js')).animeQuestions,
  anatomy: (await import('../src/questions/anatomy.js')).anatomyQuestions,
  poetry: (await import('../src/questions/poetryAndLiterature.js')).poetryAndLiteratureQuestions,
  animals: (await import('../src/questions/animalWorld.js')).animalWorldQuestions,
  automotive: (await import('../src/questions/automotive.js')).automotiveQuestions,
  psychology: (await import('../src/questions/psychology.js')).psychologyQuestions,
  scientists: (await import('../src/questions/scientistsInventions.js')).scientistsInventionsQuestions,
  riddles: (await import('../src/questions/riddles.js')).riddlesQuestions,
  prophets: (await import('../src/questions/prophets.js')).prophetsQuestions,
  cartoons: (await import('../src/questions/cartoons.js')).cartoonsQuestions,
  cuisine: (await import('../src/questions/arabCuisine.js')).arabCuisineQuestions,
};

function pool(bank, cat) {
  return bank.filter((x) => x.category === cat);
}

function row(item, diff) {
  return [item.q, item.a, [...item.choices], diff];
}

function byDifficulty(items) {
  const hard = items.filter((x) => /hard/i.test(x.difficulty));
  const medium = items.filter((x) => /medium/i.test(x.difficulty));
  const easy = items.filter((x) => /easy/i.test(x.difficulty));
  const rest = items.filter((x) => !/hard|medium|easy/i.test(x.difficulty));
  return [...hard, ...medium, ...easy, ...rest];
}

function take(bank, cat, count, diff, offset = 0) {
  return byDifficulty(pool(bank, cat)).slice(offset, offset + count).map((x) => row(x, diff));
}

function takeEasy(bank, cat, count, offset = 0) {
  const easy = pool(bank, cat).filter((x) => /easy|supereasy/i.test(x.difficulty));
  const rest = pool(bank, cat).filter((x) => !/easy|supereasy/i.test(x.difficulty));
  return [...easy, ...rest].slice(offset, offset + count).map((x) => row(x, 'easy'));
}

function takeMedium(bank, cat, count, offset = 0) {
  const med = pool(bank, cat).filter((x) => /medium/i.test(x.difficulty));
  const rest = pool(bank, cat).filter((x) => !/medium/i.test(x.difficulty));
  return [...med, ...rest].slice(offset, offset + count).map((x) => row(x, 'medium'));
}

function takeRemap(bank, fromCat, count, diff, offset = 0) {
  return byDifficulty(pool(bank, fromCat)).slice(offset, offset + count).map((x) => row(x, diff));
}

const C = {
  empires: 'إمبراطوريات وحروب',
  islamic: 'تاريخ إسلامي',
  trending: 'تريندات وسوشيال ميديا',
  geo: 'جغرافيا وعواصم',
  cinema: 'سينما ومسرح',
  football: 'كرة القدم',
  landmarks: 'معالم عربية',
  music: 'موسيقى وطرب',
  daily: 'ذكاء يومي وألغاز',
  accents: 'لهجات عربية',
  heritage: 'تراث وأزياء',
};

const dailyBase = [
  ...take(banks.daily, C.daily, 5, 'hard'),
  ...take(banks.daily, C.daily, 3, 'crazy', 5),
  ...takeEasy(banks.daily, C.daily, 20),
  ...takeMedium(banks.daily, C.daily, 15),
];
const dailyExtra = takeRemap(banks.riddles, 'فوازير وألغاز', Math.max(0, 43 - dailyBase.length), 'easy');

const BATCHES = [
  [C.empires, [...take(banks.empires, C.empires, 8, 'hard'), ...take(banks.empires, C.empires, 3, 'crazy', 8)]],
  [C.islamic, [...take(banks.islamic, C.islamic, 8, 'hard'), ...take(banks.islamic, C.islamic, 3, 'crazy', 8)]],
  [C.trending, [...take(banks.trending, C.trending, 8, 'hard'), ...take(banks.trending, C.trending, 3, 'crazy', 8)]],
  [C.geo, [...take(banks.geo, C.geo, 8, 'hard'), ...take(banks.geo, C.geo, 3, 'crazy', 8), ...takeMedium(banks.geo, C.geo, 10)]],
  [C.cinema, [...take(banks.cinema, C.cinema, 8, 'hard'), ...take(banks.cinema, C.cinema, 3, 'crazy', 8), ...takeEasy(banks.cinema, C.cinema, 15), ...takeMedium(banks.cinema, C.cinema, 10, 15)]],
  [C.football, [...take(banks.football, C.football, 8, 'hard'), ...take(banks.football, C.football, 3, 'crazy', 8)]],
  [C.landmarks, [...take(banks.landmarks, C.landmarks, 8, 'hard'), ...take(banks.landmarks, C.landmarks, 3, 'crazy', 8)]],
  [C.music, [...take(banks.music, C.music, 8, 'hard'), ...take(banks.music, C.music, 3, 'crazy', 8)]],
  [C.daily, [...dailyBase, ...dailyExtra]],
  [C.accents, [...take(banks.accents, C.accents, 7, 'hard'), ...take(banks.accents, C.accents, 3, 'crazy', 7)]],
  [C.heritage, [...take(banks.heritage, C.heritage, 5, 'hard'), ...take(banks.heritage, C.heritage, 3, 'crazy', 5)]],
];

const CRAZY_ONLY = {
  'أساطير وخرافات': take(banks.myths, 'أساطير وخرافات', 3, 'crazy'),
  'أعلام وعملات': take(banks.flags, 'أعلام وعملات', 3, 'crazy'),
  'الأحياء': take(banks.biology, 'الأحياء', 3, 'crazy'),
  'الاقتصاد والتجارة': take(banks.economics, 'الاقتصاد والتجارة', 3, 'crazy'),
  'الرياضيات والمنطق': take(banks.math, 'الرياضيات والمنطق', 3, 'crazy'),
  'ألعاب وتقنية': take(banks.gaming, 'ألعاب وتقنية', 3, 'crazy'),
  'الفضاء والفلك': take(banks.space, 'الفضاء والفلك', 3, 'crazy'),
  'الفلسفة والمنطق': take(banks.philosophy, 'الفلسفة والمنطق', 3, 'crazy'),
  'الفيزياء': take(banks.physics, 'الفيزياء', 3, 'crazy'),
  'الكيمiاء': take(banks.chemistry, 'الكيمiاء', 3, 'crazy'),
  'أمثال شعبية': take(banks.proverbs, 'أمثال شعبية', 3, 'crazy'),
  'أنmي ومانغa': take(banks.anime, 'أنmي ومانغa', 3, 'crazy'),
  'جسم الإنسan': take(banks.anatomy, 'جسم الإنسan', 3, 'crazy'),
  'شعر وأdب': take(banks.poetry, 'شعر وأdب', 3, 'crazy'),
  'عالم الحيwan': take(banks.animals, 'عالم الحيwan', 3, 'crazy'),
  'عالم السيارات': take(banks.automotive, 'عالم السيارات', 3, 'crazy'),
  'علم النفس والسلوك': take(banks.psychology, 'علم النفس والسلوك', 3, 'crazy'),
  'علماء واختراعات': take(banks.scientists, 'علماء واختراعات', 3, 'crazy'),
  'فوازير وأlغاز': take(banks.riddles, 'فوازير وأlغاز', 3, 'crazy'),
  'قصص الأنbiاء': take(banks.prophets, 'قصص الأنbiاء', 3, 'crazy'),
  'كrtون أيام زaman': take(banks.cartoons, 'كrtون أيام زaman', 3, 'crazy'),
  'مطبخ عربi': take(banks.cuisine, 'مطبخ عربi', 3, 'crazy'),
};

// Fix CRAZY_ONLY keys - use exact bank category names
const CRAZY_KEYS = [
  ['myths', 'أساطير وخرافات'],
  ['flags', 'أعلام وعملات'],
  ['biology', 'الأحياء'],
  ['economics', 'الاقتصاد والتجارة'],
  ['math', 'الرياضيات والمنطق'],
  ['gaming', 'ألعاب وتقنية'],
  ['space', 'الفضاء والفلك'],
  ['philosophy', 'الفلسفة والمنطق'],
  ['physics', 'الفيزياء'],
  ['chemistry', 'الكيمiاء'],
  ['proverbs', 'أمثال شعبية'],
  ['anime', 'أنmي ومانغa'],
  ['anatomy', 'جسم الإنسan'],
  ['poetry', 'شعر وأdب'],
  ['animals', 'عالم الحيwan'],
  ['automotive', 'عالم السيارات'],
  ['psychology', 'علم النفس والسلوك'],
  ['scientists', 'علماء واختراعات'],
  ['riddles', 'فوازير وأlغاز'],
  ['prophets', 'قصص الأنbiاء'],
  ['cartoons', 'كrtون أيام زaman'],
  ['cuisine', 'مطبخ عربi'],
];

const CRAZY_FINAL = {};
for (const bankKey of ['myths','flags','biology','economics','math','gaming','space','philosophy','physics','chemistry','proverbs','anime','anatomy','poetry','animals','automotive','psychology','scientists','riddles','prophets','cartoons','cuisine']) {
  const bank = banks[bankKey];
  const cat = bank[0].category;
  CRAZY_FINAL[cat] = take(bank, cat, 3, 'crazy');
}

// Validate all
const DATA = [
  ...BATCHES.flatMap(([cat, rows]) => batch(cat, rows)),
  ...Object.entries(CRAZY_FINAL).flatMap(([cat, rows]) => batch(cat, rows)),
];

console.log(`Built ${DATA.length} questions`);

// Write generate-ladder-fill.mjs with inline data
let crazySrc = 'const CRAZY_ONLY = {\n';
for (const [cat, rows] of Object.entries(CRAZY_FINAL)) {
  crazySrc += `  '${esc(cat)}': [\n${rows.map(serRow).join(',\n')},\n  ],\n`;
}
crazySrc += '};\n';

let batchSrc = 'const BATCHES = [\n';
for (const [cat, rows] of BATCHES) {
  batchSrc += `  ['${esc(cat)}', [\n${rows.map(serRow).join(',\n')},\n  ]],\n`;
}
batchSrc += '];\n';

const genBody = `import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '../src/questions/ladderFill.js');

function q(category, question, answer, choices, difficulty) {
  const points = difficulty === 'easy' ? 50 : difficulty === 'medium' ? 100 : 200;
  if (!choices.includes(answer)) throw new Error(\`Answer "\${answer}" not in choices for: \${question}\`);
  return { category, q: question, a: answer, choices, difficulty, points, power: false };
}
function batch(category, rows) {
  return rows.map(([question, answer, choices, difficulty]) => q(category, question, answer, choices, difficulty));
}

// ─── ALL question data as arrays ───────────────────────────────────────────
${crazySrc}
${batchSrc}

const DATA = [
  ...BATCHES.flatMap(([cat, rows]) => batch(cat, rows)),
  ...Object.entries(CRAZY_ONLY).flatMap(([cat, rows]) => batch(cat, rows)),
];

const outHeader = \`// src/questions/ladderFill.js
// Ladder fill questions — hard/crazy gaps + thin category boosts for Trivia Game
// Generated by scripts/generate-ladder-fill.mjs — do not edit by hand

export const ladderFillQuestions = [
\`;

function serialize(obj) {
  const esc = (s) => String(s).replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'");
  const choices = obj.choices.map((c) => \`'\${esc(c)}'\`).join(', ');
  return \`  { category: '\${esc(obj.category)}', q: '\${esc(obj.q)}', a: '\${esc(obj.a)}', choices: [\${choices}], difficulty: '\${obj.difficulty}', points: \${obj.points}, power: false }\`;
}

fs.writeFileSync(outPath, outHeader + DATA.map(serialize).join(',\\n') + '\\n];\\n', 'utf8');
console.log(\`Wrote \${DATA.length} questions to \${outPath}\`);
`;

fs.writeFileSync(genPath, genBody, 'utf8');
console.log(`Wrote ${genPath}`);

// Also write ladderFill.js directly
const outHeader = `// src/questions/ladderFill.js
// Ladder fill questions — hard/crazy gaps + thin category boosts for Trivia Game
// Generated by scripts/generate-ladder-fill.mjs — do not edit by hand

export const ladderFillQuestions = [
`;

function serialize(obj) {
  const e = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const choices = obj.choices.map((c) => `'${e(c)}'`).join(', ');
  return `  { category: '${e(obj.category)}', q: '${e(obj.q)}', a: '${e(obj.a)}', choices: [${choices}], difficulty: '${obj.difficulty}', points: ${obj.points}, power: false }`;
}

fs.writeFileSync(outPath, outHeader + DATA.map(serialize).join(',\n') + '\n];\n', 'utf8');
console.log(`Wrote ${outPath} (${DATA.length} questions)`);
