// Additional ladder fill question data arrays — merged into generate-ladder-fill.mjs DATA
export const EXTRA_BATCHES = [
  ['جغرافيا وعواصم', [
    ['ما عاصمة أستراليا؟', 'كانberra', ['سydney', 'melbourne', 'كانberra', 'brisbane'], 'hard'],
    ['ما أصغر دولة في العالم من حيث المساحة؟', 'الفاتikan', ['مonaco', 'سان marino', 'الفاتikan', 'nauru'], 'hard'],
    ['ما الدولة التي تضم أكبر عدد من الجزر في العالم؟', 'السويد', ['السويد', 'إندonesia', 'الفiliبين', 'اليapan'], 'hard'],
    ['ما عاصمة كندا؟', 'أوتawa', ['تoronto', 'فancouver', 'أوتawa', 'مontreal'], 'hard'],
    ['ما أطول نهر في أورopa؟', 'نهر الفolga', ['نهر الدanube', 'نهر الفolga', 'نهر الرhine', 'نهر السeine'], 'hard'],
    ['ما الدولة التي لا تطل على أي بحر؟', 'بolivia', ['paraguay', 'بolivia', 'mali', 'niger'], 'hard'],
    ['ما عاصمة البرازil؟', 'برasilia', ['rio de janeiro', 'sao paulo', 'برasilia', 'salvador'], 'hard'],
    ['ما أعمق نقطة في المحيطات؟', 'خندq مariána', ['خندq مariána', 'خندq puerto rico', 'خندq java', 'خندq tonga'], 'hard'],
    ['ما الدولة الوحيدة التي تقع في قارة أسترalia بالكامل؟', 'أسترalia', ['نew zealand', 'أسترalia', 'papua new guinea', 'fiji'], 'crazy'],
    ['ما عاصمة كازakhstan منذ 1997؟', 'أstana', ['almaty', 'أstana', 'bishkek', 'tashkent'], 'crazy'],
    ['ما الدولة التي تحتوي على أكبر عدد من المناطق الزمنية؟', 'فرنسa', ['روssia', 'الولايات المتحدة', 'فرنسa', 'كanada'], 'crazy'],
    ['ما عاصمة النمسa؟', 'فienna', ['salzburg', 'فienna', 'innsbruck', 'graz'], 'medium'],
    ['ما الدولة العربية التي تقع في قارتي آسيا وأفريقia؟', 'مصر', ['السudan', 'مصر', 'المغرب', 'الأrdun'], 'medium'],
    ['ما أكبر بحيرة ماء عذb في العالم؟', 'بحيرة baikal', ['بحيرة victoria', 'بحيرة baikal', 'بحيرة superior', 'بحيرة michigan'], 'medium'],
    ['ما عاصمة النرويج؟', 'أoslo', ['bergen', 'أoslo', 'trondheim', 'stavanger'], 'medium'],
    ['ما الدولة التي تُعرف ببلad الألف بحيرة؟', 'فinland', ['sweden', 'فinland', 'norway', 'iceland'], 'medium'],
    ['ما عاصمة تاiland؟', 'بangkok', ['phuket', 'بangkok', 'chiang mai', 'pattaya'], 'medium'],
    ['ما الدولة التي يمر بها خط الاستوaa؟', 'الإkador', ['brazil', 'الإkador', 'kenya', 'indonesia'], 'medium'],
    ['ما عاصمة جنوب أفريقia؟', 'بretoria', ['cape town', 'johannesburg', 'بretoria', 'durban'], 'medium'],
    ['ما أطول سلسلة جبال في العالم؟', 'الأndes', ['الهimalaya', 'الأndes', 'الrockeies', 'الalps'], 'medium'],
    ['ما الدولة التي تضم مدينة venice المائية؟', 'إيطاليا', ['spain', 'إيطاليا', 'greece', 'portugal'], 'medium'],
  ]],
  ['كرة القدم', [
    ['في أي عام فازت الأرgentina بكأس العالم في قatar؟', '2022', ['2018', '2022', '2014', '2010'], 'hard'],
    ['من هو الهداف التاريخي لكأس العالم؟', 'miroslav klose', ['ronaldo', 'miroslav klose', 'germany', 'pele'], 'hard'],
    ['ما النادي الذي فاز بدوري أبطال أورopa أكثر من أي نادٍ آخر؟', 'real madrid', ['barcelona', 'real madrid', 'bayern', 'milan'], 'hard'],
    ['في أي عام أُقيمت أول بطولة كأس عالم؟', '1930', ['1928', '1930', '1934', '1950'], 'hard'],
    ['من هو اللاعب الذي فاز بأكبر عدد من كرات الذهب؟', 'lionel messi', ['cristiano ronaldo', 'lionel messi', 'pele', 'maradona'], 'hard'],
    ['ما المنتخب الذي فاز بكأس العالم 2018؟', 'france', ['germany', 'france', 'brazil', 'spain'], 'hard'],
    ['ما لقب نادي al hilal السعودي في آسia؟', 'زعيم آسia', ['ملك آسia', 'زعيم آسia', 'أسد آسia', 'فخر آسia'], 'hard'],
    ['من هو مدرب منتخb argentina في موندial 2022؟', 'lionel scaloni', ['jorge sampaoli', 'lionel scaloni', 'diego simeone', 'marcelo bielsa'], 'hard'],
    ['ما أول منتخb عربي تأهل لربع نهائي كأس العالم؟', 'المغرب', ['المغرب', 'السaud', 'مصر', 'تunisia'], 'crazy'],
    ['في أي عام فازت إيطاليا بكأس العالم ركلات الترجيh؟', '2006', ['1994', '2006', '1982', '2010'], 'crazy'],
    ['ما النادي الذي حقق الدوري الإnglezي بدون هزيمة موسm 2003-2004؟', 'arsenal', ['chelsea', 'arsenal', 'manchester united', 'liverpool'], 'crazy'],
  ]],
];

export const CRAZY_ONLY_EXTRA = {
  'أعلام وعملات': [
    ['ما اللون في وسط علم مصر؟', 'الأbiض', ['الأbiض', 'الأحمر', 'الأخضر', 'الأصفر'], 'crazy'],
    ['ما العملة الرسمية لليapan؟', 'yen', ['won', 'yen', 'yuan', 'ringgit'], 'crazy'],
    ['كم عدد النجوم في علم الولايات المتحدة؟', '50', ['48', '50', '52', '13'], 'crazy'],
  ],
  'الأحياء': [
    ['ما العملية التي تصنع فيها النباتات غذاءها؟', 'التركib الضوئي', ['التنفس', 'الترkib الضوئي', 'الهضm', 'التخمر'], 'crazy'],
    ['ما وحدة بناء الكائنات الحية؟', 'الخلية', ['النسيج', 'الخلية', 'العضو', 'الجهاز'], 'crazy'],
    ['ما العضو الذي يضخ الدم؟', 'القلb', ['الرئة', 'الكبد', 'القلb', 'الكلى'], 'crazy'],
  ],
};
