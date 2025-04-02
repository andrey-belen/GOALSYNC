export const getWeekDates = (date: Date): string[] => {
  const weekDates = [];
  const today = new Date(date);
  
  // Start from today
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + i);
    weekDates.push(currentDate.toISOString().split('T')[0]);
  }

  return weekDates;
};

export const getDayName = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

export const getMonthDay = (dateString: string): number => {
  const date = new Date(dateString);
  return date.getDate();
};

export const getMonthName = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'long' });
};

export const getDateRangeText = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth && sameYear) {
    return `${getMonthName(startDate)} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
  } else if (sameYear) {
    return `${getMonthName(startDate)} ${start.getDate()} - ${getMonthName(endDate)} ${end.getDate()}, ${start.getFullYear()}`;
  } else {
    return `${getMonthName(startDate)} ${start.getDate()}, ${start.getFullYear()} - ${getMonthName(endDate)} ${end.getDate()}, ${end.getFullYear()}`;
  }
};

export const startOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

export const endOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
}; 