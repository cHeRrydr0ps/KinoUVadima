// Small helpers used inside AdminPanel to avoid .map on non-arrays
export const asArray = <T,>(x:any): T[] => Array.isArray(x) ? x as T[] : [];
