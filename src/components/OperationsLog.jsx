import React from 'react';
import { formatAmount, CITY_NAMES } from '../utils/currency';

export default function OperationsLog({ ops, showCity = false, limit = 30 }) {
  // Backend already returns ops newest-first; we just slice here
  const rows = [...ops].slice(0, limit);

  if (!rows.length) {
    return (
      <div className="card">
        <div className="card-title">Последние операции</div>
        <div className="empty">Операций пока нет</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">Последние операции</div>
      <div style={{ overflowX: 'auto' }}>
        <table className="ops-table">
          <thead>
            <tr>
              <th>Время</th>
              {showCity && <th>Город</th>}
              <th>Тип</th>
              <th>Валюта</th>
              <th className="num">Сумма</th>
              <th className="num">KZT</th>
              <th className="num">Курс</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(op => (
              <tr key={op.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{op.time}</td>
                {showCity && <td>{CITY_NAMES[op.city] || op.city}</td>}
                <td>
                  <span className={`tag ${op.type === 'buy' ? 'tag-buy' : 'tag-sell'}`}>
                    {op.type === 'buy' ? 'ПОКУПКА' : 'ПРОДАЖА'}
                  </span>
                </td>
                <td><strong>{op.currency}</strong></td>
                <td className="num">{formatAmount(op.amountCur, op.currency)}</td>
                <td className="num">{formatAmount(op.amountKZT, 'KZT')}</td>
                <td className="num" style={{ color: 'var(--text-faint)' }}>
                  {formatAmount(op.rate, 'KZT')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
