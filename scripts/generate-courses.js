/*
 * Generates static landing pages under /courses/:
 *  - 1 hub page listing all 17 regions
 *  - 153 region pages (region x grade x subject)
 *  - ~2,061 district pages (region x district x grade x subject), one per
 *    real 시/군/구, so region-level searches ("서울 고등수학과외") and
 *    district-level searches ("강남구 고등수학과외") both have a matching
 *    page. Also (re)writes sitemap-courses.xml with every URL from this run.
 * Re-run this script (`node scripts/generate-courses.js`) whenever region/
 * grade/subject/district copy needs to change — do not hand-edit the
 * generated files directly.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const COURSES_DIR = path.join(ROOT, 'courses');
const SITE = 'https://shcool123.co.kr';

const REGIONS = [
  { name: '서울', metro: true }, { name: '경기', metro: true }, { name: '인천', metro: true },
  { name: '부산', metro: true }, { name: '대구', metro: true }, { name: '광주', metro: true },
  { name: '대전', metro: true }, { name: '울산', metro: true }, { name: '세종', metro: true },
  { name: '강원', metro: false }, { name: '충북', metro: false }, { name: '충남', metro: false },
  { name: '전북', metro: false }, { name: '전남', metro: false }, { name: '경북', metro: false },
  { name: '경남', metro: false }, { name: '제주', metro: false },
];

const GRADES = [
  { key: 'elem', label: '초등' },
  { key: 'mid', label: '중등' },
  { key: 'high', label: '고등' },
];

const SUBJECTS = [
  { key: 'math', label: '수학' },
  { key: 'eng', label: '영어' },
  { key: 'kor', label: '국어' },
];

// Genuine, differentiated copy per grade x subject (9 combos) — no region-specific
// claims are fabricated here; region differentiation is handled separately via
// the metro/rural service-format note, which reflects a real logistics distinction.
const CONTENT = {
  elem: {
    math: { title: '초등수학, 연산 자동화와 개념의 첫 인상', body: '초등 수학은 연산 자동화와 개념의 첫 인상이 결정되는 시기입니다. 사칙연산의 정확도를 다지고, 분수·소수 같은 추상 개념을 구체물로 풀어 설명해 수학에 대한 거부감을 만들지 않는 것이 목표입니다.', tags: ['연산 자동화', '개념 이해', '서술형 대비'] },
    eng: { title: '초등영어, 파닉스와 듣기 습관 만들기', body: '초등 영어는 파닉스와 기본 어휘를 쌓아 이후 문법 학습의 기초 체력을 만드는 시기입니다. 듣기·말하기 노출을 충분히 확보하면서 읽기 독립을 목표로 지도합니다.', tags: ['파닉스', '기초 어휘', '듣기 습관'] },
    kor: { title: '초등국어, 어휘력과 독해 근육 키우기', body: '초등 국어는 어휘력과 독해력이 다른 모든 과목의 기초가 되는 시기입니다. 맞춤법과 문장 구성을 다지고, 다양한 지문을 읽으며 독해 근육을 키웁니다.', tags: ['어휘력', '독해력', '맞춤법'] },
  },
  mid: {
    math: { title: '중등수학, 함수·도형과 내신의 시작', body: '중등 수학은 함수·도형 등 추상적 개념이 본격적으로 늘어나며 내신 성적 체계가 시작되는 시기입니다. 개념과 유형을 연결해 내신 문제에 바로 적용할 수 있도록 지도합니다.', tags: ['함수·도형', '내신 대비', '유형 학습'] },
    eng: { title: '중등영어, 문법 체계화와 독해 훈련', body: '중등 영어는 문법 체계를 세우고 독해 지문의 난이도가 올라가는 시기입니다. 문법 규칙을 실제 문장에 적용하는 훈련과 함께 내신 서술형까지 대비합니다.', tags: ['문법 체계화', '독해 훈련', '내신 서술형'] },
    kor: { title: '중등국어, 문학·비문학 독해와 어휘 확장', body: '중등 국어는 문학·비문학 독해와 어휘 확장이 함께 이뤄지는 시기입니다. 지문을 구조적으로 읽는 훈련을 통해 내신과 수행평가에 모두 대응합니다.', tags: ['문학 독해', '비문학 독해', '어휘 확장'] },
  },
  high: {
    math: { title: '고등수학, 내신과 수능을 함께', body: '고등 수학은 내신 등급과 수능 실력을 동시에 챙겨야 하는 시기입니다. 개념 정리부터 기출 유형 풀이까지, 등급대별 맞춤 전략으로 지도합니다.', tags: ['내신+수능', '기출 유형', '등급별 전략'] },
    eng: { title: '고등영어, 수능형 독해와 어휘량 확장', body: '고등 영어는 수능형 독해와 어휘량이 급격히 늘어나는 시기입니다. 긴 지문을 빠르고 정확하게 읽는 훈련과 함께 듣기·어법까지 통합적으로 대비합니다.', tags: ['수능 독해', '어휘 확장', '듣기·어법'] },
    kor: { title: '고등국어, 지문 분석력과 선택과목 전략', body: '고등 국어는 문학·독서(비문학) 지문 분석력과 화법과작문 등 선택과목 전략이 함께 필요한 시기입니다. 지문 유형별 접근법을 훈련해 실전 감각을 끌어올립니다.', tags: ['지문 분석', '선택과목 전략', '실전 감각'] },
  },
};

// Real KR administrative district data, kept in sync with REGION_DISTRICTS /
// REGION_NOTE in index.html (the interactive SERVICE AREA section there).
// Used to give each of the 17 region pages genuinely distinct body content
// instead of only swapping the region name into shared boilerplate, and as
// the source list for the district-level pages generated below.
const REGION_DISTRICTS = {
  '서울': ['종로구','중구','용산구','성동구','광진구','동대문구','중랑구','성북구','강북구','도봉구','노원구','은평구','서대문구','마포구','양천구','강서구','구로구','금천구','영등포구','동작구','관악구','서초구','강남구','송파구','강동구'],
  '경기': ['수원시','성남시','의정부시','안양시','부천시','광명시','동두천시','평택시','안산시','고양시','과천시','구리시','남양주시','오산시','시흥시','군포시','의왕시','하남시','용인시','파주시','이천시','안성시','김포시','화성시','광주시','양주시','포천시','여주시','연천군','가평군','양평군'],
  '인천': ['제물포구','영종구','미추홀구','연수구','남동구','부평구','계양구','서해구','검단구','강화군','옹진군'],
  '부산': ['중구','서구','동구','영도구','부산진구','동래구','남구','북구','강서구','해운대구','사하구','금정구','연제구','수영구','사상구','기장군'],
  '대구': ['중구','동구','서구','남구','북구','수성구','달서구','달성군','군위군'],
  '광주': ['동구','서구','남구','북구','광산구'],
  '대전': ['중구','동구','서구','유성구','대덕구'],
  '울산': ['중구','남구','동구','북구','울주군'],
  '세종': [],
  '강원': ['춘천시','원주시','강릉시','동해시','태백시','속초시','삼척시','홍천군','횡성군','영월군','평창군','정선군','철원군','화천군','양구군','인제군','고성군','양양군'],
  '충북': ['청주시','충주시','제천시','보은군','옥천군','영동군','증평군','진천군','괴산군','음성군','단양군'],
  '충남': ['천안시','공주시','보령시','아산시','서산시','논산시','계룡시','당진시','금산군','부여군','서천군','청양군','홍성군','예산군','태안군'],
  '전북': ['전주시','군산시','익산시','정읍시','남원시','김제시','진안군','완주군','무주군','장수군','임실군','순창군','고창군','부안군'],
  '전남': ['목포시','여수시','순천시','나주시','광양시','담양군','곡성군','구례군','고흥군','보성군','화순군','장흥군','강진군','해남군','영암군','무안군','함평군','영광군','장성군','완도군','진도군','신안군'],
  '경북': ['포항시','경주시','김천시','안동시','구미시','영주시','영천시','상주시','문경시','경산시','의성군','청송군','영양군','영덕군','청도군','고령군','성주군','칠곡군','예천군','봉화군','울진군','울릉군'],
  '경남': ['창원시','진주시','통영시','사천시','김해시','밀양시','거제시','양산시','의령군','함안군','창녕군','고성군','남해군','하동군','산청군','함양군','거창군','합천군'],
  '제주': ['제주시','서귀포시'],
};
const REGION_DISTRICT_NOTE = {
  '세종': '세종특별자치시는 하위 시/군/구 없이 단일 행정구역으로 운영되며, 시 전역에서 동일한 커리큘럼으로 진행됩니다.',
  '제주': '제주는 2006년 기초자치단체가 폐지되어 제주시·서귀포시 2개 행정시로만 구성되며, 두 지역 모두 동일한 커리큘럼으로 진행됩니다.',
};

function districtSection(region) {
  const districts = REGION_DISTRICTS[region.name] || [];
  if (districts.length === 0) {
    return REGION_DISTRICT_NOTE[region.name] || '';
  }
  return `${region.name} ${districts.length}개 시/군/구(${districts.join('·')}) 전 지역에서 동일한 커리큘럼과 선생님 매칭 기준으로 수업이 진행됩니다.`;
}

// Picks the 은/는 topic particle based on whether a name's last syllable has
// a batchim (final consonant) - e.g. 경기/대구/광주/제주 and most 시/구
// district names (수원시, 강남구 ...) need "는", not "은".
function topicParticle(name) {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return '은';
  return code % 28 === 0 ? '는' : '은';
}

function regionNote(region) {
  return region.metro
    ? `${region.name}${topicParticle(region.name)} 인구가 밀집된 지역이라 방문·카페·화상 등 원하시는 수업 방식을 비교적 자유롭게 선택하실 수 있습니다. 방문 가능 여부와 일정은 상담 시 확인해 드립니다.`
    : `${region.name}${topicParticle(region.name)} 지역 특성상 화상 과외를 중심으로 진행되며, 방문 과외는 지역 상황에 따라 제한적으로 조율해 드립니다. 화상 수업도 대면과 동일한 커리큘럼과 선생님 매칭 기준을 적용합니다.`;
}

function slug(region, grade, subject) {
  return `${region.name}-${grade.label}${subject.label}과외`;
}

function districtSlug(region, district, grade, subject) {
  return `${region.name}-${district}-${grade.label}${subject.label}과외`;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function relatedLinks(region, grade, subject) {
  const sameSubjectOtherGrades = GRADES.filter(g => g.key !== grade.key)
    .map(g => `<a href="/courses/${encodeURIComponent(slug(region, g, subject))}.html">${region.name} ${g.label}${subject.label}과외</a>`).join('\n            ');
  const sameGradeOtherSubjects = SUBJECTS.filter(s => s.key !== subject.key)
    .map(s => `<a href="/courses/${encodeURIComponent(slug(region, grade, s))}.html">${region.name} ${grade.label}${s.label}과외</a>`).join('\n            ');
  return { sameSubjectOtherGrades, sameGradeOtherSubjects };
}

function districtLinksSection(region, grade, subject) {
  const districts = REGION_DISTRICTS[region.name] || [];
  if (districts.length === 0) return '';
  const links = districts
    .map(d => `<a href="/courses/${encodeURIComponent(districtSlug(region, d, grade, subject))}.html">${region.name} ${d} ${grade.label}${subject.label}과외</a>`)
    .join('\n          ');
  return `
  <div class="course-section">
    <h2>${esc(region.name)} 시/군/구별 ${esc(grade.label)}${esc(subject.label)}과외</h2>
    <div class="related-grid" style="grid-template-columns:repeat(3,1fr);">
          ${links}
    </div>
  </div>
`;
}

function pageTemplate(region, grade, subject) {
  const c = CONTENT[grade.key][subject.key];
  const title = `${region.name} ${grade.label}${subject.label}과외 | 성적오름 1:1 맞춤 과외`;
  const desc = `${region.name} 지역 ${grade.label} 학생을 위한 ${subject.label}과외 안내. 초1부터 고3까지 12년 로드맵을 가진 성적오름이 ${region.name}에서도 동일한 커리큘럼으로 ${grade.label}${subject.label}과외를 제공합니다.`;
  const canonical = `${SITE}/courses/${encodeURIComponent(slug(region, grade, subject))}.html`;
  const { sameSubjectOtherGrades, sameGradeOtherSubjects } = relatedLinks(region, grade, subject);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#101a33">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<meta name="keywords" content="${esc(`${region.name}${grade.label}${subject.label}과외, ${region.name}${grade.label}과외, ${region.name} ${subject.label}과외, ${grade.label}${subject.label}과외, ${region.name} 과외`)}">
<link rel="canonical" href="${canonical}">
<link rel="stylesheet" href="/assets/course.css">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600;700&family=Pretendard:wght@400;500;600;700&display=swap" rel="stylesheet">
<meta property="og:type" content="website">
<meta property="og:site_name" content="성적오름">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE}/og-image.jpg">
<meta property="og:url" content="${canonical}">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "홈", "item": "${SITE}/"},
    {"@type": "ListItem", "position": 2, "name": "지역별 과외", "item": "${SITE}/courses/"},
    {"@type": "ListItem", "position": 3, "name": "${esc(region.name)}", "item": "${SITE}/courses/#${encodeURIComponent(region.name)}"},
    {"@type": "ListItem", "position": 4, "name": "${esc(region.name)} ${esc(grade.label)}${esc(subject.label)}과외", "item": "${canonical}"}
  ]
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "${esc(`${region.name} ${grade.label}${subject.label}과외`)}",
  "serviceType": "${esc(`${grade.label} ${subject.label} 과외`)}",
  "provider": {"@type": "EducationalOrganization", "name": "성적오름", "url": "${SITE}/"},
  "areaServed": {"@type": "AdministrativeArea", "name": "${esc(region.name)}"},
  "url": "${canonical}"
}
</script>
</head>
<body>
<header>
  <div class="nav">
    <a class="logo" href="/"><span class="logo-mark">성</span>성적오름</a>
    <a class="nav-cta" href="tel:010-3951-0535">상담 신청 010-3951-0535</a>
  </div>
</header>

<div class="mobile-cta-bar">
  <a class="mobile-cta-call" href="tel:010-3951-0535">☎ 전화</a>
  <a class="mobile-cta-kakao" href="https://open.kakao.com/o/sOXeVnpi" target="_blank" rel="noopener">💬 카톡</a>
  <a class="mobile-cta-apply" href="/#apply">진단 신청</a>
</div>

<div class="wrap">
  <div class="breadcrumb">
    <a href="/">홈</a><span class="sep">/</span>
    <a href="/courses/">지역별 과외</a><span class="sep">/</span>
    <span>${esc(region.name)} ${esc(grade.label)}${esc(subject.label)}과외</span>
  </div>

  <div class="course-hero">
    <div class="eyebrow">${esc(region.name)} · ${esc(grade.label)} · ${esc(subject.label)}</div>
    <h1>${esc(region.name)} ${esc(grade.label)}${esc(subject.label)}과외</h1>
    <p>초1부터 고3까지 12년 로드맵을 설계하는 1:1 전문 과외 성적오름이 ${esc(region.name)} 지역 ${esc(grade.label)} 학생을 위한 ${esc(subject.label)}과외를 안내합니다.</p>
  </div>

  <div class="course-section">
    <h2>${esc(c.title)}</h2>
    <p>${esc(c.body)}</p>
    <ul class="tag-list">${c.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
  </div>

  <div class="course-section">
    <h2>${esc(region.name)} 지역 수업 방식</h2>
    <p>${esc(regionNote(region))}</p>
    <p>${esc(districtSection(region))}</p>
  </div>

  <div class="cta-box">
    <p>${esc(region.name)} ${esc(grade.label)}${esc(subject.label)}과외, 무료 학습 진단 상담으로 먼저 확인해보세요.</p>
    <div class="btns">
      <a class="btn-gold" href="/#apply">진단 신청</a>
      <a class="btn-outline" href="tel:010-3951-0535">전화 상담</a>
    </div>
  </div>

  <div class="course-section faq-mini">
    <h2>자주 묻는 질문</h2>
    <div class="q">지방에 살아도 신청할 수 있나요? 방문 과외도 가능한가요?</div>
    <div class="a">네, 화상 과외는 전국 어디서나 동일하게 진행됩니다. 방문·대면 과외는 지역에 따라 배정 가능한 선생님이 달라, 상담 시 거주 지역을 말씀해주시면 방문 가능 여부와 카페·스터디카페 과외 등 대안을 함께 안내해드립니다.</div>
    <div class="q">선생님 성별이나 수업 장소를 선택할 수 있나요?</div>
    <div class="a">네, 여자 선생님·남자 선생님 모두 선택 가능하며, 신청 시 선호하시는 성별을 남겨주시면 우선 배정해드립니다. 수업 장소도 자택·카페·스터디카페·화상 중에서 원하시는 방식으로 진행할 수 있습니다.</div>
    <p><a href="/#faq" style="color:var(--gold); font-weight:600;">전체 FAQ 더 보기 →</a></p>
  </div>
${districtLinksSection(region, grade, subject)}
  <div class="course-section">
    <h2>관련 페이지</h2>
    <div class="related-grid">
      <div class="related-group">
        <h3>${esc(region.name)}의 다른 학년 ${esc(subject.label)}과외</h3>
        ${sameSubjectOtherGrades}
      </div>
      <div class="related-group">
        <h3>${esc(region.name)} ${esc(grade.label)}의 다른 과목</h3>
        ${sameGradeOtherSubjects}
      </div>
    </div>
    <p style="margin-top:16px;"><a href="/courses/" style="color:var(--gold); font-weight:600;">전국 지역별 과외 전체 목록 →</a></p>
  </div>
</div>

<footer>
  <div class="wrap">
    <div class="foot-logo">성적오름</div>
    <div class="foot-keywords">
      <p><b>지역별 과외</b>서울 · 경기 · 인천 · 부산 · 대구 · 광주 · 대전 · 울산 · 세종 · 강원 · 충북 · 충남 · 전북 · 전남 · 경북 · 경남 · 제주</p>
      <p><b>과목별 과외</b>국어 · 영어 · 수학 · 사회 · 과학 · 코딩 · 자기주도학습 코칭</p>
      <p><b>학년별 과외</b>초1 · 초2 · 초3 · 초4 · 초5 · 초6 · 중1 · 중2 · 중3 · 고1 · 고2 · 고3 · 재수생 · N수생</p>
    </div>
    <div class="foot-bottom">
      <span>© 2026 성적오름. All rights reserved.</span>
      <a href="/">홈으로</a>
    </div>
  </div>
</footer>
</body>
</html>
`;
}

function districtRelatedLinks(region, district, grade, subject) {
  const sameSubjectOtherGrades = GRADES.filter(g => g.key !== grade.key)
    .map(g => `<a href="/courses/${encodeURIComponent(districtSlug(region, district, g, subject))}.html">${region.name} ${district} ${g.label}${subject.label}과외</a>`).join('\n            ');
  const sameGradeOtherSubjects = SUBJECTS.filter(s => s.key !== subject.key)
    .map(s => `<a href="/courses/${encodeURIComponent(districtSlug(region, district, grade, s))}.html">${region.name} ${district} ${grade.label}${s.label}과외</a>`).join('\n            ');
  const siblingDistricts = (REGION_DISTRICTS[region.name] || [])
    .filter(d => d !== district).slice(0, 6)
    .map(d => `<a href="/courses/${encodeURIComponent(districtSlug(region, d, grade, subject))}.html">${region.name} ${d} ${grade.label}${subject.label}과외</a>`).join('\n            ');
  return { sameSubjectOtherGrades, sameGradeOtherSubjects, siblingDistricts };
}

function districtPageTemplate(region, district, grade, subject) {
  const c = CONTENT[grade.key][subject.key];
  const title = `${region.name} ${district} ${grade.label}${subject.label}과외 | 성적오름 1:1 맞춤 과외`;
  const desc = `${region.name} ${district} 지역 ${grade.label} 학생을 위한 ${subject.label}과외 안내. 초1부터 고3까지 12년 로드맵을 가진 성적오름이 ${district}에서도 동일한 커리큘럼으로 ${grade.label}${subject.label}과외를 제공합니다.`;
  const canonical = `${SITE}/courses/${encodeURIComponent(districtSlug(region, district, grade, subject))}.html`;
  const parentUrl = `/courses/${encodeURIComponent(slug(region, grade, subject))}.html`;
  const { sameSubjectOtherGrades, sameGradeOtherSubjects, siblingDistricts } = districtRelatedLinks(region, district, grade, subject);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#101a33">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<meta name="keywords" content="${esc(`${district}${grade.label}${subject.label}과외, ${district}과외, ${region.name}${district}과외, ${region.name}${grade.label}${subject.label}과외, ${grade.label}${subject.label}과외`)}">
<link rel="canonical" href="${canonical}">
<link rel="stylesheet" href="/assets/course.css">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600;700&family=Pretendard:wght@400;500;600;700&display=swap" rel="stylesheet">
<meta property="og:type" content="website">
<meta property="og:site_name" content="성적오름">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE}/og-image.jpg">
<meta property="og:url" content="${canonical}">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "홈", "item": "${SITE}/"},
    {"@type": "ListItem", "position": 2, "name": "지역별 과외", "item": "${SITE}/courses/"},
    {"@type": "ListItem", "position": 3, "name": "${esc(region.name)}", "item": "${SITE}${parentUrl}"},
    {"@type": "ListItem", "position": 4, "name": "${esc(region.name)} ${esc(district)} ${esc(grade.label)}${esc(subject.label)}과외", "item": "${canonical}"}
  ]
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "${esc(`${region.name} ${district} ${grade.label}${subject.label}과외`)}",
  "serviceType": "${esc(`${grade.label} ${subject.label} 과외`)}",
  "provider": {"@type": "EducationalOrganization", "name": "성적오름", "url": "${SITE}/"},
  "areaServed": {"@type": "AdministrativeArea", "name": "${esc(district)}", "containedInPlace": {"@type": "AdministrativeArea", "name": "${esc(region.name)}"}},
  "url": "${canonical}"
}
</script>
</head>
<body>
<header>
  <div class="nav">
    <a class="logo" href="/"><span class="logo-mark">성</span>성적오름</a>
    <a class="nav-cta" href="tel:010-3951-0535">상담 신청 010-3951-0535</a>
  </div>
</header>

<div class="mobile-cta-bar">
  <a class="mobile-cta-call" href="tel:010-3951-0535">☎ 전화</a>
  <a class="mobile-cta-kakao" href="https://open.kakao.com/o/sOXeVnpi" target="_blank" rel="noopener">💬 카톡</a>
  <a class="mobile-cta-apply" href="/#apply">진단 신청</a>
</div>

<div class="wrap">
  <div class="breadcrumb">
    <a href="/">홈</a><span class="sep">/</span>
    <a href="/courses/">지역별 과외</a><span class="sep">/</span>
    <a href="${parentUrl}">${esc(region.name)} ${esc(grade.label)}${esc(subject.label)}과외</a><span class="sep">/</span>
    <span>${esc(district)}</span>
  </div>

  <div class="course-hero">
    <div class="eyebrow">${esc(region.name)} ${esc(district)} · ${esc(grade.label)} · ${esc(subject.label)}</div>
    <h1>${esc(region.name)} ${esc(district)} ${esc(grade.label)}${esc(subject.label)}과외</h1>
    <p>초1부터 고3까지 12년 로드맵을 설계하는 1:1 전문 과외 성적오름이 ${esc(region.name)} ${esc(district)} ${esc(grade.label)} 학생을 위한 ${esc(subject.label)}과외를 안내합니다.</p>
  </div>

  <div class="course-section">
    <h2>${esc(c.title)}</h2>
    <p>${esc(c.body)}</p>
    <ul class="tag-list">${c.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
  </div>

  <div class="course-section">
    <h2>${esc(district)} 지역 수업 방식</h2>
    <p>${esc(district)}${topicParticle(district)} ${esc(region.name)} 소속 지역으로, 성적오름은 <a href="${parentUrl}">${esc(region.name)} 전역</a>에 동일한 커리큘럼과 선생님 매칭 기준을 적용합니다. ${esc(regionNote(region))}</p>
  </div>

  <div class="cta-box">
    <p>${esc(region.name)} ${esc(district)} ${esc(grade.label)}${esc(subject.label)}과외, 무료 학습 진단 상담으로 먼저 확인해보세요.</p>
    <div class="btns">
      <a class="btn-gold" href="/#apply">진단 신청</a>
      <a class="btn-outline" href="tel:010-3951-0535">전화 상담</a>
    </div>
  </div>

  <div class="course-section faq-mini">
    <h2>자주 묻는 질문</h2>
    <div class="q">지방에 살아도 신청할 수 있나요? 방문 과외도 가능한가요?</div>
    <div class="a">네, 화상 과외는 전국 어디서나 동일하게 진행됩니다. 방문·대면 과외는 지역에 따라 배정 가능한 선생님이 달라, 상담 시 거주 지역을 말씀해주시면 방문 가능 여부와 카페·스터디카페 과외 등 대안을 함께 안내해드립니다.</div>
    <div class="q">선생님 성별이나 수업 장소를 선택할 수 있나요?</div>
    <div class="a">네, 여자 선생님·남자 선생님 모두 선택 가능하며, 신청 시 선호하시는 성별을 남겨주시면 우선 배정해드립니다. 수업 장소도 자택·카페·스터디카페·화상 중에서 원하시는 방식으로 진행할 수 있습니다.</div>
    <p><a href="/#faq" style="color:var(--gold); font-weight:600;">전체 FAQ 더 보기 →</a></p>
  </div>

  <div class="course-section">
    <h2>관련 페이지</h2>
    <div class="related-grid">
      <div class="related-group">
        <h3>${esc(district)}의 다른 학년 ${esc(subject.label)}과외</h3>
        ${sameSubjectOtherGrades}
      </div>
      <div class="related-group">
        <h3>${esc(district)} ${esc(grade.label)}의 다른 과목</h3>
        ${sameGradeOtherSubjects}
      </div>
      ${siblingDistricts ? `<div class="related-group">
        <h3>${esc(region.name)}의 다른 지역</h3>
        ${siblingDistricts}
      </div>` : ''}
    </div>
    <p style="margin-top:16px;"><a href="${parentUrl}" style="color:var(--gold); font-weight:600;">${esc(region.name)} 전체 보기 →</a> · <a href="/courses/" style="color:var(--gold); font-weight:600;">전국 지역별 과외 전체 목록 →</a></p>
  </div>
</div>

<footer>
  <div class="wrap">
    <div class="foot-logo">성적오름</div>
    <div class="foot-keywords">
      <p><b>지역별 과외</b>서울 · 경기 · 인천 · 부산 · 대구 · 광주 · 대전 · 울산 · 세종 · 강원 · 충북 · 충남 · 전북 · 전남 · 경북 · 경남 · 제주</p>
      <p><b>과목별 과외</b>국어 · 영어 · 수학 · 사회 · 과학 · 코딩 · 자기주도학습 코칭</p>
      <p><b>학년별 과외</b>초1 · 초2 · 초3 · 초4 · 초5 · 초6 · 중1 · 중2 · 중3 · 고1 · 고2 · 고3 · 재수생 · N수생</p>
    </div>
    <div class="foot-bottom">
      <span>© 2026 성적오름. All rights reserved.</span>
      <a href="/">홈으로</a>
    </div>
  </div>
</footer>
</body>
</html>
`;
}

function hubTemplate() {
  const groups = REGIONS.map(region => {
    const links = GRADES.map(grade => SUBJECTS.map(subject =>
      `<a href="/courses/${encodeURIComponent(slug(region, grade, subject))}.html">${region.name} ${grade.label}${subject.label}과외</a>`
    ).join('\n          ')).join('\n          ');
    return `      <div class="related-group" id="${encodeURIComponent(region.name)}" style="margin-bottom:28px;">
        <h3>${esc(region.name)}</h3>
        <div class="related-grid" style="grid-template-columns:repeat(3,1fr);">
          ${links}
        </div>
      </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#101a33">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<title>지역별 과외 전체 목록 | 성적오름</title>
<meta name="description" content="서울·경기·인천·부산 등 전국 17개 지역, 초등·중등·고등 학년별, 수학·영어·국어 과목별 과외 안내 페이지 모음입니다.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${SITE}/courses/">
<link rel="stylesheet" href="/assets/course.css">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600;700&family=Pretendard:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
<header>
  <div class="nav">
    <a class="logo" href="/"><span class="logo-mark">성</span>성적오름</a>
    <a class="nav-cta" href="tel:010-3951-0535">상담 신청 010-3951-0535</a>
  </div>
</header>

<div class="mobile-cta-bar">
  <a class="mobile-cta-call" href="tel:010-3951-0535">☎ 전화</a>
  <a class="mobile-cta-kakao" href="https://open.kakao.com/o/sOXeVnpi" target="_blank" rel="noopener">💬 카톡</a>
  <a class="mobile-cta-apply" href="/#apply">진단 신청</a>
</div>

<div class="wrap">
  <div class="breadcrumb"><a href="/">홈</a><span class="sep">/</span><span>지역별 과외</span></div>
  <div class="course-hero">
    <div class="eyebrow">전국 서비스 지역</div>
    <h1>지역별 과외 전체 목록</h1>
    <p>전국 17개 지역 × 초등·중등·고등 × 수학·영어·국어로 나눈 과외 안내 페이지입니다. 원하시는 지역과 학년, 과목을 찾아 들어가 보세요. 각 지역 페이지에서 시/군/구 단위 세부 페이지로도 이동할 수 있습니다.</p>
  </div>
  <div class="course-section">
${groups}
  </div>
</div>

<footer>
  <div class="wrap">
    <div class="foot-logo">성적오름</div>
    <div class="foot-bottom">
      <span>© 2026 성적오름. All rights reserved.</span>
      <a href="/">홈으로</a>
    </div>
  </div>
</footer>
</body>
</html>
`;
}

fs.mkdirSync(COURSES_DIR, { recursive: true });

let regionPageCount = 0;
let districtPageCount = 0;
const sitemapEntries = [];

for (const region of REGIONS) {
  for (const grade of GRADES) {
    for (const subject of SUBJECTS) {
      const filename = `${slug(region, grade, subject)}.html`;
      fs.writeFileSync(path.join(COURSES_DIR, filename), pageTemplate(region, grade, subject), 'utf8');
      sitemapEntries.push({ loc: `${SITE}/courses/${encodeURIComponent(filename)}`, priority: '0.5' });
      regionPageCount++;
    }
  }
  const districts = REGION_DISTRICTS[region.name] || [];
  for (const district of districts) {
    for (const grade of GRADES) {
      for (const subject of SUBJECTS) {
        const filename = `${districtSlug(region, district, grade, subject)}.html`;
        fs.writeFileSync(path.join(COURSES_DIR, filename), districtPageTemplate(region, district, grade, subject), 'utf8');
        sitemapEntries.push({ loc: `${SITE}/courses/${encodeURIComponent(filename)}`, priority: '0.4' });
        districtPageCount++;
      }
    }
  }
}
fs.writeFileSync(path.join(COURSES_DIR, 'index.html'), hubTemplate(), 'utf8');
sitemapEntries.unshift({ loc: `${SITE}/courses/`, priority: '0.7' });

fs.writeFileSync(path.join(__dirname, 'course-urls.json'), JSON.stringify(sitemapEntries.map(e => e.loc), null, 2), 'utf8');

const today = new Date().toISOString().slice(0, 10);
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.map(e => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap-courses.xml'), sitemapXml, 'utf8');

console.log(`Generated ${regionPageCount} region pages + ${districtPageCount} district pages + 1 hub page.`);
console.log(`Wrote sitemap-courses.xml with ${sitemapEntries.length} URLs.`);
