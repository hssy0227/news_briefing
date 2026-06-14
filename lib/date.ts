/**
 * KST(한국 표준시) 날짜 유틸리티 모듈
 */

/**
 * 현재 KST 날짜를 YYYY-MM-DD 형식으로 반환한다.
 * @returns KST 기준 오늘 날짜 문자열
 */
export function getTodayKST(): string {
  const now = new Date();
  const kstOffset = 9 * 60;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const kstDate = new Date(utcMs + kstOffset * 60 * 1000);
  return formatDate(kstDate);
}

/**
 * Date 객체를 YYYY-MM-DD 형식으로 변환한다.
 * @param date - 변환할 Date 객체
 * @returns YYYY-MM-DD 형식 문자열
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 날짜 문자열을 한국어 표시 형식으로 변환한다.
 * @param dateStr - YYYY-MM-DD 형식 날짜 문자열
 * @returns "2024년 1월 15일 (월)" 형식 문자열
 */
export function formatDateKorean(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00+09:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = days[date.getDay()];
  return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
}

/**
 * 날짜 문자열이 유효한 YYYY-MM-DD 형식인지 검증한다.
 * @param dateStr - 검증할 날짜 문자열
 * @returns 유효 여부
 */
export function isValidDateString(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * 주어진 날짜로부터 N일 전 날짜를 반환한다.
 * @param dateStr - 기준 날짜 (YYYY-MM-DD)
 * @param days - 이전 일수
 * @returns YYYY-MM-DD 형식 문자열
 */
export function subtractDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00+09:00');
  date.setDate(date.getDate() - days);
  return formatDate(date);
}
