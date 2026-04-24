import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import Navbar from '../components/Navbar';
import RatesCard from '../components/RatesCard';
import RatesEditor from '../components/RatesEditor';
import { formatAmount, CITY_NAMES, CURRENCIES, FOREIGN_CURRENCIES, CURRENCY_FLAGS, CURRENCY_LABELS, exportToCSV } from '../utils/currency';

/* ─── 1. БАЛАНСЫ ────────────────────────────────────────────────────────── */
function BalancesPanel({ balances, editBalance }) {
  const [editingCity, setEditingCity] = useState(null);
  const [editValues,  setEditValues]  = useState({});
  const [comment,     setComment]     = useState('');
  const [saving,      setSaving]      = useState(false);
  const [msg,         setMsg]         = useState(null);

  const totals = useMemo(() => {
    const t = { KZT: 0, USD: 0, RUB: 0, UZS: 0, EUR: 0 };
    Object.values(balances).forEach(b => CURRENCIES.forEach(c => { t[c] += (b[c] || 0); }));
    return t;
  }, [balances]);

  const startEdit = (cityId) => {
    const b = balances[cityId] || { KZT: 0, USD: 0, RUB: 0, UZS: 0, EUR: 0 };
    setEditValues({ KZT: String(b.KZT), USD: String(b.USD), RUB: String(b.RUB), UZS: String(b.UZS), EUR: String(b.EUR ?? 0) });
    setComment(''); setMsg(null); setEditingCity(cityId);
  };
  const cancelEdit = () => { setEditingCity(null); setMsg(null); };
  const saveEdit = async () => {
    setSaving(true);
    const newValues = {};
    for (const [k, v] of Object.entries(editValues)) newValues[k] = Number(v);
    const result = await editBalance(editingCity, newValues, comment);
    setSaving(false);
    if (result.ok) {
      setMsg({ ok: true, text: `Сохранено (${result.logEntries?.length || 0} изм.)` });
      setTimeout(() => { setEditingCity(null); setMsg(null); }, 1200);
    } else setMsg({ ok: false, text: result.error });
  };

  const isChanged = (city, cur) =>
    editingCity === city && editValues[cur] !== undefined &&
    Number(editValues[cur]) !== (balances[city]?.[cur] ?? 0);

  return (
    <>
      <div className="card">
        <div className="card-title">Сводный баланс — все пункты</div>
        <div className="balance-grid">
          {CURRENCIES.map(cur => (
            <div className="balance-item" key={cur}>
              <div className="balance-currency">{cur}</div>
              <div className="balance-amount">{formatAmount(totals[cur], cur)}</div>
              <div className="balance-sub">итого</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-title">Балансы по городам</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="summary-table">
            <thead>
              <tr>
                <th>Город</th>
                {CURRENCIES.map(c => <th key={c}>{c}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(CITY_NAMES).map(([id, name]) => {
                const b = balances[id] || { KZT: 0, USD: 0, RUB: 0, UZS: 0, EUR: 0 };
                const isEditing = editingCity === id;
                return (
                  <React.Fragment key={id}>
                    <tr>
                      <td style={{ fontWeight: 600 }}>{name}</td>
                      {CURRENCIES.map(cur => <td key={cur}>{formatAmount(b[cur], cur)}</td>)}
                      <td>
                        <button className="btn btn-sm" style={{ fontSize: 12 }}
                          onClick={() => isEditing ? cancelEdit() : startEdit(id)}>
                          {isEditing ? '✕ Отмена' : '✏ Изменить'}
                        </button>
                      </td>
                    </tr>
                    {isEditing && (
                      <tr>
                        <td colSpan={7} style={{ padding: '12px 10px', background: '#fffbeb', borderBottom: '2px solid #f59e0b' }}>
                          <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Редактирование — {name}</div>
                          <div className="bal-edit-grid" style={{ marginBottom: 10 }}>
                            {CURRENCIES.map(cur => (
                              <div className="bal-edit-item" key={cur}>
                                <label>{cur}</label>
                                <input type="number" min="0" step="any"
                                  className={isChanged(id, cur) ? 'changed' : ''}
                                  value={editValues[cur] ?? ''}
                                  onChange={e => setEditValues(v => ({ ...v, [cur]: e.target.value }))} />
                              </div>
                            ))}
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <div className="label">Комментарий (причина)</div>
                            <input className="input" type="text" placeholder="инкассация, пополнение..."
                              value={comment} onChange={e => setComment(e.target.value)} />
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={saving}>
                              {saving ? 'Сохраняем...' : 'Сохранить'}
                            </button>
                            <button className="btn btn-sm" onClick={cancelEdit}>Отмена</button>
                            {msg && <span className={`msg ${msg.ok ? 'msg-ok' : 'msg-err'}`}>{msg.text}</span>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              <tr className="total-row">
                <td>ИТОГО</td>
                {CURRENCIES.map(cur => <td key={cur}>{formatAmount(totals[cur], cur)}</td>)}
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ─── 2. ЖУРНАЛ ОПЕРАЦИЙ ────────────────────────────────────────────────── */
function OpsPanel({ ops, reloadOps }) {
  const [filterCity,     setFilterCity]     = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo,   setFilterDateTo]   = useState('');
  const [filterType,     setFilterType]     = useState('');
  const [filterCur,      setFilterCur]      = useState('');
  const [loading,        setLoading]        = useState(false);

  // local (type + currency) filters applied on top of server result
  const filtered = useMemo(() => {
    let res = [...ops];
    if (filterType) res = res.filter(o => o.type === filterType);
    if (filterCur)  res = res.filter(o => o.currency === filterCur);
    return res;
  }, [ops, filterType, filterCur]);

  const applyServer = async () => {
    setLoading(true);
    // FIX: pass undefined (not '') — cleanParams in api.js strips them
    await reloadOps({
      city:     filterCity     || undefined,
      dateFrom: filterDateFrom || undefined,
      dateTo:   filterDateTo   || undefined,
      limit: 500,
    });
    setLoading(false);
  };

  const resetAll = async () => {
    setFilterCity(''); setFilterDateFrom(''); setFilterDateTo('');
    setFilterType(''); setFilterCur('');
    setLoading(true);
    await reloadOps({ limit: 500 });
    setLoading(false);
  };

  return (
    <div className="card">
      <div className="card-title">Журнал операций — все пункты</div>
      <div className="filter-row">
        <select className="input" value={filterCity} onChange={e => setFilterCity(e.target.value)}>
          <option value="">Все города</option>
          {Object.entries(CITY_NAMES).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
        <input type="date" className="input" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
        <span style={{ alignSelf: 'center', color: 'var(--text-faint)', fontSize: 12 }}>—</span>
        <input type="date" className="input" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
        <button className="btn btn-sm" onClick={applyServer} disabled={loading}>{loading ? '...' : 'Применить'}</button>
        <button className="btn btn-sm" onClick={resetAll} disabled={loading}>Сброс</button>
        <button className="btn btn-sm btn-primary" onClick={() => exportToCSV(filtered, filterCity, filterDateFrom)}>Экспорт CSV</button>
      </div>
      <div className="filter-row" style={{ marginBottom: '1rem' }}>
        <select className="input" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Все типы</option>
          <option value="sell">Продажа</option>
          <option value="buy">Покупка</option>
        </select>
        <select className="input" value={filterCur} onChange={e => setFilterCur(e.target.value)}>
          <option value="">Все валюты</option>
          {['USD','RUB','UZS','EUR'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-faint)', alignSelf: 'center' }}>
          {filtered.length} из {ops.length} записей
        </span>
      </div>
      {filtered.length === 0 ? (
        <div className="empty">Нет операций по заданным фильтрам</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="ops-table">
            <thead>
              <tr>
                <th>Время</th><th>Город</th><th>Тип</th><th>Валюта</th>
                <th className="num">Сумма</th><th className="num">KZT</th>
                <th className="num">Курс</th><th>Оператор</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(op => (
                <tr key={op.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{op.time}</td>
                  <td>{CITY_NAMES[op.city] || op.city}</td>
                  <td><span className={`tag ${op.type === 'buy' ? 'tag-buy' : 'tag-sell'}`}>
                    {op.type === 'buy' ? 'ПОКУПКА' : 'ПРОДАЖА'}
                  </span></td>
                  <td><strong>{op.currency}</strong></td>
                  <td className="num">{formatAmount(op.amountCur, op.currency)}</td>
                  <td className="num">{formatAmount(op.amountKZT, 'KZT')}</td>
                  <td className="num" style={{ color: 'var(--text-faint)' }}>{formatAmount(op.rate, 'KZT')}</td>
                  <td style={{ color: 'var(--text-faint)' }}>{op.operator}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── 3. ИСТОРИЯ БАЛАНСОВ ───────────────────────────────────────────────── */
function BalanceLogsPanel({ balanceLogs, reloadBalanceLogs }) {
  const [filterCity, setFilterCity] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [loading, setLoading] = useState(false);

  const apply = async () => {
    setLoading(true);
    await reloadBalanceLogs({ city: filterCity || undefined, dateFrom: filterDate || undefined, dateTo: filterDate || undefined });
    setLoading(false);
  };
  const reset = async () => {
    setFilterCity(''); setFilterDate('');
    setLoading(true); await reloadBalanceLogs(); setLoading(false);
  };

  return (
    <div className="card">
      <div className="card-title">История изменений балансов</div>
      <div className="filter-row" style={{ marginBottom: '1rem' }}>
        <select className="input" value={filterCity} onChange={e => setFilterCity(e.target.value)}>
          <option value="">Все города</option>
          {Object.entries(CITY_NAMES).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
        <input type="date" className="input" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        <button className="btn btn-sm" onClick={apply} disabled={loading}>{loading ? '...' : 'Применить'}</button>
        <button className="btn btn-sm" onClick={reset} disabled={loading}>Сброс</button>
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{balanceLogs.length} записей</span>
      </div>
      {balanceLogs.length === 0 ? <div className="empty">Изменений пока нет</div> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="ops-table">
            <thead><tr><th>Время</th><th>Город</th><th>Оператор</th><th>Изменения</th><th>Комментарий</th></tr></thead>
            <tbody>
              {balanceLogs.map(log => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{log.time}</td>
                  <td>{CITY_NAMES[log.city] || log.city}</td>
                  <td style={{ color: 'var(--text-faint)' }}>{log.operator}</td>
                  <td>
                    {log.changes.map((ch, i) => (
                      <span key={i} className="log-change">
                        <strong>{ch.currency}:</strong>
                        <span className="log-old">{formatAmount(ch.oldVal, ch.currency)}</span>
                        <span className="log-arrow">→</span>
                        <span className="log-new">{formatAmount(ch.newVal, ch.currency)}</span>
                      </span>
                    ))}
                  </td>
                  <td style={{ color: 'var(--text-faint)', fontSize: 12 }}>{log.comment || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── 4. ИСТОРИЯ КУРСОВ ─────────────────────────────────────────────────── */
function RateLogsPanel({ rateLogs, reloadRateLogs }) {
  const [filterDate, setFilterDate] = useState('');
  const [loading, setLoading] = useState(false);

  const apply = async () => {
    setLoading(true);
    await reloadRateLogs({ dateFrom: filterDate || undefined, dateTo: filterDate || undefined });
    setLoading(false);
  };
  const reset = async () => {
    setFilterDate('');
    setLoading(true); await reloadRateLogs(); setLoading(false);
  };

  return (
    <div className="card">
      <div className="card-title">История изменений курсов валют</div>
      <div className="filter-row" style={{ marginBottom: '1rem' }}>
        <input type="date" className="input" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        <button className="btn btn-sm" onClick={apply} disabled={loading}>{loading ? '...' : 'Применить'}</button>
        <button className="btn btn-sm" onClick={reset} disabled={loading}>Сброс</button>
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{rateLogs.length} записей</span>
      </div>
      {rateLogs.length === 0 ? <div className="empty">Изменений курсов пока нет</div> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="ops-table">
            <thead><tr><th>Время</th><th>Оператор</th><th>Изменения курсов</th></tr></thead>
            <tbody>
              {rateLogs.map(log => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{log.time}</td>
                  <td style={{ color: 'var(--text-faint)' }}>{log.operator}</td>
                  <td>
                    {log.changes.map((ch, i) => (
                      <span key={i} className="log-change" style={{ display:'inline-flex', flexDirection:'column', gap:2, marginRight:12 }}>
                        <strong style={{ fontSize:12 }}>{ch.currency}</strong>
                        <span style={{ fontSize:11 }}>
                          <span style={{ color:'var(--green-text)' }}>
                            покупка: <span className="log-old">{ch.oldBuy}</span><span className="log-arrow"> → </span><span className="log-new">{ch.newBuy}</span>
                          </span>
                          {' · '}
                          <span style={{ color:'var(--red-text)' }}>
                            продажа: <span className="log-old">{ch.oldSell}</span><span className="log-arrow"> → </span><span className="log-new">{ch.newSell}</span>
                          </span>
                        </span>
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── helpers ──────────────────────────────────────────────────────────── */
const CITY_COLORS_ARR = ['#6366f1','#f59e0b','#10b981','#ef4444'];
const CUR_COLORS_MAP  = { USD:'#3b82f6', RUB:'#8b5cf6', UZS:'#f97316', EUR:'#0ea5e9' };

function KpiCard({ label, value, sub, accent, icon }) {
  return (
    <div className="kpi-card" style={accent ? { borderTop:`3px solid ${accent}` } : {}}>
      <div className="kpi-label">{icon} {label}</div>
      <div className="kpi-value" style={{ fontSize: String(value).length > 12 ? 14 : String(value).length > 8 ? 17 : 22 }}>
        {value}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

/** Stacked bar chart: two series (volume + profit) per bar */
function StackedBar({ data, height = 160 }) {
  if (!data || !data.length) return <div className="empty">Нет данных</div>;
  const maxVol = Math.max(...data.map(d => d.volume || 0), 1);
  const maxPro = Math.max(...data.map(d => d.profit || 0), 1);
  const BAR_W  = Math.max(20, Math.min(48, Math.floor(300 / data.length) - 8));
  const W      = (BAR_W * 2 + 10) * data.length + 24;
  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Legend */}
      <div style={{ display:'flex', gap:16, marginBottom:8, fontSize:12 }}>
        <span><span style={{ display:'inline-block', width:10, height:10, background:'#6366f1', borderRadius:2, marginRight:4 }}/>Оборот KZT</span>
        <span><span style={{ display:'inline-block', width:10, height:10, background:'#10b981', borderRadius:2, marginRight:4 }}/>Прибыль KZT</span>
      </div>
      <svg width={W} height={height + 30} style={{ display:'block' }}>
        {[0, 0.5, 1].map(f => {
          const y = height - Math.round(f * height);
          return <line key={f} x1={0} y1={y} x2={W} y2={y} stroke="#eee" strokeWidth={1} />;
        })}
        {data.map((d, i) => {
          const volH = Math.max(2, Math.round(((d.volume||0) / maxVol) * height));
          const proH = Math.max(2, Math.round(((d.profit||0) / maxPro) * height));
          const x    = 12 + i * (BAR_W * 2 + 10);
          const lbl  = String(d.label || '');
          return (
            <g key={i}>
              <rect x={x} y={height-volH} width={BAR_W} height={volH} rx={2} fill="#6366f1" opacity={0.75}>
                <title>{lbl} оборот: {(d.volume||0).toLocaleString('ru-RU')} KZT</title>
              </rect>
              <rect x={x+BAR_W+2} y={height-proH} width={BAR_W} height={proH} rx={2} fill="#10b981" opacity={0.85}>
                <title>{lbl} прибыль: {(d.profit||0).toLocaleString('ru-RU')} KZT</title>
              </rect>
              <text x={x+BAR_W} y={height+14} textAnchor="middle" fontSize={9} fill="#aaa">
                {lbl.length > 6 ? lbl.slice(0,5)+'…' : lbl}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Horizontal bar */
function HBar({ items, valueKey='value', max: maxProp, color='#6366f1', formatVal }) {
  if (!items || !items.length) return <div className="empty">Нет данных</div>;
  const max = maxProp || Math.max(...items.map(d => d[valueKey] || 0), 1);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {items.map((d, i) => {
        const val = d[valueKey] || 0;
        const pct = Math.max(2, Math.round(val / max * 100));
        const clr = d.color || color;
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
            <div style={{ width:72, textAlign:'right', color:'var(--text-muted)', flexShrink:0, fontWeight:500 }}>
              {d.label}
            </div>
            <div style={{ flex:1, background:'var(--bg-muted)', borderRadius:4, height:18, overflow:'hidden' }}>
              <div style={{ width:pct+'%', height:'100%', background:clr, borderRadius:4,
                minWidth:2, opacity:0.82, transition:'width 0.4s ease' }} />
            </div>
            <div style={{ width:96, color:'var(--text-muted)', flexShrink:0, fontVariantNumeric:'tabular-nums' }}>
              {formatVal ? formatVal(val) : val.toLocaleString('ru-RU')}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Donut */
function Donut({ slices, size=110 }) {
  if (!slices || !slices.length) return null;
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (!total) return <div className="empty">Нет данных</div>;
  const cx=size/2, cy=size/2, r=size*0.38, inner=size*0.22;
  let angle = -Math.PI/2;
  const paths = slices.map(sl => {
    const frac = sl.value / total;
    const sa = angle; angle += frac * 2 * Math.PI; const ea = angle;
    const x1=cx+r*Math.cos(sa), y1=cy+r*Math.sin(sa);
    const x2=cx+r*Math.cos(ea), y2=cy+r*Math.sin(ea);
    const xi1=cx+inner*Math.cos(sa), yi1=cy+inner*Math.sin(sa);
    const xi2=cx+inner*Math.cos(ea), yi2=cy+inner*Math.sin(ea);
    const lg = frac > 0.5 ? 1 : 0;
    const d = `M${xi1},${yi1} L${x1},${y1} A${r},${r} 0 ${lg} 1 ${x2},${y2} L${xi2},${yi2} A${inner},${inner} 0 ${lg} 0 ${xi1},${yi1}Z`;
    return { d, pct: Math.round(frac*100), label: sl.label, color: sl.color };
  });
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
      <svg width={size} height={size} style={{ flexShrink:0 }}>
        {paths.map((p,i) => <path key={i} d={p.d} fill={p.color} opacity={0.85}><title>{p.label}: {p.pct}%</title></path>)}
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {slices.map((sl,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
            <span style={{ width:9, height:9, borderRadius:2, background:sl.color, flexShrink:0 }} />
            <span style={{ color:'var(--text-muted)' }}>{sl.label}</span>
            <span style={{ fontWeight:600, marginLeft:4 }}>{paths[i].pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 5. СТАТИСТИКА ─────────────────────────────────────────────────────── */
function StatsPanel({ stats, reloadStats }) {
  const [period,   setPeriod]   = useState('month'); // 'day'|'month'
  const [city,     setCity]     = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [loading,  setLoading]  = useState(false);

  const fmtKZT = v => {
    if (!v) return '0';
    if (v >= 1e6) return (v/1e6).toFixed(2) + ' M';
    return v.toLocaleString('ru-RU');
  };

  const applyFilter = async () => {
    setLoading(true);
    await reloadStats({ city:city||undefined, dateFrom:dateFrom||undefined, dateTo:dateTo||undefined });
    setLoading(false);
  };
  const resetFilter = async () => {
    setCity(''); setDateFrom(''); setDateTo('');
    setLoading(true); await reloadStats(); setLoading(false);
  };

  if (!stats) return (
    <div className="card"><div className="empty">Загрузка статистики...</div></div>
  );

  const {
    totalCount, totalVolume, totalProfit, avgVolume, avgProfit,
    byType, byCurrency, byCity, byDay, byMonth, topCity, topVolCity, topDay,
    rateStats,
  } = stats;

  // ── period data ───────────────────────────────────────────────────────────
  const periodRaw = period === 'day' ? byDay : byMonth;
  const periodArr = Object.entries(periodRaw || {})
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-16)
    .map(([label, d]) => ({
      label:  period === 'day' ? label.slice(5) : label,
      value:  d.volumeKZT || 0,
      profit: d.profit    || 0,
      count:  d.count     || 0,
      color:  '#6366f1',
    }));

  // ── city data ─────────────────────────────────────────────────────────────
  const cityArr = Object.entries(byCity || {})
    .sort((a, b) => b[1].profit - a[1].profit)
    .map(([id, d], i) => ({
      label:  CITY_NAMES[id] || id,
      id,
      value:  d.volumeKZT || 0,
      profit: d.profit    || 0,
      count:  d.count     || 0,
      color:  CITY_COLORS_ARR[i % CITY_COLORS_ARR.length],
    }));

  // ── currency data ─────────────────────────────────────────────────────────
  const curArr = Object.entries(byCurrency || {})
    .sort((a, b) => b[1].profit - a[1].profit)
    .map(([cur, d]) => ({
      label:  cur,
      value:  d.volumeKZT || 0,
      profit: d.profit    || 0,
      count:  d.count     || 0,
      color:  CUR_COLORS_MAP[cur] || '#888',
    }));

  const profitMargin = totalVolume ? ((totalProfit / totalVolume) * 100).toFixed(2) : '0';

  const cityProfitDonut = cityArr.map(d => ({ label: d.label, value: d.profit, color: d.color }));
  const curProfitDonut  = curArr.map(d  => ({ label: d.label, value: d.profit, color: d.color }));

  return (
    <>
      {/* ── Filter ─────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-title">Фильтр</div>
        <div className="filter-row">
          <select className="input" value={city} onChange={e => setCity(e.target.value)}>
            <option value="">Все города</option>
            {Object.entries(CITY_NAMES).map(([id,n]) => <option key={id} value={id}>{n}</option>)}
          </select>
          <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span style={{ alignSelf:'center', color:'var(--text-faint)', fontSize:12 }}>—</span>
          <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <button className="btn btn-sm" onClick={applyFilter} disabled={loading}>{loading ? '...' : 'Применить'}</button>
          <button className="btn btn-sm" onClick={resetFilter} disabled={loading}>Сброс</button>
        </div>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────────── */}
      <div className="stats-kpi-grid">
        <KpiCard icon="💸" label="Общая прибыль" value={fmtKZT(totalProfit) + ' KZT'}
          sub={`маржа ${profitMargin}%`} accent="#10b981" />
        <KpiCard icon="📈" label="Оборот KZT"
          value={fmtKZT(totalVolume) + ' KZT'} sub={`${totalCount} операций`} accent="#6366f1" />
        <KpiCard icon="🎯" label="Средняя прибыль / сделка"
          value={fmtKZT(avgProfit) + ' KZT'} sub={`ср. чек ${fmtKZT(avgVolume)} KZT`} />
        <KpiCard icon="🏆" label="Лучший день"
          value={topDay ? topDay.date : '—'}
          sub={topDay ? `${fmtKZT(topDay.profit)} KZT прибыль · ${topDay.count} сделок` : ''}
          accent="#f59e0b" />
      </div>

      {/* ── Profit by period (main chart) ──────────────────────────────── */}
      <div className="card">
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, flexWrap:'wrap' }}>
          <div className="card-title" style={{ margin:0 }}>
            Прибыль и оборот по {period === 'day' ? 'дням' : 'месяцам'}
          </div>
          <div className="filter-period-btns">
            <button className={period==='day'?'active':''} onClick={() => setPeriod('day')}>По дням</button>
            <button className={period==='month'?'active':''} onClick={() => setPeriod('month')}>По месяцам</button>
          </div>
          {periodArr.length > 0 && (
            <span style={{ fontSize:11, color:'var(--text-faint)' }}>
              Прибыль: {fmtKZT(periodArr.reduce((s,d) => s+d.profit, 0))} KZT
            </span>
          )}
        </div>
        {periodArr.length === 0
          ? <div className="empty">Нет данных. Проведите операции для отображения динамики.</div>
          : <StackedBar data={periodArr} height={170} />
        }
      </div>

      {/* ── City profit (main block) ────────────────────────────────────── */}
      <div className="card">
        <div className="card-title">💰 Прибыль по городам</div>

        {topCity && (
          <div style={{ marginBottom:14, padding:'10px 14px', background:'var(--green-bg)',
            borderRadius:'var(--radius)', border:'1px solid #bbf7d0', fontSize:13 }}>
            🏆 <strong>{CITY_NAMES[topCity.city] || topCity.city}</strong> — лидер по прибыли:{' '}
            <strong>{fmtKZT(topCity.profit)} KZT</strong> · {topCity.count} сделок
            {topVolCity && topVolCity.city !== topCity.city && (
              <span style={{ marginLeft:16, color:'var(--text-muted)' }}>
                (лидер по обороту: <strong>{CITY_NAMES[topVolCity.city]}</strong>)
              </span>
            )}
          </div>
        )}

        {/* Profit bar chart by city */}
        {cityArr.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12, color:'var(--text-faint)', marginBottom:8 }}>Прибыль (KZT)</div>
            <HBar items={cityArr} valueKey="profit"
              max={Math.max(...cityArr.map(d => d.profit), 1)}
              formatVal={v => fmtKZT(v) + ' KZT'} />
          </div>
        )}

        {/* Detailed city table */}
        <div style={{ overflowX:'auto' }}>
          <table className="stats-table" style={{ width:'100%' }}>
            <thead>
              <tr>
                <th>Город</th>
                <th className="num">Сделок</th>
                <th className="num">Прибыль KZT</th>
                <th className="num">Маржа %</th>
                <th className="num">Оборот KZT</th>
                <th className="num">Покупка</th>
                <th className="num">Продажа</th>
                <th className="num">Приб. от покупки</th>
                <th className="num">Приб. от продажи</th>
              </tr>
            </thead>
            <tbody>
              {cityArr.length === 0 ? (
                <tr><td colSpan={9} className="empty" style={{ textAlign:'center', padding:'1rem' }}>Нет данных</td></tr>
              ) : cityArr.map((d, i) => {
                const cityData = byCity[d.id] || {};
                const margin   = d.value ? ((d.profit / d.value) * 100).toFixed(2) : '0';
                return (
                  <tr key={d.id}>
                    <td>
                      <span style={{ display:'inline-block', width:8, height:8, borderRadius:2,
                        background:d.color, marginRight:6 }} />
                      <strong>{d.label}</strong>
                      {i === 0 && totalProfit > 0 && <span style={{ marginLeft:6, fontSize:11, color:'var(--green-text)' }}>👑</span>}
                    </td>
                    <td className="num">{d.count}</td>
                    <td className="num" style={{ color:'var(--green-text)', fontWeight:600 }}>
                      {fmtKZT(d.profit)}
                    </td>
                    <td className="num" style={{ color:'var(--text-faint)' }}>{margin}%</td>
                    <td className="num">{fmtKZT(d.value)}</td>
                    <td className="num" style={{ color:'var(--green-text)', fontSize:12 }}>
                      {fmtKZT(cityData.buyKZT || 0)}
                    </td>
                    <td className="num" style={{ color:'var(--red-text)', fontSize:12 }}>
                      {fmtKZT(cityData.sellKZT || 0)}
                    </td>
                    <td className="num" style={{ fontSize:12 }}>{fmtKZT(cityData.buyProfit || 0)}</td>
                    <td className="num" style={{ fontSize:12 }}>{fmtKZT(cityData.sellProfit || 0)}</td>
                  </tr>
                );
              })}
              {cityArr.length > 1 && (
                <tr style={{ background:'var(--bg-muted)', fontWeight:700 }}>
                  <td>ИТОГО</td>
                  <td className="num">{totalCount}</td>
                  <td className="num" style={{ color:'var(--green-text)' }}>{fmtKZT(totalProfit)}</td>
                  <td className="num">{profitMargin}%</td>
                  <td className="num">{fmtKZT(totalVolume)}</td>
                  <td className="num">{fmtKZT((byType.buy?.volumeKZT)||0)}</td>
                  <td className="num">{fmtKZT((byType.sell?.volumeKZT)||0)}</td>
                  <td className="num">{fmtKZT((byType.buy?.profit)||0)}</td>
                  <td className="num">{fmtKZT((byType.sell?.profit)||0)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Two-column: currency + type donuts ─────────────────────────── */}
      <div className="stats-row">
        <div className="card" style={{ margin:0 }}>
          <div className="card-title">Прибыль по валютам</div>
          <Donut slices={curProfitDonut} size={120} />
          <div style={{ marginTop:12 }}>
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Валюта</th>
                  <th className="num">Сделок</th>
                  <th className="num">Прибыль KZT</th>
                  <th className="num">Оборот</th>
                  <th className="num" style={{ color:'var(--green-text)' }}>Ср. курс покупки</th>
                  <th className="num" style={{ color:'var(--red-text)' }}>Ср. курс продажи</th>
                </tr>
              </thead>
              <tbody>
                {curArr.map(d => {
                  const rs = rateStats?.[d.label] || {};
                  return (
                    <tr key={d.label}>
                      <td>
                        <span style={{ display:'inline-block', width:8, height:8, background:d.color, borderRadius:2, marginRight:6 }}/>
                        <strong>{d.label}</strong>
                      </td>
                      <td className="num">{d.count}</td>
                      <td className="num" style={{ color:'var(--green-text)', fontWeight:600 }}>{fmtKZT(d.profit)}</td>
                      <td className="num" style={{ fontSize:12, color:'var(--text-faint)' }}>{fmtKZT(d.value)}</td>
                      <td className="num" style={{ color:'var(--green-text)', fontSize:12 }}>
                        {rs.avgBuy  != null ? formatAmount(rs.avgBuy,  'KZT') : '—'}
                      </td>
                      <td className="num" style={{ color:'var(--red-text)', fontSize:12 }}>
                        {rs.avgSell != null ? formatAmount(rs.avgSell, 'KZT') : '—'}
                      </td>
                    </tr>
                  );
                })}
                {curArr.length === 0 && (
                  <tr><td colSpan={6} className="empty" style={{ textAlign:'center', padding:'0.75rem' }}>Нет данных</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ margin:0 }}>
          <div className="card-title">Прибыль по городам (доля)</div>
          <Donut slices={cityProfitDonut} size={120} />
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:12, color:'var(--text-faint)', marginBottom:8 }}>Прибыль KZT (горизонтальная шкала)</div>
            <HBar items={cityArr} valueKey="profit"
              max={Math.max(...cityArr.map(d=>d.profit),1)}
              formatVal={v => fmtKZT(v)} />
          </div>
        </div>
      </div>

      {/* ── Profit per day table ─────────────────────────────────────────── */}
      <div className="card">
        <div className="card-title">
          Детализация прибыли по {period === 'day' ? 'дням' : 'месяцам'}
        </div>
        {periodArr.length === 0 ? (
          <div className="empty">Нет данных</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Период</th>
                  <th className="num">Сделок</th>
                  <th className="num">Прибыль KZT</th>
                  <th className="num">Маржа %</th>
                  <th className="num">Оборот KZT</th>
                  {cityArr.map(c => (
                    <th key={c.id} className="num" style={{ color:c.color }}>{c.label.slice(0,6)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...periodArr].reverse().map(d => {
                  const rawKey  = period === 'day'
                    ? Object.keys(periodRaw).find(k => k.endsWith(d.label)) || d.label
                    : d.label;
                  const rawDay  = periodRaw[rawKey] || {};
                  const margin  = d.value ? ((d.profit / d.value) * 100).toFixed(2) : '0';
                  return (
                    <tr key={d.label}>
                      <td style={{ fontVariantNumeric:'tabular-nums' }}>{rawKey || d.label}</td>
                      <td className="num">{d.count}</td>
                      <td className="num" style={{ color:'var(--green-text)', fontWeight:600 }}>
                        {fmtKZT(d.profit)}
                      </td>
                      <td className="num" style={{ color:'var(--text-faint)' }}>{margin}%</td>
                      <td className="num">{fmtKZT(d.value)}</td>
                      {cityArr.map(c => (
                        <td key={c.id} className="num" style={{ fontSize:12 }}>
                          {fmtKZT((rawDay.byCity?.[c.id]?.profit) || 0)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr style={{ background:'var(--bg-muted)', fontWeight:700 }}>
                  <td>Итого</td>
                  <td className="num">{totalCount}</td>
                  <td className="num" style={{ color:'var(--green-text)' }}>{fmtKZT(totalProfit)}</td>
                  <td className="num">{profitMargin}%</td>
                  <td className="num">{fmtKZT(totalVolume)}</td>
                  {cityArr.map(c => (
                    <td key={c.id} className="num" style={{ fontSize:12 }}>
                      {fmtKZT((byCity[c.id]?.profit) || 0)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* ── Historical rates by currency ─────────────────────────────────── */}
      <div className="card">
        <div className="card-title">📉 Курсы валют по операциям (исторические)</div>
        <p style={{ fontSize:12, color:'var(--text-faint)', marginBottom:14, marginTop:0 }}>
          Минимальный, средний и максимальный курс покупки/продажи, зафиксированный в момент проведения каждой операции за выбранный период.
        </p>
        {!rateStats || Object.keys(rateStats).length === 0 ? (
          <div className="empty">Нет операций — нет исторических курсов</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="stats-table" style={{ width:'100%' }}>
              <thead>
                <tr>
                  <th>Валюта</th>
                  <th className="num" style={{ color:'var(--green-text)' }}>↑ Покупка мин.</th>
                  <th className="num" style={{ color:'var(--green-text)' }}>↑ Покупка ср.</th>
                  <th className="num" style={{ color:'var(--green-text)' }}>↑ Покупка макс.</th>
                  <th className="num" style={{ width:16, padding:'0 4px' }}></th>
                  <th className="num" style={{ color:'var(--red-text)' }}>↓ Продажа мин.</th>
                  <th className="num" style={{ color:'var(--red-text)' }}>↓ Продажа ср.</th>
                  <th className="num" style={{ color:'var(--red-text)' }}>↓ Продажа макс.</th>
                  <th className="num">Спред ср., %</th>
                </tr>
              </thead>
              <tbody>
                {FOREIGN_CURRENCIES.filter(cur => rateStats[cur]).map(cur => {
                  const rs = rateStats[cur];
                  const spreadPct = (rs.avgBuy != null && rs.avgSell != null && rs.avgSell > 0)
                    ? (((rs.avgSell - rs.avgBuy) / ((rs.avgSell + rs.avgBuy) / 2)) * 100).toFixed(3)
                    : null;
                  const color = CUR_COLORS_MAP[cur] || '#888';
                  return (
                    <tr key={cur}>
                      <td>
                        <span style={{ display:'inline-block', width:8, height:8, background:color, borderRadius:2, marginRight:6 }}/>
                        <strong>{CURRENCY_FLAGS[cur]} {cur}</strong>
                        <span style={{ fontSize:11, color:'var(--text-faint)', marginLeft:6 }}>{CURRENCY_LABELS[cur]}</span>
                      </td>
                      {/* buy cols */}
                      <td className="num" style={{ color:'var(--green-text)', fontSize:12 }}>
                        {rs.minBuy != null ? formatAmount(rs.minBuy, 'KZT') : '—'}
                      </td>
                      <td className="num" style={{ color:'var(--green-text)', fontWeight:600 }}>
                        {rs.avgBuy != null ? formatAmount(rs.avgBuy, 'KZT') : '—'}
                      </td>
                      <td className="num" style={{ color:'var(--green-text)', fontSize:12 }}>
                        {rs.maxBuy != null ? formatAmount(rs.maxBuy, 'KZT') : '—'}
                      </td>
                      <td style={{ width:16, padding:'0 4px', color:'var(--border)', textAlign:'center' }}>│</td>
                      {/* sell cols */}
                      <td className="num" style={{ color:'var(--red-text)', fontSize:12 }}>
                        {rs.minSell != null ? formatAmount(rs.minSell, 'KZT') : '—'}
                      </td>
                      <td className="num" style={{ color:'var(--red-text)', fontWeight:600 }}>
                        {rs.avgSell != null ? formatAmount(rs.avgSell, 'KZT') : '—'}
                      </td>
                      <td className="num" style={{ color:'var(--red-text)', fontSize:12 }}>
                        {rs.maxSell != null ? formatAmount(rs.maxSell, 'KZT') : '—'}
                      </td>
                      <td className="num" style={{ color:'var(--text-faint)', fontSize:12 }}>
                        {spreadPct != null ? spreadPct + '%' : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Rate detail per operation (expandable per currency) ──────────── */}
      {rateStats && Object.keys(rateStats).length > 0 && (
        <RateOpsDetail byCurrency={byCurrency} rateStats={rateStats} ops={[]} />
      )}
    </>
  );
}

/* ─── Rate detail: per-currency rate spread mini-cards ─────────────────── */
function RateOpsDetail({ byCurrency, rateStats }) {
  const fmtR = v => (v != null ? formatAmount(v, 'KZT') : '—');

  return (
    <div className="card">
      <div className="card-title">🔍 Детализация курсов по валютам</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:12 }}>
        {FOREIGN_CURRENCIES.filter(cur => rateStats[cur]).map(cur => {
          const rs  = rateStats[cur];
          const bcd = byCurrency[cur] || {};
          const color = CUR_COLORS_MAP[cur] || '#888';
          const spreadAvg = (rs.avgBuy != null && rs.avgSell != null)
            ? (rs.avgSell - rs.avgBuy).toFixed(4)
            : null;
          const spreadPct = (rs.avgBuy != null && rs.avgSell != null && rs.avgSell > 0)
            ? (((rs.avgSell - rs.avgBuy) / ((rs.avgSell + rs.avgBuy) / 2)) * 100).toFixed(3)
            : null;

          return (
            <div key={cur} style={{
              border:`1px solid var(--border)`, borderRadius:'var(--radius)',
              padding:'14px 16px', borderTop:`3px solid ${color}`,
              background:'var(--bg-card)',
            }}>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <span style={{ fontWeight:700, fontSize:14 }}>{CURRENCY_FLAGS[cur]} {cur}</span>
                <span style={{ fontSize:11, color:'var(--text-faint)', background:'var(--bg-muted)',
                  padding:'2px 8px', borderRadius:20 }}>
                  {bcd.count || 0} операций
                </span>
              </div>

              {/* Buy row */}
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--green-text)',
                  textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:4 }}>
                  ↑ Курс покупки (мы покупаем у клиента)
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                  {[['мин', fmtR(rs.minBuy)], ['средний', fmtR(rs.avgBuy)], ['макс', fmtR(rs.maxBuy)]].map(([lbl, val]) => (
                    <div key={lbl} style={{ textAlign:'center', background:'var(--green-bg)',
                      borderRadius:'var(--radius-sm)', padding:'6px 4px' }}>
                      <div style={{ fontSize:10, color:'var(--green-text)', marginBottom:2 }}>{lbl}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--green-text)' }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sell row */}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--red-text)',
                  textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:4 }}>
                  ↓ Курс продажи (мы продаём клиенту)
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                  {[['мин', fmtR(rs.minSell)], ['средний', fmtR(rs.avgSell)], ['макс', fmtR(rs.maxSell)]].map(([lbl, val]) => (
                    <div key={lbl} style={{ textAlign:'center', background:'var(--red-bg)',
                      borderRadius:'var(--radius-sm)', padding:'6px 4px' }}>
                      <div style={{ fontSize:10, color:'var(--red-text)', marginBottom:2 }}>{lbl}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--red-text)' }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spread */}
              {spreadAvg != null && (
                <div style={{ fontSize:12, color:'var(--text-faint)', borderTop:'1px solid var(--border)',
                  paddingTop:8, display:'flex', justifyContent:'space-between' }}>
                  <span>Ср. спред: <strong style={{ color:'var(--text)' }}>{spreadAvg} KZT</strong></span>
                  {spreadPct && <span>({spreadPct}%)</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
/* ─── 6. НАСТРОЙКИ ──────────────────────────────────────────────────────── */
function SettingsPanel({ permissions, updatePermission }) {
  const [saving, setSaving] = useState(null); // login of currently saving row
  const [msgs,   setMsgs]   = useState({});   // { [login]: { ok, text } }

  const CITY_NAMES_LOCAL = { shymkent:'Шымкент', almaty:'Алматы', moscow:'Москва', tashkent:'Ташкент' };

  const toggle = async (login, currentValue) => {
    setSaving(login);
    setMsgs(m => ({ ...m, [login]: null }));
    const result = await updatePermission(login, { statsAccess: !currentValue });
    setSaving(null);
    setMsgs(m => ({
      ...m,
      [login]: result.ok
        ? { ok: true,  text: !currentValue ? '✓ Доступ открыт' : '✓ Доступ закрыт' }
        : { ok: false, text: result.error },
    }));
    setTimeout(() => setMsgs(m => ({ ...m, [login]: null })), 2500);
  };

  if (!permissions) return (
    <div className="card"><div className="empty">Загрузка настроек...</div></div>
  );

  return (
    <div className="card">
      <div className="card-title">⚙ Управление доступом операторов</div>
      <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20, marginTop:0, lineHeight:1.6 }}>
        Здесь вы управляете правами доступа операторов к разделу <strong>«Статистика»</strong>.
        При включённом доступе оператор видит только статистику <strong>своего пункта</strong> — без данных других городов.
      </p>

      {/* Section header */}
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase',
        letterSpacing:'0.06em', marginBottom:12 }}>
        Статистика — доступ по операторам
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {permissions.map(op => {
          const isSaving = saving === op.login;
          const msg      = msgs[op.login];
          const enabled  = op.statsAccess;
          return (
            <div key={op.login} style={{
              display:'flex', alignItems:'center', gap:14, flexWrap:'wrap',
              padding:'14px 16px', borderRadius:'var(--radius)',
              border:`1px solid ${enabled ? '#bbf7d0' : 'var(--border)'}`,
              background: enabled ? 'var(--green-bg)' : 'var(--bg-muted)',
              transition:'all 0.2s',
            }}>
              {/* Operator info */}
              <div style={{ flex:1, minWidth:160 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>
                  {CITY_NAMES_LOCAL[op.city] || op.city}
                  <span style={{ fontSize:12, fontWeight:400, color:'var(--text-faint)', marginLeft:8 }}>
                    ({op.login})
                  </span>
                </div>
                <div style={{ fontSize:12, color:'var(--text-faint)', marginTop:2 }}>
                  Обменный пункт · оператор
                </div>
              </div>

              {/* Status badge */}
              <div style={{
                padding:'3px 12px', borderRadius:20, fontSize:12, fontWeight:600,
                background: enabled ? '#dcfce7' : '#fee2e2',
                color:      enabled ? '#166534' : '#991b1b',
                border:     `1px solid ${enabled ? '#86efac' : '#fca5a5'}`,
                flexShrink: 0,
              }}>
                {enabled ? '✓ Доступ открыт' : '✕ Доступ закрыт'}
              </div>

              {/* Toggle */}
              <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', userSelect:'none' }}>
                  <div
                    onClick={() => !isSaving && toggle(op.login, enabled)}
                    style={{
                      width:44, height:24, borderRadius:12, position:'relative', cursor:'pointer',
                      background: enabled ? '#16a34a' : '#d1d5db',
                      transition:'background 0.2s',
                      opacity: isSaving ? 0.6 : 1,
                    }}
                  >
                    <div style={{
                      position:'absolute', top:2, left: enabled ? 22 : 2,
                      width:20, height:20, borderRadius:10,
                      background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
                      transition:'left 0.2s',
                    }} />
                  </div>
                  <span style={{ fontSize:13, color:'var(--text-muted)' }}>
                    {isSaving ? 'Сохраняем...' : enabled ? 'Отключить' : 'Включить'}
                  </span>
                </label>
                {msg && (
                  <span style={{
                    fontSize:12, fontWeight:600,
                    color: msg.ok ? 'var(--green-text)' : 'var(--red-text)',
                  }}>
                    {msg.text}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info box */}
      <div style={{
        marginTop:24, padding:'12px 16px', borderRadius:'var(--radius)',
        background:'var(--yellow-bg)', border:'1px solid var(--yellow-border)', fontSize:13,
      }}>
        <strong>ℹ Как работает доступ к статистике</strong>
        <ul style={{ margin:'8px 0 0 0', paddingLeft:20, lineHeight:1.8, color:'var(--text-muted)' }}>
          <li>Оператор с <strong>открытым</strong> доступом видит раздел «Статистика» в своём кабинете — только данные своего пункта.</li>
          <li>Оператор с <strong>закрытым</strong> доступом не видит раздел «Статистика» — вкладка скрыта.</li>
          <li>Общая статистика по всем городам доступна <strong>только администратору</strong>.</li>
        </ul>
      </div>
    </div>
  );
}

/* ─── MAIN ──────────────────────────────────────────────────────────────── */
const TABS = [
  { id:'balances', label:'💰 Балансы'          },
  { id:'ops',      label:'📋 Журнал операций'  },
  { id:'stats',    label:'📊 Статистика'        },
  { id:'logs',     label:'📝 История балансов' },
  { id:'rates',    label:'📈 История курсов'   },
  { id:'settings', label:'⚙ Настройки'         },
];

export default function AdminPage() {
  const {
    balances, rates, ops, balanceLogs, rateLogs, stats, permissions, loading,
    editBalance, reloadOps, reloadBalanceLogs, reloadRateLogs, reloadStats,
    updatePermission,
  } = useData();
  const [tab,             setTab]             = useState('balances');
  const [showRatesEditor, setShowRatesEditor] = useState(false);

  if (loading) return (
    <>
      <Navbar title="Центральная касса" />
      <div className="page" style={{ textAlign:'center', paddingTop:'3rem', color:'var(--text-faint)' }}>
        Загрузка данных...
      </div>
    </>
  );

  return (
    <>
      <Navbar title="Центральная касса">
        <span className="badge badge-blue">Администратор</span>
        <button className="btn btn-sm" onClick={() => setShowRatesEditor(v => !v)}>
          {showRatesEditor ? '✕ Закрыть' : '⚙ Курсы валют'}
        </button>
      </Navbar>
      <div className="page">
        <RatesCard rates={rates} />
        {showRatesEditor && <RatesEditor onClose={() => setShowRatesEditor(false)} />}

        <div className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn${tab===t.id?' active':''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'balances' && <BalancesPanel balances={balances} editBalance={editBalance} />}
        {tab === 'ops'      && <OpsPanel ops={ops} reloadOps={reloadOps} />}
        {tab === 'stats'    && <StatsPanel stats={stats} reloadStats={reloadStats} />}
        {tab === 'logs'     && <BalanceLogsPanel balanceLogs={balanceLogs} reloadBalanceLogs={reloadBalanceLogs} />}
        {tab === 'rates'    && <RateLogsPanel rateLogs={rateLogs} reloadRateLogs={reloadRateLogs} />}
        {tab === 'settings' && <SettingsPanel permissions={permissions} updatePermission={updatePermission} />}
      </div>
    </>
  );
}
