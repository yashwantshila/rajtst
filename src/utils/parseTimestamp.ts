export const parseTimestamp = (value: any): Date => {
  if (!value) return new Date(NaN);
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') return value.toDate();
    if (value._seconds !== undefined) return new Date(value._seconds * 1000);
  }
  return new Date(value);
};
