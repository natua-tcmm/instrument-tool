export const $ = id => document.getElementById(id);

export const fmt = (value, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '—');

export const secure = () => location.protocol === 'https:' || location.hostname === 'localhost';

export const MS_TO_KTS = 1.9438444924;
export const MS_TO_KMH = 3.6;
export const M_TO_FT = 3.280839895;
