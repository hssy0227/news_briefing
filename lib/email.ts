import nodemailer from 'nodemailer';
import type { Article } from '@/types/news';
import { CATEGORY_LABELS } from '@/types/news';
import { groupByCategory } from '@/lib/format';
import { formatDateKorean } from '@/lib/date';

/**
 * Gmail SMTP 트랜스포터를 생성한다.
 * @returns nodemailer 트랜스포터 인스턴스
 */
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
  });
}

/**
 * 브리핑을 HTML 뉴스레터 형식으로 이메일 발송한다.
 * @param date - 브리핑 날짜 (YYYY-MM-DD)
 * @param articles - 기사 배열
 * @returns 발송 성공 여부
 */
export async function sendBriefingEmail(
  date: string,
  articles: Article[]
): Promise<boolean> {
  const transporter = createTransporter();
  const html = generateEmailHtml(date, articles);

  const mailOptions = {
    from: `"Daily News Briefing" <${process.env.GMAIL_USER}>`,
    to: process.env.EMAIL_TO || 'kindapie@naver.com',
    subject: `[뉴스 브리핑] ${formatDateKorean(date)}`,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('이메일 발송 실패:', error);
    return false;
  }
}

/**
 * 브리핑 데이터를 HTML 뉴스레터 형식으로 변환한다.
 * 인라인 CSS를 사용하여 이메일 클라이언트 호환성을 확보한다.
 * @param date - 브리핑 날짜
 * @param articles - 기사 배열
 * @returns HTML 문자열
 */
function generateEmailHtml(date: string, articles: Article[]): string {
  const groups = groupByCategory(articles);

  let sectionsHtml = '';
  for (const group of groups) {
    if (group.articles.length === 0) continue;

    let articlesHtml = '';
    for (const article of group.articles) {
      articlesHtml += `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
            <div style="font-family: 'Noto Serif KR', Georgia, serif; font-weight: bold; font-size: 14px; color: #1a1a1a; margin-bottom: 6px;">
              ${escapeHtml(article.title)}
            </div>
            ${
              article.summary_point1
                ? `<div style="font-size: 13px; color: #4a4a4a; line-height: 1.5; margin-bottom: 2px;">· ${escapeHtml(article.summary_point1)}</div>`
                : ''
            }
            ${
              article.summary_point2
                ? `<div style="font-size: 13px; color: #4a4a4a; line-height: 1.5; margin-bottom: 4px;">· ${escapeHtml(article.summary_point2)}</div>`
                : ''
            }
            <div style="font-size: 12px;">
              <a href="${escapeHtml(article.url)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(article.url)}</a>
            </div>
          </td>
        </tr>`;
    }

    sectionsHtml += `
      <tr>
        <td style="padding: 20px 0 8px 0;">
          <div style="font-family: 'Noto Serif KR', Georgia, serif; font-size: 16px; font-weight: bold; color: #8b0000; border-bottom: 2px solid #8b0000; padding-bottom: 4px;">
            ${CATEGORY_LABELS[group.category]} (${group.articles.length}건)
          </div>
        </td>
      </tr>
      ${articlesHtml}`;
  }

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #faf9f6; font-family: 'Noto Sans KR', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf9f6;">
    <tr>
      <td align="center" style="padding: 20px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border: 1px solid #d4d0c8;">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 24px 16px; text-align: center; border-bottom: 3px double #d4d0c8;">
              <h1 style="margin: 0; font-family: 'Noto Serif KR', Georgia, serif; font-size: 24px; color: #1a1a1a;">
                Daily News Briefing
              </h1>
              <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">
                이커머스 · 유통 · AI · 가전 마켓 인텔리전스
              </p>
            </td>
          </tr>
          <!-- Date -->
          <tr>
            <td style="padding: 16px 24px 0;">
              <div style="font-family: 'Noto Serif KR', Georgia, serif; font-size: 18px; font-weight: bold; color: #1a1a1a;">
                ${formatDateKorean(date)}
              </div>
              <div style="font-size: 13px; color: #6b7280; margin-top: 2px;">
                총 ${articles.length}건의 뉴스
              </div>
              <hr style="border: none; border-top: 1px solid #d4d0c8; margin: 12px 0 0;">
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${sectionsHtml}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; text-align: center; border-top: 1px solid #d4d0c8; font-size: 11px; color: #9ca3af;">
              Daily News Briefing · 이커머스 전략팀
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * HTML 특수문자를 이스케이프한다.
 * @param text - 이스케이프할 텍스트
 * @returns 이스케이프된 텍스트
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
