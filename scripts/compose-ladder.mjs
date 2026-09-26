import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));

function q(category, question, answer, choices, difficulty) {
  const points = difficulty === 'easy' ? 50 : difficulty === 'medium' ? 100 : 200;
  if (!choices.includes(answer)) throw new Error(`Mismatch: ${question} / ${answer}`);
  return { category, q: question, a: answer, choices, difficulty, points, power: false };
}
function batch(category, rows) {
  return rows.map(([question, answer, choices, difficulty]) => q(category, question, answer, choices, difficulty));
}

const CRAZY_ONLY = {
  'أساطير وخرافات': [
    ['من هو إله الرعد في الأساطير الإغريقية؟', 'زيوس', ['زيوس', 'بوسيدون', 'هاديس', 'أبولو'], 'crazy'],
    ['ما المخلوق الأسطوري نصف إنسان ونصف ثور في متاهة كريت؟', 'مينوتور', ['مينوتور', 'هيدرا', 'كيميرا', 'سphinx'], 'crazy'],
    ['ما الحيلة الخشبية التي استخدمها الإغريق لاقتحام طروادة؟', 'حصان طروادة', ['حصان طروادة', 'منجنيق', 'سفينة', 'نفق'], 'crazy'],
  ],
  'أعلام وعملات': [
    ['ما اللون في وسط علم مصر؟', 'الأبيض', ['الأبيض', 'الأحمر', 'الأخضر', 'الأصفر'], 'crazy'],
    ['ما العملة الرسمية لليابان؟', 'الين', ['الوon', 'الين', 'اليuan', 'الringgit'], 'crazy'],
    ['كم عدد النجوم في علم الولايات المتحدة؟', '50', ['48', '50', '52', '13'], 'crazy'],
  ],
};

const BATCHES = [
  ['إمبراطوريات وحروب', [
    ['في أي عام وقعت معركة هاستينغز؟', '1066', ['1066', '1215', '1415', '1588'], 'hard'],
    ['ما المعاهدة التي أنهت الحرب العالمية الأولى عام 1919؟', 'معاهدة فرساي', ['معاهدة فرساي', 'معاهدة فيينا', 'معاهدة برلين', 'معاهدة باريس'], 'hard'],
    ['من آخر إمبراطور بيزنطي دافع عن القسطنطينية عام 1453؟', 'قسطنطين الحادي عشر', ['قسطنطين الحادي عشر', 'هرقل', 'يوستينيان', 'باسيل الثاني'], 'hard'],
    ['في أي عام وقعت معركة ترافalgar؟', '1805', ['1798', '1805', '1812', '1815'], 'hard'],
    ['ما الإمبراطورية التي كانت عاصمتها نينوى؟', 'الإمبراطورية الآشورية', ['الإمبراطورية الآشورية', 'الإمبراطورية البابلية', 'الإمبراطورية الفارسية', 'الإمبراطورية الحثية'], 'hard'],
    ['من قائد المغول الذي دمر بغداد عام 1258؟', 'هولاكو خان', ['هولاكو خان', 'جنكيز خان', 'كوبلاي خان', 'تيمورلنك'], 'hard'],
    ['في أي عام سقطت سايغون؟', '1975', ['1973', '1975', '1968', '1980'], 'hard'],
    ['في أي عام أُرسل الأسطول الإسباني العظيم؟', '1588', ['1588', '1492', '1605', '1648'], 'hard'],
    ['ما العاصمة الاحتفالية للإمبراطورية الفارسية عند قورش؟', 'برسبوليس', ['برسبوليس', 'بابل', 'سوس', 'همدان'], 'crazy'],
    ['من الإمبراطور الروماني الذي قُتل عام 41 ميلادية؟', 'كاليغولا', ['كاليغولا', 'نيرون', 'دوميتian', 'تيبيريوس'], 'crazy'],
    ['في أي عام قبل الميلاد انتصر الإسكندر على دارا الثالث؟', '331', ['333', '331', '323', '336'], 'crazy'],
  ]],
];

const DATA = [
  ...BATCHES.flatMap(([cat, rows]) => batch(cat, rows)),
  ...Object.entries(CRAZY_ONLY).flatMap(([cat, rows]) => batch(cat, rows)),
];

// Validate counts
const counts = {};
for (const item of DATA) {
  counts[item.category] ??= { easy: 0, medium: 0, hard: 0, crazy: 0 };
  counts[item.category][item.difficulty]++;
}
console.log('Questions:', DATA.length);
console.log(counts);
