import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { FOREIGN_CURRENCIES, CURRENCY_LABELS, CURRENCY_FLAGS } from '../utils/currency';

function parseRate(rates, cur) {
  const r = rates[cur];
  if (!r) return { buy: '', sell: '' };
  if (typeof r === 'number') return { buy: String(r), sell: String(r) };
  return { buy: String(r.buy), sell: String(r.sell) };
}

export default function RatesEditor({ onClose }) {
  const { rates, setRates } = useData();

  const [fields, setFields] = useState(() => {
    const init = {};
    for (const cur of FOREIGN_CURRENCIES) init[cur] = parseRate(rates, cur);
    return init;
  });

  const [msg,     setMsg]     = useState(null);
  const [loading, setLoading] = useState(false);

  const setField = (cur, side, val) => {
    setFields(f => ({ ...f, [cur]: { ...f[cur], [side]: val } }));
    setMsg(null);
  };

  const handleSave = async () => {
    const newRates = {};
    const errors   = [];

    for (const cur of FOREIGN_CURRENCIES) {
      const buy  = parseFloat(fields[cur].buy);
      const sell = parseFloat(fields[cur].sell);
      if (isNaN(buy)  || buy  <= 0) { errors.push(`${cur}: введите курс покупки > 0`);  continue; }
      if (isNaN(sell) || sell <= 0) { errors.push(`${cur}: введите курс продажи > 0`); continue; }
      if (buy > sell) { errors.push(`${cur}: курс покупки не может быть выше курса продажи`); continue; }
      newRates[cur] = { buy, sell };
    }

    if (errors.length) { setMsg({ ok:false, text: errors.join(' • ') }); return; }

    setLoading(true);
    const result = await setRates(newRates);
    setLoading(false);

    if (result.ok) {
      setMsg({ ok:true, text:'Курсы обновлены' });
      setTimeout(onClose, 900);
    } else {
      setMsg({ ok:false, text: result.error });
    }
  };

  return (
    <div className="card" style={{ borderColor:'var(--yellow-border)', background:'var(--yellow-bg)' }}>
      <div className="card-title">Изменить курсы валют</div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'1rem' }}>
        {FOREIGN_CURRENCIES.map(cur => (
          <div key={cur} style={{ background:'var(--bg-card)', borderRadius:'var(--radius)', padding:'0.875rem', border:'1px solid var(--border)' }}>
            <div style={{ fontWeight:600, fontSize:13, marginBottom:10 }}>
              {CURRENCY_FLAGS[cur]} {cur} — {CURRENCY_LABELS[cur]}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <div>
                <div className="label" style={{ color:'var(--green-text)' }}>↑ Курс покупки (KZT)</div>
                <input
                  type="number" min="0" step="0.0001" className="input input-lg"
                  value={fields[cur].buy}
                  onChange={e => setField(cur, 'buy', e.target.value)}
                  disabled={loading}
                  style={{ borderColor: parseFloat(fields[cur].buy) > parseFloat(fields[cur].sell) ? 'var(--red)' : '' }}
                />
                <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:3 }}>
                  Мы покупаем у клиента
                </div>
              </div>
              <div>
                <div className="label" style={{ color:'var(--red-text)' }}>↓ Курс продажи (KZT)</div>
                <input
                  type="number" min="0" step="0.0001" className="input input-lg"
                  value={fields[cur].sell}
                  onChange={e => setField(cur, 'sell', e.target.value)}
                  disabled={loading}
                />
                <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:3 }}>
                  Мы продаём клиенту
                </div>
              </div>
            </div>
            {/* Spread indicator */}
            {fields[cur].buy && fields[cur].sell && (() => {
              const b = parseFloat(fields[cur].buy), s = parseFloat(fields[cur].sell);
              if (!isNaN(b) && !isNaN(s) && s > b) {
                const spread = ((s - b) / ((s + b) / 2) * 100).toFixed(2);
                return <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:6 }}>Спред: {spread}%</div>;
              }
              return null;
            })()}
          </div>
        ))}
      </div>

      <div style={{ marginTop:'1rem', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={loading}>
          {loading ? 'Сохраняем...' : 'Сохранить курсы'}
        </button>
        <button className="btn btn-sm" onClick={onClose} disabled={loading}>Отмена</button>
        {msg && <span className={`msg ${msg.ok ? 'msg-ok' : 'msg-err'}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
