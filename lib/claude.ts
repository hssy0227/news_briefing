import { GoogleGenAI } from '@google/genai';
import type { Article } from '@/types/news';

/** 호출 시점의 env를 읽어 Gemini 클라이언트를 생성한다. */
function createClient() {
  return new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });
}

// ─────────────────────────────────────────
// 큐레이션 프롬프트
// ─────────────────────────────────────────

const CURATION_SYSTEM_INSTRUCTION = `당신은 삼성전자 한국총괄 온라인영업 산하 온라인전략기획 파트의 시장 센싱 큐레이터다.

[소속 R&R]
- 온라인팀은 이커머스(쿠팡/네이버/11번가/G마켓 등)와 D2C(삼성닷컴/패밀리넷/EPP) 영업을 담당
- 우리 파트는 일단위로 시장·경쟁사·채널·규제 동향을 센싱해 영업과 전략 부서에 리포팅

[핵심 질문]
"이 뉴스가 영업/전략 기획에 인풋이 되는 시장·유통 변화 신호인가?"
→ Y면 통과(include: true), N이면 제외(include: false)

═══════════════════════════════════════════
【가점 카테고리 - 통과 대상】
═══════════════════════════════════════════

A. 채널 사업·정책·규제 변화 (score 7~10)
   - 이커머스 채널의 손익/제재/소송/M&A/경영진 변화
   - 채널의 전략 전환 (해외 진출, 신사업, 지배구조 변경)
   - 수수료/장려금/광고/물류 정책 변경
   예: 쿠팡 6247억 과징금 / 신세계 SSG닷컴 완전인수 / 11번가 징둥 진출

B. 경쟁 브랜드 동향 - 가전·디지털·온라인 한정 (score 7~10)
   - 경쟁사 신제품/가격/단독모델/채널 전략
   - 글로벌 브랜드의 국내 채널 활동
   ※ 단순 R&D·해외 단독 활동은 제외
   예: 애플 시리 AI 개편 / LG 스탠바이미2 맥스 / 샤오미·다이슨 국내 채널 전략

C. C-커머스 & 글로벌 직구 동향 (score 7~10)
   - 알리/테무/쉬인의 국내 진출·정책 변화
   - 해외직구 시장 변동 (환율, 관세, 규제)
   예: 알리 무료반품 정책 변경 / C-커머스 침투 분석

D. AI × 커머스 결합 (score 7~10)
   - 채널사의 AI 도입 (네이버 큐, 카카오 AI 등)
   - 글로벌 AI-커머스 인프라 (에이전틱 커머스, AI 쇼핑 어시스턴트)
   - 결제·물류·검색·추천 인프라 재편
   ※ 단순 AI 기술 뉴스(KPMG 환각, KT AX 등)는 제외
   예: 비자+오픈AI AI 결제 / 네이버 AI 취향 추천

E. 시장 거시 트렌드 (score 7~8)
   - 가전·디지털 카테고리 침투율 변화
   - 소비 패턴 변화 (구독경제, 체험형, 가성비/프리미엄 양극화)
   - 유통 채널 구조 변화 (오프라인-온라인 통합, 옴니채널)

F. 소비자보호·온라인 유통 규제 (score 7~8)
   - 표시광고/소비자보호/온플법 등 채널 영향 법규
   - 개인정보, 구독 해지, 다크패턴 규제

═══════════════════════════════════════════
【자동 제외 - score: 0, include: false】
═══════════════════════════════════════════

✗ 삼성전자/삼성닷컴이 주어인 기사 (예: "삼성전자 감사 페스티벌", "삼성 옥외광고")
  ※ 예외: 경쟁사 비교 분석에서 당사가 객체로 언급되면 통과 가능
✗ 유통사 프로모션 보도자료 (예: "G마켓 숙박세일", "쿠팡 숙박 할인쿠폰", "롯데마트 소고기 할인")
  ※ 예외: 업계 전체의 새로운 마케팅 패턴이면 E 카테고리 통과 가능
✗ AI 뉴스이나 커머스·채널·소비와 무관 (예: "KPMG AI 환각", "KT AX 전략", "포스코 AX")
✗ 유통사·브랜드의 사회공헌·ESG·인사·일반행사 (예: "11번가 여성기업 판매관", "쿠팡 봉사활동")
  ※ 예외: 전략 방향성이 명확히 시사되면 통과
✗ 채널/브랜드명만 곁다리로 언급된 정치·사회·연예 (예: "李정권 강경좌파…쿠팡 우려")
✗ 통신/금융/부동산/식품/항공 단독 이슈 (예: "LG U+ 이용자 보호", "우리카드 출시")
  ※ 예외: 결제·구독·인증 등 커머스 인프라 연결 시 D 카테고리 통과
✗ 해외 단독 이슈 (예: "LG전자 美 전광판 광고", "LG전자 美 인포콤 전시")
✗ 월드컵/올림픽 등 이벤트 단순 연계 마케팅
✗ 시험문제·부고·공지·광고성

═══════════════════════════════════════════
【중복 처리 - 동일 사안 다수 보도 시】
═══════════════════════════════════════════

1순위(메이저): 한국경제, 매일경제, 조선/중앙/동아, 연합뉴스, 머니투데이, 이데일리,
              헤럴드경제, 파이낸셜뉴스, 전자신문, 지디넷코리아
2순위: 비즈워치, 디지털데일리, 디지털타임스, IT조선, 블로터
3순위 이하: 메이저 또는 2순위에 동일 사안 있으면 자동 제외

판정 기준: 제목 유사도 70% 이상 또는 핵심 키워드 3개 이상 일치 시 하위 순위 제외

## 출력 형식 (JSON)
반드시 아래 JSON 배열 형식으로만 응답하세요. 순수 JSON만 출력하세요.
[
  {
    "id": "기사 ID",
    "score": 8,
    "category": "A",
    "reason": "판정근거 한 줄 (어떤 영업/전략 인풋으로 활용 가능한지)",
    "include": true
  }
]

규칙:
- score 7 이상 → include: true
- score 6 이하 → include: false
- 자동 제외 → score: 0, category: "제외", include: false
- 중복 제외(하위 순위) → score: 0, category: "중복", include: false`;

/** 큐레이션 결과 타입 */
export interface CurationResult {
  id: string;
  score: number;
  category: string;
  reason: string;
  include: boolean;
}

/**
 * 기사 목록을 큐레이션한다.
 * 각 기사의 관련도를 평가하여 포함/제외를 결정한다.
 * @param articles - 큐레이션할 기사 목록
 * @param bodies - 기사 ID → 본문 텍스트 맵
 * @returns 큐레이션 결과 배열
 */
export async function curateArticles(
  articles: Article[],
  bodies: Map<string, string> = new Map()
): Promise<CurationResult[]> {
  if (articles.length === 0) return [];

  const results: CurationResult[] = [];
  const batchSize = 15;

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const batchResults = await curateBatch(batch, bodies);
    results.push(...batchResults);

    if (i + batchSize < articles.length) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  return results;
}

/**
 * 기사 배치를 큐레이션한다.
 * @param articles - 큐레이션할 기사 배치
 * @param bodies - 기사 ID → 본문 텍스트 맵
 * @returns 큐레이션 결과 배열 (실패 시 전체 통과 처리)
 */
async function curateBatch(
  articles: Article[],
  bodies: Map<string, string>
): Promise<CurationResult[]> {
  // AI에게 UUID 대신 인덱스 번호를 사용하게 하여 오류 방지
  const articleTexts = articles
    .map((a, idx) => {
      const body = bodies.get(a.id);
      return `--- 기사 ${idx} ---
제목: ${a.original_title}
언론사: ${a.source || '알 수 없음'}
${body ? `본문 앞부분:\n${body.substring(0, 500)}` : ''}`;
    })
    .join('\n\n');

  const prompt = `다음 ${articles.length}개 기사를 큐레이션해주세요. id 필드는 기사 번호(0부터 시작)를 숫자로 입력하세요.\n\n${articleTexts}`;

  try {
    const ai = createClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: CURATION_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
      contents: prompt,
    });

    const responseText = response.text ?? '';
    const jsonText = responseText.replace(/```json\n?|\n?```/g, '').trim();
    // 인덱스 → 실제 UUID 매핑
    const parsed = JSON.parse(jsonText) as Array<Omit<CurationResult, 'id'> & { id: string | number }>;
    return parsed.map((item) => {
      const idx = Number(item.id);
      const realId = articles[idx]?.id ?? String(item.id);
      return { ...item, id: realId };
    });
  } catch (error) {
    console.error('Gemini 큐레이션 실패:', error);
    return articles.map((a) => ({
      id: a.id,
      score: 7,
      category: '?',
      reason: '큐레이션 실패 - 통과 처리',
      include: true,
    }));
  }
}

// ─────────────────────────────────────────
// 요약 프롬프트
// ─────────────────────────────────────────

const SUMMARY_SYSTEM_INSTRUCTION = `당신은 삼성전자 한국총괄 온라인영업 산하 온라인전략기획 파트의 시장 센싱 큐레이터다.
큐레이션을 통과한 기사를 영업/전략 관점에서 핵심만 요약한다.

## 요약 규칙
1. 기사 제목에서 신문사명, 코너명, [단독][속보][종합] 등 태그를 반드시 제거한다.
2. 주요 내용은 반드시 기사 본문에서 구체적인 사실을 인용한다.
   - 수치, 날짜, 업체명, 제품명, 금액 등 구체적 정보를 포함한다.
   - 명사형 어미로 끝낸다. (예: "~한 것으로 나타남", "~할 계획", "~로 확대", "~를 발표")
3. 주요 내용 우선순위:
   1순위: 가격·프로모션·혜택 정보
   2순위: 유통 채널·플랫폼 변화
   3순위: 경쟁사 동향
   4순위: 시장 규모·점유율 변화
4. 반드시 한국어로 작성한다.

## 출력 형식 (JSON)
반드시 아래 JSON 배열 형식으로만 응답하세요. 순수 JSON만 출력하세요.
[
  {
    "id": "기사 ID",
    "title": "정제된 제목 (태그·언론사명 제거)",
    "summary_point1": "구체적 사실 1 (수치·날짜·업체명 포함, 명사형 어미)",
    "summary_point2": "구체적 사실 2 (없으면 null)"
  }
]`;

/** AI 요약 결과 타입 */
export interface SummaryResult {
  id: string;
  title: string;
  summary_point1: string;
  summary_point2: string | null;
}

/**
 * 기사 목록에 대해 Gemini AI 요약을 생성한다.
 * @param articles - 요약할 기사 목록
 * @param bodies - 기사 ID → 본문 텍스트 맵
 * @returns 요약 결과 배열
 */
export async function generateSummaries(
  articles: Article[],
  bodies: Map<string, string> = new Map()
): Promise<SummaryResult[]> {
  if (articles.length === 0) return [];

  const results: SummaryResult[] = [];
  const batchSize = 5;

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const batchResults = await summarizeBatch(batch, bodies);
    results.push(...batchResults);

    if (i + batchSize < articles.length) {
      await new Promise((resolve) => setTimeout(resolve, 4000));
    }
  }

  return results;
}

/**
 * 기사 배치에 대해 요약을 생성한다.
 * 실패 시 빈 배열 반환 → DB null 유지 → 재시도 가능
 */
async function summarizeBatch(
  articles: Article[],
  bodies: Map<string, string>
): Promise<SummaryResult[]> {
  const articleTexts = articles
    .map((a, idx) => {
      const body = bodies.get(a.id);
      return `--- 기사 ${idx} ---
원본 제목: ${a.original_title}
언론사: ${a.source || '알 수 없음'}
URL: ${a.url}
${body ? `본문:\n${body}` : '(본문 없음 - 제목으로만 요약)'}`;
    })
    .join('\n\n');

  try {
    const ai = createClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SUMMARY_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
      contents: `다음 ${articles.length}개 기사를 요약해주세요. id 필드는 기사 번호(0부터 시작)를 숫자로 입력하세요.\n\n${articleTexts}`,
    });

    const responseText = response.text ?? '';
    const jsonText = responseText.replace(/```json\n?|\n?```/g, '').trim();
    // 인덱스 → 실제 UUID 매핑
    const parsed = JSON.parse(jsonText) as Array<Omit<SummaryResult, 'id'> & { id: string | number }>;
    return parsed.map((item) => {
      const idx = Number(item.id);
      const realId = articles[idx]?.id ?? String(item.id);
      return { ...item, id: realId };
    });
  } catch (error) {
    console.error('Gemini API 요약 생성 실패:', error);
    return [];
  }
}

/**
 * 단일 기사 본문에 대해 Gemini AI 요약을 생성한다.
 * 수동 URL 스크래핑 후 요약에 사용한다.
 */
export async function summarizeSingleArticle(
  title: string,
  body: string,
  url: string
): Promise<{ title: string; summary_point1: string; summary_point2: string | null }> {
  try {
    const ai = createClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SUMMARY_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
      contents: `다음 기사를 요약해주세요.

--- 기사 ---
ID: single
원본 제목: ${title}
URL: ${url}
본문:
${body.substring(0, 3000)}`,
    });

    const responseText = response.text ?? '';
    const jsonText = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(jsonText) as SummaryResult[];
    if (parsed.length > 0) {
      return {
        title: parsed[0].title,
        summary_point1: parsed[0].summary_point1,
        summary_point2: parsed[0].summary_point2,
      };
    }

    return { title, summary_point1: '요약 생성 실패', summary_point2: null };
  } catch (error) {
    console.error('단일 기사 요약 실패:', error);
    return { title, summary_point1: '요약 생성 실패', summary_point2: null };
  }
}
