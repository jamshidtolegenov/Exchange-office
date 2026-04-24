import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  formatAmount, FOREIGN_CURRENCIES, CURRENCY_LABELS, CURRENCY_FLAGS,
} from '../utils/currency';

export default function OperationForm({ city }) {
  const { rates, doOperation } = useData();
  const { user }               = useAuth();

  const [opType,   setOpType]   = useState('sell');
  const [currency, setCurrency] = useState('USD');
  const [amount,   setAmount]   = useState('');
  const [msg,      setMsg]      = useState(null);
  const [loading,  setLoading]  = useState(false);

  const amt       = parseFloat(amount) || 0;
  const rateObj   = rates[currency] || {};
  const buyRate   = typeof rateObj === 'object' ? rateObj.buy  : rateObj;
  const sellRate  = typeof rateObj === 'object' ? rateObj.sell : rateObj;
  const appliedRate = opType === 'sell' ? sellRate : buyRate;
  const kzt       = amt * (appliedRate || 0);

  const preview = useMemo(() => {
    if (!amt) return null;
    if (opType === 'sell') return `${formatAmount(kzt,'KZT')} KZT → ${formatAmount(amt,currency)} ${currency}`;
    return `${formatAmount(amt,currency)} ${currency} → ${formatAmount(kzt,'KZT')} KZT`;
  }, [amt, opType, currency, kzt]);

  const handleSubmit = async () => {
    if (!amt || amt <= 0) { setMsg({ ok:false, text:'Введите корректную сумму' }); return; }
    setLoading(true);
    const result = await doOperation({ city, opType, currency, amount:amt, operator:user.login });
    setLoading(false);
    if (result.ok) {
      setMsg({ ok:true, text: opType==='sell'
        ? `✓ Продано: ${formatAmount(amt,currency)} ${currency} → ${formatAmount(result.kzt,'KZT')} KZT`
        : `✓ Куплено: ${formatAmount(amt,currency)} ${currency} → ${formatAmount(result.kzt,'KZT')} KZT`
      });
      setAmount('');
      setTimeout(() => setMsg(null), 4000);
    } else {
      setMsg({ ok:false, text:result.error });
    }
  };

  const isSell = opType === 'sell';

  return (
    <div className="card">
      <div className="card-title">Провести операцию</div>
      <div className="op-grid">

        {/* Type selector */}
        <div>
          <div className="label">Тип операции</div>
          <div className="radio-group">
            {[
              { value:'sell', label:'Продажа клиенту',   hint:'Клиент получает валюту'   },
              { value:'buy',  label:'Покупка у клиента',  hint:'Клиент сдаёт валюту'      },
            ].map(opt => (
              <label key={opt.value}
                className={`radio-option${opType===opt.value?' active':''}`}
                onClick={() => { setOpType(opt.value); setMsg(null); }}
              >
                <input type="radio" name="optype" value={opt.value}
                  checked={opType===opt.value} onChange={()=>{}} />
                <span>
                  <span style={{ display:'block' }}>{opt.label}</span>
                  <span style={{ fontSize:11, color:'var(--text-faint)', fontWeight:400 }}>{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Currency + active rate badge */}
        <div>
          <div className="label">Валюта</div>
          <select className="input" value={currency}
            onChange={e => { setCurrency(e.target.value); setMsg(null); }}
            disabled={loading}
          >
            {FOREIGN_CURRENCIES.map(cur => {
              const r  = rates[cur] || {};
              const b  = typeof r==='object' ? r.buy  : r;
              const s  = typeof r==='object' ? r.sell : r;
              return (
                <option key={cur} value={cur}>
                  {CURRENCY_FLAGS[cur]} {cur} — {CURRENCY_LABELS[cur]}
                </option>
              );
            })}
          </select>

          {/* Rate display block — shows which rate is active */}
          {rates[currency] && (
            <div style={{ marginTop:8, display:'flex', gap:8, flexWrap:'wrap' }}>
              <div style={{
                padding:'5px 10px', borderRadius:'var(--radius-sm)', fontSize:12, fontWeight:600,
                background: isSell ? 'var(--red-bg)' : 'var(--bg-muted)',
                color:      isSell ? 'var(--red-text)' : 'var(--text-faint)',
                border:     isSell ? '1px solid #fca5a5' : '1px solid var(--border)',
              }}>
                ↓ Продажа: {formatAmount(sellRate,'KZT')} KZT
                {isSell && <span style={{ marginLeft:4 }}>← применяется</span>}
              </div>
              <div style={{
                padding:'5px 10px', borderRadius:'var(--radius-sm)', fontSize:12, fontWeight:600,
                background: !isSell ? 'var(--green-bg)' : 'var(--bg-muted)',
                color:      !isSell ? 'var(--green-text)' : 'var(--text-faint)',
                border:     !isSell ? '1px solid #86efac' : '1px solid var(--border)',
              }}>
                ↑ Покупка: {formatAmount(buyRate,'KZT')} KZT
                {!isSell && <span style={{ marginLeft:4 }}>← применяется</span>}
              </div>
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <div className="label">Сумма в {CURRENCY_FLAGS[currency]} {currency}</div>
          <input
            type="number" min="0" step="any" className="input input-lg"
            placeholder="0.00" value={amount}
            onChange={e => { setAmount(e.target.value); setMsg(null); }}
            onKeyDown={e => e.key==='Enter' && handleSubmit()}
            disabled={loading}
          />
        </div>

        {/* Result preview */}
        <div className="result-box">
          <div className="result-label">
            {isSell
              ? `Клиент отдаёт KZT — получает ${currency}`
              : `Клиент отдаёт ${currency} — получает KZT`
            }
          </div>
          <div className="result-amount">{preview || '—'}</div>
          {amt > 0 && appliedRate > 0 && (
            <div className="result-rate">
              Курс {isSell ? 'продажи' : 'покупки'}: 1 {currency} = {formatAmount(appliedRate,'KZT')} KZT
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="op-grid-full" style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
          <button className="btn btn-success" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Обработка...' : 'Провести операцию'}
          </button>
          {msg && <span className={`msg ${msg.ok?'msg-ok':'msg-err'}`}>{msg.text}</span>}
        </div>
      </div>
    </div>
  );
}
