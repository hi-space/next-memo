import { format } from "date-fns";
import { ko } from "date-fns/locale";

export const formatDateTime = (dateString: string) => {
  try {
    return format(new Date(dateString), "yyyy/MM/dd HH:mm:ss", { locale: ko });
  } catch (error) {
    console.error("Date formatting error:", error);
    return dateString;
  }
};
