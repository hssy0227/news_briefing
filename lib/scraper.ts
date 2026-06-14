import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ScrapedArticle } from '@/types/news';

/**
 * 주어진 URL에서 뉴스 기사 본문을 스크래핑한다.
 * 한국 주요 뉴스 사이트의 HTML 구조를 지원한다.
 * @param url - 스크래핑할 뉴스 기사 URL
 * @returns 스크래핑된 기사 정보
 */
export async function scrapeArticle(url: string): Promise<ScrapedArticle> {
  const response = await axios.get(url, {
    timeout: 10000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    responseType: 'text',
  });

  const $ = cheerio.load(response.data);

  const title = extractTitle($);
  const body = extractBody($);
  const source = extractSourceFromMeta($);
  const publishedAt = extractPublishedDate($);

  return {
    title,
    body,
    source,
    publishedAt,
    url,
  };
}

/**
 * HTML에서 기사 제목을 추출한다.
 * og:title 메타 태그, h1, 또는 title 태그 순으로 시도한다.
 * @param $ - cheerio 인스턴스
 * @returns 추출된 제목
 */
function extractTitle($: cheerio.CheerioAPI): string {
  // og:title 시도
  const ogTitle = $('meta[property="og:title"]').attr('content');
  if (ogTitle) return ogTitle.trim();

  // h1 시도
  const h1 = $('h1').first().text();
  if (h1) return h1.trim();

  // title 태그 시도
  const titleTag = $('title').text();
  if (titleTag) return titleTag.trim();

  return '제목 없음';
}

/**
 * HTML에서 기사 본문을 추출한다.
 * 주요 한국 뉴스 사이트의 본문 셀렉터를 순차적으로 시도한다.
 * @param $ - cheerio 인스턴스
 * @returns 추출된 본문 텍스트
 */
function extractBody($: cheerio.CheerioAPI): string {
  // 주요 뉴스 사이트별 본문 셀렉터
  const selectors = [
    '#dic_area',                    // 네이버 뉴스
    '#articeBody',                  // 네이버 뉴스 (구버전)
    '.article_body',               // 조선일보
    '#article-view-content-div',   // 전자신문 등
    '.article_txt',                // 동아일보
    '.news_end',                   // 한국경제
    '#articleBodyContents',        // 네이버 뉴스 (모바일)
    '.article-body',               // 일반적 패턴
    '.article_content',            // 일반적 패턴
    'article',                     // 시맨틱 HTML
    '.content',                    // 폴백
  ];

  for (const selector of selectors) {
    const element = $(selector);
    if (element.length > 0) {
      // 스크립트, 스타일, 광고 요소 제거
      element.find('script, style, .ad, .advertisement, .banner').remove();
      const text = element.text().trim();
      if (text.length > 100) {
        return text.replace(/\s+/g, ' ').substring(0, 5000);
      }
    }
  }

  // 폴백: p 태그 텍스트 결합
  const paragraphs: string[] = [];
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) {
      paragraphs.push(text);
    }
  });

  if (paragraphs.length > 0) {
    return paragraphs.join(' ').substring(0, 5000);
  }

  return '';
}

/**
 * 메타 태그에서 언론사명을 추출한다.
 * @param $ - cheerio 인스턴스
 * @returns 언론사명 또는 null
 */
function extractSourceFromMeta($: cheerio.CheerioAPI): string | null {
  const ogSiteName = $('meta[property="og:site_name"]').attr('content');
  if (ogSiteName) return ogSiteName.trim();

  const publisher = $('meta[name="publisher"]').attr('content');
  if (publisher) return publisher.trim();

  return null;
}

/**
 * 메타 태그에서 기사 발행일을 추출한다.
 * @param $ - cheerio 인스턴스
 * @returns ISO 형식 날짜 문자열 또는 null
 */
function extractPublishedDate($: cheerio.CheerioAPI): string | null {
  const articlePublished = $('meta[property="article:published_time"]').attr('content');
  if (articlePublished) return articlePublished;

  const datePublished = $('meta[name="date"]').attr('content');
  if (datePublished) return datePublished;

  return null;
}
