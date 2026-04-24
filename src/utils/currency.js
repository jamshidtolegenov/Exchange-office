export const CITY_NAMES = {
  shymkent: 'Шымкент',
  almaty:   'Алматы',
  moscow:   'Москва',
  tashkent: 'Ташкент',
};

export const CURRENCIES         = ['KZT','USD','RUB','UZS','EUR'];
export const FOREIGN_CURRENCIES = ['USD','RUB','UZS','EUR'];

export const CURRENCY_LABELS = {
  KZT: 'Казахстанский тенге',
  USD: 'Доллар США',
  RUB: 'Российский рубль',
  UZS: 'Узбекский сум',
  EUR: 'Евро',
};

export const CURRENCY_FLAGS = {
  USD: '🇺🇸', RUB: '🇷🇺', UZS: '🇺🇿', EUR: '🇪🇺', KZT: '🇰🇿',
};

/**
 * rates shape: { USD:{buy,sell}, RUB:{buy,sell}, UZS:{buy,sell}, EUR:{buy,sell} }
 * opType: 'sell' → use sell rate (we sell currency to client)
 *         'buy'  → use buy  rate (we buy  currency from client)
 */
export function getAppliedRate(rates, currency, opType) {
  const r = rates[currency];
  if (!r) return 0;
  if (typeof r === 'number') return r; // legacy fallback
  return opType === 'sell' ? r.sell : r.buy;
}

export function formatAmount(n, currency) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  if (currency === 'UZS') return Math.round(n).toLocaleString('ru-RU');
  return Number(n).toLocaleString('ru-RU', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

export function exportToCSV(ops, filterCity, filterDate) {
  const filtered = ops.filter(o => {
    if (filterCity && o.city !== filterCity) return false;
    if (filterDate && !o.isoDate.startsWith(filterDate)) return false;
    return true;
  });
  const header = 'ID,Время,Дата,Город,Тип,Валюта,Сумма,KZT,Курс покупки,Курс продажи,Применён курс,Оператор\n';
  const rows = filtered.map(o => [
    o.id, o.time, o.isoDate||'',
    CITY_NAMES[o.city]||o.city,
    o.type==='buy' ? 'Покупка' : 'Продажа',
    o.currency, o.amountCur, o.amountKZT,
    o.rateBuy||'', o.rateSell||'', o.rate,
    o.operator||'',
  ].join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+header+rows], { type:'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download=`operations_${filterDate||'all'}_${filterCity||'all'}.csv`; a.click();
  URL.revokeObjectURL(url);
}
