# CLAUDE.md - Daily News Briefing

이 파일은 Claude Code가 본 프로젝트에서 코드를 작성할 때 따라야 할 지침을 제공합니다.

---

## 프로젝트 개요

- **서비스명**: Daily News Briefing
- **목적**: 매일 이커머스/유통/AI/가전 관련 뉴스를 자동 수집하고, Claude AI로 요약하여 신문형 레이아웃의 반응형 웹으로 제공
- **사용자**: 1인 전용 (로그인 불필요)
- **배포**: Vercel (Hobby plan)

---

## 기술 스택

| 구분 | 기술 |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS (신문풍 커스텀 테마) |
| Database | Supabase (PostgreSQL) |
| News API | Naver News Search API |
| Scraping | cheerio + axios |
| AI Summary | @anthropic-ai/sdk (claude-sonnet-4-6) |
| Email | nodemailer (Gmail SMTP) |
| Deploy | Vercel (Hobby plan) |

---

## 코딩 컨벤션

### 커밋 메시지
- 커밋 메시지는 반드시 **한글**로 작성한다.

### 코드 스타일
- 모든 함수에 **JSDoc 주석**을 추가한다.
- TypeScript strict 모드를 사용한다.
- `@/*` import alias를 사용한다.

### 파일 구조 규칙
- `app/` - Next.js App Router 페이지 및 API 라우트
- `components/` - React 컴포넌트 (도메인별 하위 폴더)
- `lib/` - 비즈니스 로직 모듈 (순수 함수 중심)
- `types/` - TypeScript 타입 정의

---

## 뉴스 수집 카테고리 & 키워드

### 1. AI 관련 (category: 'ai')
- 키워드: 생성형 AI, 에이전틱 커머스, 에이전틱 AI, AI 디바이스, AI 가전

### 2. 이커머스/유통 (category: 'ecommerce')
- 키워드: 네이버, 쿠팡, G마켓, 11번가, SSG, 신세계, 테무, 알리, 쉬인, 홈쇼핑, 이커머스, 온라인 쇼핑, 온라인 시장
- C커머스 = 중국 크로스보더 이커머스 (테무/알리/쉬인)

### 3. 제품/브랜드 (category: 'products')
- 키워드: 애플, 아이폰, LG, 가전 구독, 가전, 온라인 가전, 휴대폰
- C브랜드 = 중국 브랜드 (가전/IT 분야)

### 수집 제외 조건
- 광고성 기사 ([AD], [광고], [PR], 후원, 협찬 포함)
- 중복 기사 (URL 기준 UNIQUE)
- 블로그 (blog.naver.com, tistory.com, brunch.co.kr 등)
- 서베이/설문 사이트

---

## AI 요약 포맷 (출력 규격)

각 기사별 4줄 구조:
```
1. 기사 제목 (신문사명 제거)
2. 주요 내용 1 (본문 인용, 명사형 어미)
3. 주요 내용 2 (본문 인용, 명사형 어미)
4. 기사 URL
```

- 주요 내용은 가전 제조사 이커머스팀 관점에서 업무 연관성 높은 내용 위주
- 유통, 커머스, 경쟁사 관련 내용 우선
- 언어: 한국어

---

## 데이터베이스 스키마 (Supabase)

### articles 테이블
```sql
CREATE TABLE articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  briefing_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ai', 'ecommerce', 'products')),
  title TEXT NOT NULL,
  original_title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  source TEXT,
  published_at TIMESTAMPTZ,
  summary_point1 TEXT,
  summary_point2 TEXT,
  is_manual BOOLEAN DEFAULT FALSE,
  is_excluded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_articles_briefing_date ON articles(briefing_date);
CREATE INDEX idx_articles_date_category ON articles(briefing_date, category);
```

### briefings 테이블
```sql
CREATE TABLE briefings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'sent')),
  article_count INTEGER DEFAULT 0,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### collection_logs 테이블
```sql
CREATE TABLE collection_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('auto', 'manual', 'cron')),
  keyword_count INTEGER DEFAULT 0,
  raw_count INTEGER DEFAULT 0,
  filtered_count INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API 라우트 설계

| 엔드포인트 | 메서드 | 설명 |
|---|---|---|
| `/api/collect` | POST | 네이버 뉴스 자동 수집 |
| `/api/scrape` | POST | 수동 URL 스크래핑 |
| `/api/summarize` | POST | Claude AI 요약 생성 |
| `/api/briefing` | GET/POST | 브리핑 조회/저장 |
| `/api/briefing/[date]` | GET | 날짜별 브리핑 조회 |
| `/api/article/[id]` | PATCH | 개별 기사 요약 수정 |
| `/api/email` | POST | 이메일 발송 |
| `/api/cron/collect` | GET | 크론: 수집 (14:00 KST) |
| `/api/cron/summarize` | GET | 크론: 요약 (14:05 KST) |
| `/api/cron/email` | GET | 크론: 이메일 (14:10 KST) |

---

## 환경변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=        # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase 공개 키
SUPABASE_SERVICE_ROLE_KEY=       # Supabase 서비스 키 (서버 전용)
NAVER_CLIENT_ID=                 # 네이버 개발자 Client ID
NAVER_CLIENT_SECRET=             # 네이버 개발자 Client Secret
ANTHROPIC_API_KEY=               # Claude API 키
GMAIL_USER=                      # Gmail 발신 주소
GMAIL_APP_PASSWORD=              # Gmail 앱 비밀번호
EMAIL_TO=kindapie@naver.com      # 수신 이메일
CRON_SECRET=                     # Vercel Cron 인증 시크릿
```

---

## 크론 스케줄 (vercel.json)

```json
{
  "crons": [
    { "path": "/api/cron/collect", "schedule": "0 5 * * *" },
    { "path": "/api/cron/summarize", "schedule": "5 5 * * *" },
    { "path": "/api/cron/email", "schedule": "10 5 * * *" }
  ]
}
```
- UTC 5:00/5:05/5:10 = KST 14:00/14:05/14:10
- Vercel Hobby 플랜 10초 제한 대응을 위해 3단계 분리

---

## UI/UX 요건

- **레이아웃**: 신문형 섹션 나눔 (3개 카테고리)
- **디자인 톤**: 뉴스레터 스타일
- **폰트**: Noto Serif KR (제목) / Noto Sans KR (본문)
- **반응형**: PC + 모바일
- **필수 기능**:
  - 날짜별 브리핑 아카이브
  - 카테고리 필터 탭
  - 원문 링크 연결
  - 전체 브리핑 마크다운 복사 (1-click)
  - 항목별 개별 마크다운 복사
  - 이메일 전송 버튼
  - 수동 URL 입력 폼
  - AI 요약 직접 수정 (편집 모드)
  - 수동 새로고침 버튼

---

## 이메일 설정

- **발송 방식**: Gmail SMTP (nodemailer)
- **포맷**: HTML 뉴스레터 (인라인 CSS)
- **수신자**: kindapie@naver.com
- **트리거**: 수동 버튼 + 매일 14:10 KST 자동 발송
- **Gmail 앱 비밀번호**: Google 계정 → 2단계 인증 → 앱 비밀번호 생성

---

## 데이터 관리

- **보관 기간**: 90일 (이후 자동 삭제)
- **정리 시점**: 크론 실행 시 90일 초과 데이터 DELETE
- **편집**: AI 요약 결과를 사용자가 직접 수정 가능

---

## 빌드 & 배포 명령어

```bash
npm run dev          # 로컬 개발 서버 실행
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버 실행
npm run lint         # ESLint 실행
```
