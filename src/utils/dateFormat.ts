import { format, formatDistanceToNow, isSameYear, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';

export const formatDateTime = (dateString: string | number) => {
  try {
    const now = new Date();
    const date = new Date(dateString);

    // 같은 날인 경우: 상대적 시간으로 표시
    if (isSameDay(date, now)) {
      return formatDistanceToNow(date, { addSuffix: true, locale: ko });
    }

    // 같은 연도인 경우: "MM.dd HH:mm" 형식
    if (isSameYear(date, now)) {
      return format(date, 'MM월 dd일 (E) HH:mm', { locale: ko });
    }

    // 다른 연도인 경우: "yyyy.MM.dd HH:mm" 형식
    return format(date, 'yyyy년 MM월 dd일 HH:mm', { locale: ko });
  } catch (error) {
    console.error('Date formatting error:', error);
    return dateString;
  }
};
