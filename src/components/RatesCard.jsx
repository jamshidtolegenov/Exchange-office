import React from 'react';
import { formatAmount, FOREIGN_CURRENCIES, CURRENCY_FLAGS, CURRENCY_LABELS } from '../utils/currency';

export default function RatesCard({ rates }) {
  return (
    <div className="card">
      <div className="card-title">Текущие курсы (к KZT)</div>
      <div className="rates-row">
        {FOREIGN_CURRENCIES.map(cur => {
          const r = rates[cur];
          if (!r) return null;
          const buy  = typeof r === 'object' ? r.buy  : r;
          const sell = typeof r === 'object' ? r.sell : r;
          return (
            <div className="rates-item" key={cur} style={{ display:'flex', flexDirection:'column', gap:2 }}>
              <span style={{ fontSize:12, color:'var(--text-faint)', fontWeight:700, letterSpacing:'0.04em' }}>
                {CURRENCY_FLAGS[cur]} {cur} — {CURRENCY_LABELS[cur]}
              </span>
              <span style={{ display:'flex', gap:12 }}>
                <span style={{ color:'var(--green-text)', fontSize:13 }}>
                  ↑ покупка: <strong>{formatAmount(buy, 'KZT')}</strong>
                </span>
                <span style={{ color:'var(--red-text)', fontSize:13 }}>
                  ↓ продажа: <strong>{formatAmount(sell, 'KZT')}</strong>
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
