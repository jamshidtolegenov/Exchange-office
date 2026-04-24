import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import Navbar from '../components/Navbar';
import RatesCard from '../components/RatesCard';
import BalanceTable from '../components/BalanceTable';
import OperationForm from '../components/OperationForm';
import OperationsLog from '../components/OperationsLog';
import OperatorStats from '../components/OperatorStats';
import { CITY_NAMES } from '../utils/currency';

export default function CityPage() {
  const { cityId }  = useParams();
  const { user }    = useAuth();
  const { balances, rates, ops, stats, myPerms, loading, reloadStats } = useData();

  const [tab, setTab] = useState('main');

  if (user.role === 'operator' && user.city !== cityId)
    return <Navigate to={`/city/${user.city}`} replace />;
  if (!CITY_NAMES[cityId])
    return <Navigate to="/" replace />;

  const cityName   = CITY_NAMES[cityId];
  const cityBal    = balances[cityId] || { KZT: 0, USD: 0, RUB: 0, UZS: 0, EUR: 0 };
  const cityOps    = ops.filter(o => o.city === cityId);
  const hasStats   = myPerms?.statsAccess === true;

  if (loading) {
    return (
      <>
        <Navbar title={cityName}><span className="badge badge-green">{cityName}</span></Navbar>
        <div className="page" style={{ textAlign: 'center', paddingTop: '3rem', color: 'var(--text-faint)' }}>
          Загрузка данных...
        </div>
      </>
    );
  }

  const TABS = [
    { id: 'main',  label: '🏦 Касса' },
    ...(hasStats ? [{ id: 'stats', label: '📊 Статистика' }] : []),
  ];

  return (
    <>
      <Navbar title={cityName}>
        <span className="badge badge-green">{cityName}</span>
      </Navbar>
      <div className="page">
        <RatesCard rates={rates} />

        {/* Only show tabs if operator has stats access */}
        {hasStats && (
          <div className="tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`tab-btn${tab === t.id ? ' active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Main cashier view */}
        {tab === 'main' && (
          <>
            <BalanceTable balances={cityBal} cityName={cityName} />
            <OperationForm city={cityId} />
            <OperationsLog ops={cityOps} showCity={false} limit={40} />
          </>
        )}

        {/* Stats view — only if permitted */}
        {tab === 'stats' && hasStats && (
          <OperatorStats stats={stats} cityId={cityId} cityName={cityName} reloadStats={reloadStats} />
        )}
      </div>
    </>
  );
}
