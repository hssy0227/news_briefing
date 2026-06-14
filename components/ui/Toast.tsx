'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

/**
 * 토스트 알림 컴포넌트
 * 지정된 시간(기본 3초) 후 자동으로 사라진다.
 * @param message - 알림 메시지
 * @param type - 알림 유형
 * @param onClose - 닫기 핸들러
 * @param duration - 표시 시간 (ms)
 */
export default function Toast({
  message,
  type,
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColor = {
    success: 'bg-green-50 border-green-300 text-green-800',
    error: 'bg-red-50 border-red-300 text-red-800',
    info: 'bg-blue-50 border-blue-300 text-blue-800',
  }[type];

  return (
    <div className="fixed bottom-4 right-4 z-50 toast-enter">
      <div
        className={`px-4 py-3 rounded border shadow-lg text-sm flex items-center gap-2 ${bgColor}`}
      >
        <span>{message}</span>
        <button
          onClick={onClose}
          className="ml-2 opacity-60 hover:opacity-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
