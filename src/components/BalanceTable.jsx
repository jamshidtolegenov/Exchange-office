import React from 'react';
import { formatAmount, CURRENCIES } from '../utils/currency';

export default function BalanceTable({ balances, cityName }) {
  return (
    <div className="card">
      <div className="card-title">Остатки кассы{cityName ? ` — ${cityName}` : ''}</div>
      <div className="balance-grid">
        {CURRENCIES.map(cur => (
          <div className="balance-item" key={cur}>
            <div className="balance-currency">{cur}</div>
            <div className="balance-amount">{formatAmount(balances[cur] ?? 0, cur)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
