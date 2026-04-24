import React, { useState } from 'react';
import {
  formatAmount,
  FOREIGN_CURRENCIES,
  CURRENCY_FLAGS,
  CURRENCY_LABELS,
} from '../utils/currency';

/* ── helpers ──────────────────────────────────────────────────────────────── */
const CUR_COLORS = { USD:'#3b82f6', RUB:'#8b5cf6', UZS:'#f97316', EUR:'#0ea5e9' };

function fmtKZT(v) {
  if (!v) return '0';
  if (v >= 1e6) return (v / 1e6).toFixed(2) + ' M';
  return Number(v).toLocaleString('ru-RU');
}
function fmtRate(v) {
  return v != null ? formatAmount(v, 'KZT') : '—';
}

/* ── KPI card ─────────────────────────────────────────────────────────────── */
function KpiCard({ icon, label, value, sub, accent }) {
  return (
    <div className="kpi-card" style={accent ? { borderTop: `3px solid ${accent}` } : {}}>
      <div className="kpi-label">{icon} {label}</div>
      <div className="kpi-value"
        style={{ fontSize: String(value).length > 12 ? 13 : String(value).length > 8 ? 17 : 22 }}>
        {value}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

/* ── Stacked bar (volume + profit) ───────────────────────────────────────── */
function StackedBar({ data, height = 150 }) {
  if (!data || !data.length) return <div className="empty">Нет данных</div>;
  const maxVol = Math.max(...data.map(d => d.volume || 0), 1);
  const maxPro = Math.max(...data.map(d => d.profit || 0), 1);
  const BAR_W  = Math.max(18, Math.min(46, Math.floor(300 / data.length) - 8));
  const W      = (BAR_W * 2 + 10) * data.length + 24;
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display:'flex', gap:14, marginBottom:8, fontSize:12 }}>
        <span><span style={{ display:'inline-block', width:10, height:10, background:'#6366f1', borderRadius:2, marginRight:4 }}/>Оборот KZT</span>
        <span><span style={{ display:'inline-block', width:10, height:10, background:'#10b981', borderRadius:2, marginRight:4 }}/>Прибыль KZT</span>
      </div>
      <svg width={W} height={height + 30} style={{ display:'block' }}>
        {[0, 0.5, 1].map(f => {
          const y = height - Math.round(f * height);
          return <line key={f} x1={0} y1={y} x2={W} y2={y} stroke="#eee" strokeWidth={1}/>;
        })}
        {data.map((d, i) => {
          const volH = Math.max(2, Math.round(((d.volume || 0) / maxVol) * height));
          const proH = Math.max(2, Math.round(((d.profit || 0) / maxPro) * height));
          const x = 12 + i * (BAR_W * 2 + 10);
          const lbl = String(d.label || '');
          return (
            <g key={i}>
              <rect x={x} y={height-volH} width={BAR_W} height={volH} rx={2} fill="#6366f1" opacity={0.75}>
                <title>{lbl} оборот: {(d.volume||0).toLocaleString('ru-RU')} KZT</title>
              </rect>
              <rect x={x+BAR_W+2} y={height-proH} width={BAR_W} height={proH} rx={2} fill="#10b981" opacity={0.85}>
                <title>{lbl} прибыль: {(d.profit||0).toLocaleString('ru-RU')} KZT</title>
              </rect>
              <text x={x+BAR_W} y={height+14} textAnchor="middle" fontSize={9} fill="#aaa">
                {lbl.length > 6 ? lbl.slice(0, 5)+'…' : lbl}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Donut ────────────────────────────────────────────────────────────────── */
function Donut({ slices, size = 100 }) {
  if (!slices || !slices.length) return null;
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (!total) return <div className="empty">Нет данных</div>;
  const cx = size/2, cy = size/2, r = size*0.38, inner = size*0.22;
  let angle = -Math.PI / 2;
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
    <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
      <svg width={size} height={size} style={{ flexShrink:0 }}>
        {paths.map((p,i) => <path key={i} d={p.d} fill={p.color} opacity={0.85}><title>{p.label}: {p.pct}%</title></path>)}
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {slices.map((sl,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
            <span style={{ width:9, height:9, borderRadius:2, background:sl.color, flexShrink:0 }}/>
            <span style={{ color:'var(--text-muted)' }}>{sl.label}</span>
            <span style={{ fontWeight:600, marginLeft:4 }}>{paths[i].pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── HBar ─────────────────────────────────────────────────────────────────── */
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
            <div style={{ width:68, textAlign:'right', color:'var(--text-muted)', flexShrink:0, fontWeight:500 }}>
              {d.label}
            </div>
            <div style={{ flex:1, background:'var(--bg-muted)', borderRadius:4, height:18, overflow:'hidden' }}>
              <div style={{ width:pct+'%', height:'100%', background:clr, borderRadius:4,
                minWidth:2, opacity:0.82, transition:'width 0.4s ease' }}/>
            </div>
            <div style={{ width:90, color:'var(--text-muted)', flexShrink:0, fontVariantNumeric:'tabular-nums' }}>
              {formatVal ? formatVal(val) : val.toLocaleString('ru-RU')}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══ MAIN COMPONENT ══════════════════════════════════════════════════════════ */
export default function OperatorStats({ stats, cityId, cityName, reloadStats }) {
  const [period,   setPeriod]   = useState('day');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [loading,  setLoading]  = useState(false);

  const applyFilter = async () => {
    setLoading(true);
    // backend always enforces city = operator's city, so we only pass dates
    await reloadStats({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
    setLoading(false);
  };
  const resetFilter = async () => {
    setDateFrom(''); setDateTo('');
    setLoading(true);
    await reloadStats();
    setLoading(false);
  };

  /* ── no stats yet ── */
  if (!stats) return (
    <div className="card">
      <div className="card-title">📊 Статистика — {cityName}</div>
      <div className="empty" style={{ padding:'2rem 0' }}>
        Нет данных. Проведите операции — статистика появится здесь.
      </div>
    </div>
  );

  const {
    totalCount, totalVolume, totalProfit, avgVolume, avgProfit,
    byType, byCurrency, byDay, byMonth, topDay, rateStats,
  } = stats;

  const profitMargin = totalVolume ? ((totalProfit / totalVolume) * 100).toFixed(2) : '0';

  /* ── period chart data ── */
  const periodRaw = period === 'day' ? byDay : byMonth;
  const periodArr = Object.entries(periodRaw || {})
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-20)
    .map(([label, d]) => ({
      label:  period === 'day' ? label.slice(5) : label,
      volume: d.volumeKZT || 0,
      profit: d.profit    || 0,
      count:  d.count     || 0,
    }));

  /* ── currency data ── */
  const curArr = Object.entries(byCurrency || {})
    .sort((a, b) => b[1].profit - a[1].profit)
    .map(([cur, d]) => ({
      label:  cur,
      value:  d.volumeKZT || 0,
      profit: d.profit    || 0,
      count:  d.count     || 0,
      color:  CUR_COLORS[cur] || '#888',
    }));

  const curProfitDonut = curArr.map(d => ({ label: d.label, value: d.profit, color: d.color }));

  return (
    <>
      {/* ── Header note ─────────────────────────────────────────────────── */}
      <div style={{
        padding:'10px 16px', borderRadius:'var(--radius)',
        background:'var(--bg-muted)', border:'1px solid var(--border)',
        fontSize:13, color:'var(--text-muted)', marginBottom:0,
        display:'flex', alignItems:'center', gap:8,
      }}>
        <span style={{ fontSize:16 }}>📍</span>
        Статистика по пункту <strong style={{ color:'var(--text)' }}>{cityName}</strong> — только ваши операции.
      </div>

      {/* ── Filter ──────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-title">Период</div>
        <div className="filter-row">
          <input type="date" className="input" value={dateFrom}
            onChange={e => setDateFrom(e.target.value)} placeholder="С" />
          <span style={{ alignSelf:'center', color:'var(--text-faint)', fontSize:12 }}>—</span>
          <input type="date" className="input" value={dateTo}
            onChange={e => setDateTo(e.target.value)} placeholder="По" />
          <button className="btn btn-sm" onClick={applyFilter} disabled={loading}>
            {loading ? '...' : 'Применить'}
          </button>
          <button className="btn btn-sm" onClick={resetFilter} disabled={loading}>Сброс</button>
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────── */}
      <div className="stats-kpi-grid">
        <KpiCard icon="💸" label="Прибыль пункта"
          value={fmtKZT(totalProfit) + ' KZT'}
          sub={`маржа ${profitMargin}%`} accent="#10b981" />
        <KpiCard icon="📈" label="Оборот KZT"
          value={fmtKZT(totalVolume) + ' KZT'}
          sub={`${totalCount} операций`} accent="#6366f1" />
        <KpiCard icon="🎯" label="Средняя прибыль / сделка"
          value={fmtKZT(avgProfit) + ' KZT'}
          sub={`ср. чек ${fmtKZT(avgVolume)} KZT`} />
        <KpiCard icon="🏆" label="Лучший день"
          value={topDay ? topDay.date : '—'}
          sub={topDay ? `${fmtKZT(topDay.profit)} KZT · ${topDay.count} сд.` : ''}
          accent="#f59e0b" />
      </div>

      {/* ── Buy vs Sell ─────────────────────────────────────────────────── */}
      <div className="stats-row">
        <div className="card" style={{ margin:0 }}>
          <div className="card-title">Покупка vs Продажа</div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {[
              { key:'buy',  label:'Покупка у клиента',  color:'var(--green-text)', bg:'var(--green-bg)', icon:'↑' },
              { key:'sell', label:'Продажа клиенту',    color:'var(--red-text)',   bg:'var(--red-bg)',   icon:'↓' },
            ].map(({ key, label, color, bg, icon }) => {
              const d = byType?.[key] || {};
              return (
                <div key={key} style={{ padding:'12px 14px', borderRadius:'var(--radius)', background:bg }}>
                  <div style={{ fontSize:12, fontWeight:700, color, marginBottom:6 }}>{icon} {label}</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, fontSize:12 }}>
                    <div><div style={{ color:'var(--text-faint)', fontSize:11 }}>Сделок</div>
                      <div style={{ fontWeight:600 }}>{d.count || 0}</div></div>
                    <div><div style={{ color:'var(--text-faint)', fontSize:11 }}>Оборот KZT</div>
                      <div style={{ fontWeight:600 }}>{fmtKZT(d.volumeKZT)}</div></div>
                    <div><div style={{ color:'var(--text-faint)', fontSize:11 }}>Прибыль</div>
                      <div style={{ fontWeight:600, color }}>{fmtKZT(d.profit)}</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ margin:0 }}>
          <div className="card-title">Прибыль по валютам</div>
          <Donut slices={curProfitDonut} size={100} />
          <div style={{ marginTop:12 }}>
            <HBar items={curArr} valueKey="profit"
              max={Math.max(...curArr.map(d => d.profit), 1)}
              formatVal={v => fmtKZT(v) + ' KZT'} />
          </div>
        </div>
      </div>

      {/* ── Period chart ────────────────────────────────────────────────── */}
      <div className="card">
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, flexWrap:'wrap' }}>
          <div className="card-title" style={{ margin:0 }}>
            Динамика по {period === 'day' ? 'дням' : 'месяцам'}
          </div>
          <div className="filter-period-btns">
            <button className={period==='day'   ? 'active' : ''} onClick={() => setPeriod('day')}>По дням</button>
            <button className={period==='month' ? 'active' : ''} onClick={() => setPeriod('month')}>По месяцам</button>
          </div>
        </div>
        {periodArr.length === 0
          ? <div className="empty">Проведите операции — здесь появится динамика.</div>
          : <StackedBar data={periodArr} height={150} />
        }
      </div>

      {/* ── Currency detail table ────────────────────────────────────────── */}
      <div className="card">
        <div className="card-title">Детализация по валютам</div>
        <div style={{ overflowX:'auto' }}>
          <table className="stats-table" style={{ width:'100%' }}>
            <thead>
              <tr>
                <th>Валюта</th>
                <th className="num">Сделок</th>
                <th className="num">Прибыль KZT</th>
                <th className="num">Маржа %</th>
                <th className="num">Оборот KZT</th>
                <th className="num" style={{ color:'var(--green-text)' }}>Ср. курс покупки</th>
                <th className="num" style={{ color:'var(--red-text)' }}>Ср. курс продажи</th>
              </tr>
            </thead>
            <tbody>
              {curArr.length === 0 ? (
                <tr><td colSpan={7} className="empty" style={{ textAlign:'center', padding:'1rem' }}>Нет данных</td></tr>
              ) : curArr.map(d => {
                const rs     = rateStats?.[d.label] || {};
                const margin = d.value ? ((d.profit / d.value) * 100).toFixed(2) : '0';
                return (
                  <tr key={d.label}>
                    <td>
                      <span style={{ display:'inline-block', width:8, height:8,
                        background:d.color, borderRadius:2, marginRight:6 }}/>
                      <strong>{CURRENCY_FLAGS[d.label]} {d.label}</strong>
                      <span style={{ fontSize:11, color:'var(--text-faint)', marginLeft:6 }}>
                        {CURRENCY_LABELS[d.label]}
                      </span>
                    </td>
                    <td className="num">{d.count}</td>
                    <td className="num" style={{ color:'var(--green-text)', fontWeight:600 }}>
                      {fmtKZT(d.profit)}
                    </td>
                    <td className="num" style={{ color:'var(--text-faint)' }}>{margin}%</td>
                    <td className="num" style={{ fontSize:12, color:'var(--text-faint)' }}>
                      {fmtKZT(d.value)}
                    </td>
                    <td className="num" style={{ color:'var(--green-text)', fontSize:12 }}>
                      {fmtRate(rs.avgBuy)}
                    </td>
                    <td className="num" style={{ color:'var(--red-text)', fontSize:12 }}>
                      {fmtRate(rs.avgSell)}
                    </td>
                  </tr>
                );
              })}
              {curArr.length > 1 && (
                <tr style={{ background:'var(--bg-muted)', fontWeight:700 }}>
                  <td>ИТОГО</td>
                  <td className="num">{totalCount}</td>
                  <td className="num" style={{ color:'var(--green-text)' }}>{fmtKZT(totalProfit)}</td>
                  <td className="num">{profitMargin}%</td>
                  <td className="num">{fmtKZT(totalVolume)}</td>
                  <td className="num">—</td>
                  <td className="num">—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Historical rates mini-cards ──────────────────────────────────── */}
      {rateStats && Object.keys(rateStats).length > 0 && (
        <div className="card">
          <div className="card-title">📉 Курсы по операциям (исторические)</div>
          <p style={{ fontSize:12, color:'var(--text-faint)', marginBottom:14, marginTop:0 }}>
            Курсы покупки и продажи, зафиксированные в момент каждой операции вашего пункта.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px,1fr))', gap:12 }}>
            {FOREIGN_CURRENCIES.filter(cur => rateStats[cur]).map(cur => {
              const rs = rateStats[cur];
              const color = CUR_COLORS[cur] || '#888';
              const spreadAvg = (rs.avgBuy != null && rs.avgSell != null)
                ? (rs.avgSell - rs.avgBuy).toFixed(4) : null;
              return (
                <div key={cur} style={{
                  border:'1px solid var(--border)', borderRadius:'var(--radius)',
                  padding:'12px 14px', borderTop:`3px solid ${color}`,
                  background:'var(--bg-card)',
                }}>
                  <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>
                    {CURRENCY_FLAGS[cur]} {cur}
                    <span style={{ fontSize:11, fontWeight:400, color:'var(--text-faint)', marginLeft:6 }}>
                      {CURRENCY_LABELS[cur]}
                    </span>
                  </div>

                  {/* buy */}
                  <div style={{ marginBottom:6 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--green-text)',
                      textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:3 }}>
                      ↑ Покупка у клиента
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4 }}>
                      {[['мин', rs.minBuy], ['средн.', rs.avgBuy], ['макс', rs.maxBuy]].map(([lbl, val]) => (
                        <div key={lbl} style={{ textAlign:'center', background:'var(--green-bg)',
                          borderRadius:'var(--radius-sm)', padding:'5px 2px' }}>
                          <div style={{ fontSize:9, color:'var(--green-text)' }}>{lbl}</div>
                          <div style={{ fontSize:12, fontWeight:600, color:'var(--green-text)' }}>
                            {fmtRate(val)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* sell */}
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--red-text)',
                      textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:3 }}>
                      ↓ Продажа клиенту
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4 }}>
                      {[['мин', rs.minSell], ['средн.', rs.avgSell], ['макс', rs.maxSell]].map(([lbl, val]) => (
                        <div key={lbl} style={{ textAlign:'center', background:'var(--red-bg)',
                          borderRadius:'var(--radius-sm)', padding:'5px 2px' }}>
                          <div style={{ fontSize:9, color:'var(--red-text)' }}>{lbl}</div>
                          <div style={{ fontSize:12, fontWeight:600, color:'var(--red-text)' }}>
                            {fmtRate(val)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {spreadAvg != null && (
                    <div style={{ fontSize:11, color:'var(--text-faint)', borderTop:'1px solid var(--border)',
                      paddingTop:6, display:'flex', justifyContent:'space-between' }}>
                      <span>Ср. спред</span>
                      <strong style={{ color:'var(--text)' }}>{spreadAvg} KZT</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Period detail table ──────────────────────────────────────────── */}
      <div className="card">
        <div className="card-title">
          Детализация по {period === 'day' ? 'дням' : 'месяцам'}
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
                </tr>
              </thead>
              <tbody>
                {[...periodArr].reverse().map(d => {
                  const rawKey = period === 'day'
                    ? Object.keys(periodRaw).find(k => k.endsWith(d.label)) || d.label
                    : d.label;
                  const margin = d.volume ? ((d.profit / d.volume) * 100).toFixed(2) : '0';
                  return (
                    <tr key={rawKey}>
                      <td style={{ fontVariantNumeric:'tabular-nums' }}>{rawKey}</td>
                      <td className="num">{d.count}</td>
                      <td className="num" style={{ color:'var(--green-text)', fontWeight:600 }}>
                        {fmtKZT(d.profit)}
                      </td>
                      <td className="num" style={{ color:'var(--text-faint)' }}>{margin}%</td>
                      <td className="num">{fmtKZT(d.volume)}</td>
                    </tr>
                  );
                })}
                <tr style={{ background:'var(--bg-muted)', fontWeight:700 }}>
                  <td>Итого</td>
                  <td className="num">{totalCount}</td>
                  <td className="num" style={{ color:'var(--green-text)' }}>{fmtKZT(totalProfit)}</td>
                  <td className="num">{profitMargin}%</td>
                  <td className="num">{fmtKZT(totalVolume)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
