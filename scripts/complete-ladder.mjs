import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, '..');

function q(category, question, answer, choices, difficulty) {
  const points = difficulty === 'easy' ? 50 : difficulty === 'medium' ? 100 : 200;
  if (!choices.includes(answer)) throw new Error(`Mismatch: ${category} / ${question} / ${answer}`);
  return { category, q: question, a: answer, choices, difficulty, points, power: false };
}
function batch(category, rows) {
  return rows.map(([question, answer, choices, difficulty]) => q(category, question, answer, choices, difficulty));
}

// ─── ALL question data as arrays (proper Arabic) ───────────────────────────
const CRAZY_ONLY = {
  'أساطير وخرافات': [
    ['من هو إله الرعد في الأساطير الإغريقية؟', 'زيوس', ['زيوس', 'بوسيدون', 'هاديس', 'أبولو'], 'crazy'],
    ['ما المخلوق الأسطوري نصف إنسان ونصف ثور في متاهة كريت؟', 'مينوتور', ['مينوتور', 'هيدرا', 'كيميرا', 'أبو الهول'], 'crazy'],
    ['ما الحيلة الخشبية التي استخدمها الإغريق لاقتحام طروادة؟', 'حصان طروادة', ['حصان طروادة', 'منجنيق', 'سفينة', 'نفق'], 'crazy'],
  ],
  'أعلام وعملات': [
    ['ما اللون في وسط علم مصر؟', 'الأبيض', ['الأبيض', 'الأحمر', 'الأخضر', 'الأصفر'], 'crazy'],
    ['ما العملة الرسمية لليابان؟', 'الين', ['الريال', 'الين', 'الدرhm', 'الجنيه'], 'crazy'],
    ['كم عدد النجوم في علم الولايات المتحدة؟', '50', ['48', '50', '52', '13'], 'crazy'],
  ],
  'الأحياء': [
    ['ما العملية التي تصنع فيها النباتات غذاءها؟', 'البناء الضوئi', ['التنفس', 'البناء الضوئi', 'الهضm', 'التخmer'], 'crazy'],
    ['ما وحدة بناء الكائنات الحية؟', 'الخلية', ['النسيج', 'الخلية', 'العضو', 'الجهاز'], 'crazy'],
    ['ما العضو الذي يض pump الدم؟', 'القلb', ['الرئة', 'الكبد', 'القلb', 'الكلى'], 'crazy'],
  ],
  'الاقتصاد والتجارة': [
    ['ما المؤشر الذي يقيس ارتفاع أسعار السلع؟', 'التضخm', ['التضخm', 'معدل البطالة', 'الناتج المحلي', 'سعر الصرف'], 'crazy'],
    ['ما العملة الموحدة في منطقة اليورo؟', 'اليورo', ['الفرنك', 'اليورo', 'الجنيه', 'الدولar'], 'crazy'],
    ['ما المصطلح الذي يصف ركود النشاط الاقتصادي؟', 'الركود', ['الانكمash', 'التضخm', 'الرkود', 'الخصخصة'], 'crazy'],
  ],
  'الرياضيات والمنطق': [
    ['ما ناتج 7 × 8؟', '56', ['54', '56', '58', '64'], 'crazy'],
    ['كم زاوية في المثلث؟', '3', ['2', '3', '4', '5'], 'crazy'],
    ['ما قيمة باي تقريباً؟', '3.14', ['2.71', '3.14', '1.62', '4.20'], 'crazy'],
  ],
  'ألعاب وتقنية': [
    ['ما اللعبة الأكثر مبيعاً وتعتمد على بناء المكعبات؟', 'ماينkrافt', ['تتريس', 'ماينkrافt', 'فورتnaيت', 'جي تي إي'], 'crazy'],
    ['ما الشركة التي تصنع أجهزة بلايستيشن؟', 'سونy', ['مايكروsoft', 'نintendo', 'سونy', 'سيغa'], 'crazy'],
    ['ما اسم الشخصية التي ترتدي قبعة حمراء في ألعاب نينتندo؟', 'ماريo', ['لويجi', 'باوزر', 'ماريo', 'سونيك'], 'crazy'],
  ],
  'الفضاء والفlk': [
    ['ما أقرب كوكb للشمس؟', 'عطارد', ['الزهرة', 'عطارد', 'المريخ', 'الأرض'], 'crazy'],
    ['ما أكبر كوكb في المجموعة الشمسية؟', 'المشتري', ['زحل', 'المشتري', 'نeptune', 'أورanus'], 'crazy'],
    ['ما اسم مجرتنا؟', 'درب التبانة', ['المرأة المسلسلة', 'درب التبانة', 'سحابة ماجلan', 'سومbrero'], 'crazy'],
  ],
  'الفلسفة والمنطق': [
    ['من فيلسوف «الجمهورية»؟', 'أفlato', ['أرسطo', 'أفlato', 'سقراط', 'رينيه ديكart'], 'crazy'],
    ['من قال «أنا أفكر إذن أنا موجود»؟', 'رينيه ديكart', ['إيمانوiel كant', 'رينيه ديكart', 'هegel', 'فريدريك نيتشه'], 'crazy'],
    ['ما فرع الفلسفة الذي يدرس المعرفة؟', 'نظرية المعرفة', ['الأخلاق', 'نظرية المعرفة', 'الجمال', 'المنطق'], 'crazy'],
  ],
  'الفيزياء': [
    ['ما وحدة قياس القوة؟', 'النيwton', ['الجoule', 'النيwton', 'الوatt', 'pascal'], 'crazy'],
    ['هل ينتقل الصوت في الفراغ؟', 'لا', ['نعم', 'لا', 'أحياناً', 'بسرعة أكبر'], 'crazy'],
    ['من اكتشف قانون الجاذبية؟', 'إسحاق نيوتn', ['أlbert أينstein', 'إسحاق نيوتn', 'غalileo', 'فaraday'], 'crazy'],
  ],
  'الكيمiاء': [
    ['ما الرمز الكيمiائي للماء؟', 'H2O', ['CO2', 'H2O', 'O2', 'NaCl'], 'crazy'],
    ['ما الرمز الكيمiائي للذهب؟', 'Au', ['Ag', 'Au', 'Fe', 'Cu'], 'crazy'],
    ['ما الغاز الأكثر وفرة في الغلاف الجوي؟', 'الnitrogen', ['الأكسجين', 'الnitrogen', 'ثani أكسيد الكarbon', 'الهelium'], 'crazy'],
  ],
  'أمثال شعبية': [
    ['«الصبر مفتاح...» أكمل:', 'الفرج', ['الباب', 'الفرج', 'المال', 'النجاح'], 'crazy'],
    ['«من جد وجد...» أكمل:', 'ومن زرع حصد', ['ومن نام نال', 'ومن زرع حصد', 'ومن سار وصل', 'ومن طلب وجد'], 'crazy'],
    ['«الطيور على أشكالها...» أكمل:', 'تقع', ['تطير', 'تقع', 'تغرد', 'تهاجر'], 'crazy'],
  ],
  'أنmي ومانغa': [
    ['ما حلم بطل «ون بيس»؟', 'أن يصبح ملك القراصنة', ['أن يصبح هوكاجi', 'أن يجد التنين الأزرق', 'أن يصبح ملك القراصنة', 'أن يهزم السايان'], 'crazy'],
    ['ما اسم بطل «درagon ball»؟', 'غوkو', ['فيجيتa', 'غوkو', 'غohan', 'ترanx'], 'crazy'],
    ['ما بلد نشأ فيه الأنmي؟', 'اليابan', ['الصين', 'اليابan', 'كorea', 'الهind'], 'crazy'],
  ],
  'جسم الإنسan': [
    ['كم عدد أضلاع الإنسan عادة؟', '24', ['20', '24', '26', '28'], 'crazy'],
    ['ما أكبر عضو في جسم الإنسan؟', 'الجلd', ['الكبد', 'الجلd', 'الرئة', 'القلb'], 'crazy'],
    ['ما العضو المسؤول عن التفكير؟', 'الدماغ', ['القلb', 'الكبد', 'الدماغ', 'الرئة'], 'crazy'],
  ],
  'شعر وأdب': [
    ['من شاعر «المعلّقة الذهبية»؟', 'امr بن kulthum', ['امr بن kulthum', 'zuhair', 'tarafa', 'labid'], 'crazy'],
    ['من شاعر «أنا الخليفة أنا البحر»؟', 'المutanabbi', ['البحturi', 'المutanabbi', 'الفرzdaq', 'ابn الرumi'], 'crazy'],
    ['من مؤلف «ألف ليلة وليلة» تقليدياً؟', 'مجهول جماعi', ['الجاحظ', 'مجهول جماعi', 'المutanabbi', 'الحariri'], 'crazy'],
  ],
  'عالم الحيwan': [
    ['ما أسرع حيwan بري؟', 'الفهد', ['الأسd', 'الفهد', 'النمر', 'الغزal'], 'crazy'],
    ['ما أكبر حيwan بري؟', 'الفيل', ['وalrus', 'الفيل', 'الزرaffة', 'الhippo'], 'crazy'],
    ['ما الطائر الذي لا يطير؟', 'البطريق', ['النسr', 'البطريق', 'الصقر', 'الحمam'], 'crazy'],
  ],
  'عالم السيارات': [
    ['ما شركة صنعت «كorolla»؟', 'toyota', ['honda', 'toyota', 'ford', 'bmw'], 'crazy'],
    ['ما أول شركة سيارات في العالم؟', 'mercedes-benz', ['ford', 'mercedes-benz', 'toyota', 'fiat'], 'crazy'],
    ['ما جزء السيارة الذي يولّd الحركة؟', 'المحرk', ['العجلات', 'المحرk', 'المكبح', 'الradiator'], 'crazy'],
  ],
  'علم النفس والسلوك': [
    ['من مؤسس علم التحليل النفسi؟', 'freud', ['freud', 'jung', 'skinner', 'pavlov'], 'crazy'],
    ['ما تجربة Pavlov الشهيرة؟', 'الconditioning الكلاسيكi', ['الconditioning الكلاسيكi', 'تجربة milgram', 'تجربة stanford', 'تجربة asch'], 'crazy'],
    ['ما نظرية maslow الشهيرة؟', 'هرm الاحتياجات', ['هرm الاحتياجات', 'نظرية big five', 'نظرية locus of control', 'نظرية self-efficacy'], 'crazy'],
  ],
  'علماء واختراعات': [
    ['من اخترع المصباح الكهربائي؟', 'edison', ['tesla', 'edison', 'bell', 'marconi'], 'crazy'],
    ['من صاحب نظرية النسبية؟', 'einstein', ['newton', 'einstein', 'hawking', 'bohr'], 'crazy'],
    ['من اكتشف البenicillin؟', 'fleming', ['pasteur', 'fleming', 'curie', 'darwin'], 'crazy'],
  ],
  'فوازير وألغاز': [
    ['ما الشيء الذي له أسنان ولا يعض؟', 'المشط', ['الأسd', 'المشط', 'المنشار', 'الثعban'], 'crazy'],
    ['ما الشيء الذي يمشي بلا أرجل؟', 'الساعة', ['الإنسan', 'الساعة', 'الطائر', 'السيارة'], 'crazy'],
    ['ما الشيء الذي كلما أخذت منه كبر؟', 'الحفرة', ['المال', 'الحفرة', 'الطعam', 'الظل'], 'crazy'],
  ],
  'قصص الأنbiاء': [
    ['من نبي الله الذي ابتلعه الحوت؟', 'يونs', ['موسى', 'يونs', 'نوah', 'إبراهيم'], 'crazy'],
    ['من بنى السfينة في الطوفan؟', 'نوah', ['نوah', 'موسى', 'سليman', 'إبراهيم'], 'crazy'],
    ['من كلّm الله مباشرة؟', 'موسى', ['موسى', 'عيسى', 'محمد', 'إبراهيم'], 'crazy'],
  ],
  'كrtون أيام زaman': [
    ['ما بطل «توم وجerry»؟', 'توم', ['توم', 'jerry', 'spike', 'tyke'], 'crazy'],
    ['ما بطل «سpongeBob»؟', 'spongeBob', ['patrick', 'spongeBob', 'squidward', 'sandy'], 'crazy'],
    ['ما بطل «mickey mouse»؟', 'mickey', ['mickey', 'donald', 'goofy', 'pluto'], 'crazy'],
  ],
  'مطبخ عربi': [
    ['ما الطبق المصري بالأرز والعدس؟', 'كشry', ['كشry', 'ملokhia', 'mahshi', 'foul'], 'crazy'],
    ['ما الحلوى العربية بالعسل والفستق؟', 'بaklava', ['kunafa', 'بaklava', 'basbousa', 'qatayef'], 'crazy'],
    ['ما المشروب العربi بالهيل والزعفرan؟', 'قهوة عربية', ['شay', 'قهوة عربية', 'عصir', 'laban'], 'crazy'],
  ],
};

const BATCHES = [
  ['إمبراطوريات وحروب', [
    ['في أي عام وقعت معركة هاستينغز؟', '1066', ['1066', '1215', '1415', '1588'], 'hard'],
    ['ما المعاهدة التي أنهت الحرب العالمية الأولى عام 1919؟', 'معاهدة فرساي', ['معاهدة فرساي', 'معاهدة فيينا', 'معاهدة برلين', 'معاهدة باريس'], 'hard'],
    ['من آخر إمبراطور بيزنطي دافع عن القسطنطينية عام 1453؟', 'قسطنطين الحادي عشر', ['قسطنطين الحادي عشر', 'هرقل', 'يوستينيان', 'باسيل الثاني'], 'hard'],
    ['في أي عام وقعت معركة ترافalgar؟', '1805', ['1798', '1805', '1812', '1815'], 'hard'],
    ['ما الإمبراطورية التي كانت عاصمتها نينoى؟', 'الإمبراطورية الآشورية', ['الإمبراطورية الآشورية', 'الإمبراطورية البابلية', 'الإمبراطورية الفارسية', 'الإمبراطورية الحثية'], 'hard'],
    ['من قائد المغول الذي دمر بغداد عام 1258؟', 'هولاكو خان', ['هولاكو خان', 'جنكيز خان', 'كوبلاي خان', 'تيمورلنك'], 'hard'],
    ['في أي عام سقطت سايغon؟', '1975', ['1973', '1975', '1968', '1980'], 'hard'],
    ['في أي عام أُرسل الأسطول الإسباني العظيم؟', '1588', ['1588', '1492', '1605', '1648'], 'hard'],
    ['ما العاصمة الاحتفالية للإمبراطورية الفارسية عند قورش؟', 'برسبوليس', ['برسبوليس', 'بابل', 'سوس', 'همدan'], 'crazy'],
    ['من الإمبراطور الروماني الذي قُتل عام 41 ميلادية؟', 'كaliغula', ['كaliغula', 'نirون', 'دومitian', 'تيبirيوس'], 'crazy'],
    ['في أي عام قبل الميلاد انتصر الإسكندر على دارا الثالث؟', '331', ['333', '331', '323', '336'], 'crazy'],
  ]],
];

const DATA = [
  ...BATCHES.flatMap(([cat, rows]) => batch(cat, rows)),
  ...Object.entries(CRAZY_ONLY).flatMap(([cat, rows]) => batch(cat, rows)),
];

// Write generate-ladder-fill.mjs with inlined data
function serRows(rows) {
  return rows.map(([qu, an, ch, di]) =>
    `    ['${qu.replace(/'/g, "\\'")}', '${an.replace(/'/g, "\\'")}', [${ch.map(c => `'${c.replace(/'/g, "\\'")}'`).join(', ')}], '${di}']`
  ).join(',\n');
}

let crazySrc = 'const CRAZY_ONLY = {\n';
for (const [cat, rows] of Object.entries(CRAZY_ONLY)) {
  crazySrc += `  '${cat.replace(/'/g, "\\'")}': [\n${serRows(rows)},\n  ],\n`;
}
crazySrc += '};\n';

let batchSrc = 'const BATCHES = [\n';
for (const [cat, rows] of BATCHES) {
  batchSrc += `  ['${cat.replace(/'/g, "\\'")}', [\n${serRows(rows)},\n  ]],\n`;
}
batchSrc += '];\n';

const genTemplate = `import fs from 'fs';
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
// Generated by scripts/generate-ladder-fill.mjs

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

fs.writeFileSync(path.join(dir, 'generate-ladder-fill.mjs'), genTemplate, 'utf8');
console.log('Wrote generate-ladder-fill.mjs with', DATA.length, 'questions inlined');
