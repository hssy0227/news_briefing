import type { NaverNewsItem } from '@/types/news';

/** 제외할 블로그/개인 미디어 도메인 패턴 */
const BLOG_DOMAINS = [
  'blog.naver.com',
  'tistory.com',
  'brunch.co.kr',
  'medium.com',
  'velog.io',
  'blog.daum.net',
  'post.naver.com',
  'cafe.naver.com',
  'story.kakao.com',
];

/** 제외할 서베이/설문 사이트 도메인 */
const SURVEY_DOMAINS = [
  'surveymonkey.com',
  'forms.gle',
  'docs.google.com/forms',
  'typeform.com',
  'naver.me',
];

/** 광고성 기사 제목 패턴 */
const AD_PATTERNS = [
  /\[AD\]/i,
  /\[광고\]/,
  /\[PR\]/i,
  /\[후원\]/,
  /\[협찬\]/,
  /\[스폰서\]/,
  /광고\s*$/,
  /제공\s*$/,
];

/**
 * 카테고리별 저관련도 패턴 (제목+설명 기준)
 * 해당 패턴이 매칭되면 수집에서 제외한다.
 */
const CATEGORY_LOW_RELEVANCE: Record<string, RegExp[]> = {
  ai: [
    // 클라우드 파트너십 수상, 리셀 파트너 등 AI 산업 관여도 낮은 뉴스
    /클라우드.{0,10}(리셀|파트너.{0,5}수상|파트너.{0,5}선정)/,
    /(리셀|총판).{0,10}파트너/,
    /(어워드|시상식).{0,10}수상/,
    // 채용·교육 관련
    /AI.{0,10}(채용|인턴|교육|자격증|강의)/,
    // 해외 특정 기술 도입 (국내 커머스 관련성 낮음)
    /스노우플레이크|데이터브릭스|팔란티어/,
  ],
  ecommerce: [
    // 정치·외교 기사에서 이커머스 언급
    /(외교|한미.{0,5}동맹|정권|대통령|국회).{0,30}(쿠팡|이커머스|온라인)/,
    /(쿠팡|이커머스|온라인).{0,30}(외교|한미.{0,5}동맹|정권)/,
    // 주식·증권 기사
    /코스피|코스닥|주가 상승|주가 하락|증시/,
    // 경영진 인사 (시장 변화 관련 없음)
    /CEO.{0,5}교체|임원.{0,5}인사|대표이사.{0,5}선임/,
  ],
  products: [
    // 해외 광고·캠페인 (국내 사업 관련 없음)
    /(미국|영국|유럽|해외).{0,15}(전광판|광고판|캠페인|홍보)/,
    // 기후변화·ESG 관련 (온라인 영업 관련 없음)
    /기후\s*변화|탄소\s*중립|ESG\s*(경영|보고|성과)/,
    // 정부·공공기관 협력 (B2C 관련 없음)
    /지방\s*정부.{0,10}협력|공공\s*기관.{0,10}납품|정부.{0,10}지원사업/,
    // 해외 생산·공장 관련
    /(베트남|인도|멕시코|폴란드).{0,10}(공장|생산|거점)/,
  ],
};

/**
 * URL이 블로그 도메인에 해당하는지 확인한다.
 * @param url - 검사할 URL
 * @returns 블로그 여부
 */
export function isBlogUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return BLOG_DOMAINS.some((domain) => lowerUrl.includes(domain));
}

/**
 * URL이 서베이/설문 사이트에 해당하는지 확인한다.
 * @param url - 검사할 URL
 * @returns 서베이 사이트 여부
 */
export function isSurveyUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return SURVEY_DOMAINS.some((domain) => lowerUrl.includes(domain));
}

/**
 * 기사 제목이 광고성인지 확인한다.
 * @param title - 기사 제목
 * @returns 광고성 여부
 */
export function isAdTitle(title: string): boolean {
  return AD_PATTERNS.some((pattern) => pattern.test(title));
}

/**
 * HTML 태그를 제거하여 순수 텍스트를 반환한다.
 * 네이버 뉴스 API 응답에 포함된 <b> 등의 태그 제거에 사용한다.
 * @param html - HTML 문자열
 * @returns 태그가 제거된 순수 텍스트
 */
export function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'");
}

/**
 * 기사 제목에서 언론사명, 코너명, 노이즈 태그를 제거한다.
 * [단독], [속보], (사진), "- 조선일보", "| 한국경제" 등을 제거한다.
 * @param rawTitle - 원본 제목 (HTML 태그 포함 가능)
 * @returns 정제된 제목
 */
export function cleanTitle(rawTitle: string): string {
  let title = stripHtmlTags(rawTitle);

  // 앞쪽 대괄호 태그 제거: [단독], [속보], [종합], [포토], [영상], [인터뷰], [기고] 등
  title = title.replace(/^\s*\[[^\]]{1,12}\]\s*/g, '');

  // 앞쪽 소괄호 태그 제거: (사진), (영상), (종합2보), (상보) 등
  title = title.replace(/^\s*\([^)]{1,10}\)\s*/g, '');

  // 중간 대괄호 코너명 제거 (예: 제목 [코너명] 나머지)
  title = title.replace(/\s*\[[^\]]{1,15}\]\s*/g, ' ');

  // "언론사 :" prefix 제거 (예: "연합뉴스 :", "한경 :")
  title = title.replace(/^([\w가-힣·]{1,8})\s*:\s+(?=\S)/, '');

  // " - 언론사명" suffix 제거
  const mediaSuffix =
    /(조선|동아|중앙|한겨레|경향|한국|매일|서울|국민|문화|내일|세계|파이낸셜|머니|이데일리|헤럴드|뉴시스|연합|YTN|MBC|KBS|SBS|JTBC|채널A|뉴스1|노컷|아시아|전자|지디넷|더벨|블로터|디지털데일리)/;
  title = title.replace(
    new RegExp(`\\s*[-–]\\s*${mediaSuffix.source}[\\w가-힣]{0,6}\\s*$`),
    ''
  );

  // " | 언론사명" suffix 제거
  title = title.replace(
    new RegExp(`\\s*\\|\\s*${mediaSuffix.source}[\\w가-힣]{0,6}\\s*$`),
    ''
  );

  return title.trim().replace(/\s+/g, ' ');
}

/**
 * 키워드가 기사의 주요 내용인지 확인한다.
 * 제목 또는 설명 첫 200자에 키워드가 포함되어야 한다.
 * @param item - 네이버 뉴스 아이템
 * @param keyword - 검색 키워드
 * @returns 주요 내용 여부
 */
export function isKeywordMainTopic(item: NaverNewsItem, keyword: string): boolean {
  const title = stripHtmlTags(item.title).toLowerCase();
  const kw = keyword.toLowerCase();

  // 제목에 키워드 포함 → 주요 내용
  if (title.includes(kw)) return true;

  // 설명 앞 200자에 포함 → 도입부 관련
  const desc = stripHtmlTags(item.description || '').toLowerCase();
  if (desc.substring(0, 200).includes(kw)) return true;

  return false;
}

/**
 * 카테고리별 저관련도 패턴에 해당하는지 확인한다.
 * @param title - 정제된 기사 제목
 * @param description - 기사 설명
 * @param category - 카테고리
 * @returns 저관련도 여부 (true면 제외)
 */
export function isLowRelevance(
  title: string,
  description: string,
  category: string
): boolean {
  const patterns = CATEGORY_LOW_RELEVANCE[category];
  if (!patterns) return false;
  const text = `${title} ${description}`;
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * 네이버 뉴스 검색 결과를 필터링한다.
 * 블로그, 서베이, 광고성 기사를 제외하고,
 * 키워드 관련도 및 카테고리 관련도를 검증한다.
 * @param items - 네이버 뉴스 검색 결과 아이템 배열
 * @param keyword - 검색에 사용한 키워드 (관련도 체크용)
 * @param category - 카테고리 (저관련도 제외용)
 * @returns 필터링된 아이템 배열
 */
export function filterNewsItems(
  items: NaverNewsItem[],
  keyword?: string,
  category?: string
): NaverNewsItem[] {
  return items.filter((item) => {
    const url = item.originallink || item.link;
    const title = stripHtmlTags(item.title);
    const description = stripHtmlTags(item.description || '');

    if (isBlogUrl(url)) return false;
    if (isSurveyUrl(url)) return false;
    if (isAdTitle(title)) return false;

    // 키워드가 기사 주요 내용인지 확인
    if (keyword && !isKeywordMainTopic(item, keyword)) return false;

    // 카테고리별 저관련도 제외
    if (category && isLowRelevance(title, description, category)) return false;

    return true;
  });
}

/**
 * URL 기준으로 기사 목록에서 중복을 제거한다.
 * @param items - 뉴스 아이템 배열
 * @returns 중복 제거된 아이템 배열
 */
export function deduplicateByUrl(items: NaverNewsItem[]): NaverNewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const url = item.originallink || item.link;
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}
