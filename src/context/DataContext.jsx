import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();

  const [balances,    setBalances]    = useState({});
  const [rates,       setRatesState]  = useState({});
  const [ops,         setOps]         = useState([]);
  const [balanceLogs, setBalanceLogs] = useState([]);
  const [rateLogs,    setRateLogs]    = useState([]);
  const [stats,       setStats]       = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [myPerms,     setMyPerms]     = useState(null);
  const [loading,     setLoading]     = useState(false);

  const loadRates = useCallback(async () => {
    try { setRatesState(await api.getRates()); } catch (e) { console.error(e.message); }
  }, []);

  const loadBalances = useCallback(async () => {
    if (!user) return;
    try {
      if (user.role === 'admin') {
        setBalances(await api.getAllBalances());
      } else {
        const d = await api.getBalance(user.city);
        setBalances({ [user.city]: d.balances });
      }
    } catch (e) { console.error(e.message); }
  }, [user]);

  const loadOps = useCallback(async (params) => {
    if (!user) return;
    try {
      const data = user.role === 'admin'
        ? await api.getAllOps({ limit: 500, ...params })
        : await api.getCityOps(user.city, { limit: 50, ...params });
      setOps(data);
    } catch (e) { console.error(e.message); }
  }, [user]);

  const loadBalanceLogs = useCallback(async (params) => {
    if (!user || user.role !== 'admin') return;
    try { setBalanceLogs(await api.getBalanceLogs({ limit: 200, ...params })); }
    catch (e) { console.error(e.message); }
  }, [user]);

  const loadRateLogs = useCallback(async (params) => {
    if (!user || user.role !== 'admin') return;
    try { setRateLogs(await api.getRateLogs({ limit: 200, ...params })); }
    catch (e) { console.error(e.message); }
  }, [user]);

  const loadStats = useCallback(async (params) => {
    if (!user) return;
    try {
      const data = await api.getStats(params);
      setStats(data);
    } catch (e) {
      // 403 = access denied by admin — silently clear stats
      setStats(null);
    }
  }, [user]);

  const loadPermissions = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    try { setPermissions(await api.getPermissions()); }
    catch (e) { console.error(e.message); }
  }, [user]);

  const loadMyPerms = useCallback(async () => {
    if (!user || user.role === 'admin') return;
    try { setMyPerms(await api.getMyPermissions()); }
    catch (e) { console.error(e.message); }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setBalances({}); setOps([]); setBalanceLogs([]); setRateLogs([]);
      setStats(null); setPermissions(null); setMyPerms(null);
      return;
    }
    setLoading(true);
    const tasks = [loadRates(), loadBalances(), loadOps()];
    if (user.role === 'admin') {
      tasks.push(loadBalanceLogs(), loadRateLogs(), loadStats(), loadPermissions());
    } else {
      tasks.push(loadMyPerms(), loadStats());
    }
    Promise.all(tasks).finally(() => setLoading(false));
  }, [user, loadRates, loadBalances, loadOps, loadBalanceLogs, loadRateLogs,
      loadStats, loadPermissions, loadMyPerms]);

  const doOperation = async ({ city, opType, currency, amount, operator }) => {
    try {
      const result = await api.doOperation({ city, opType, currency, amount, operator });
      await Promise.all([loadBalances(), loadOps()]);
      return { ok: true, kzt: result.operation.amountKZT, rate: result.operation.rate };
    } catch (e) { return { ok: false, error: e.message }; }
  };

  const updateRates = async (newRates) => {
    try {
      const updated = await api.setRates(newRates);
      setRatesState(updated);
      await loadRateLogs();
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
  };

  const editBalance = async (cityId, newValues, comment) => {
    try {
      const result = await api.editBalance(cityId, newValues, comment);
      await Promise.all([loadBalances(), loadBalanceLogs(), loadStats()]);
      return { ok: true, ...result };
    } catch (e) { return { ok: false, error: e.message }; }
  };

  const updatePermission = async (login, perms) => {
    try {
      await api.setPermission(login, perms);
      await loadPermissions();
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
  };

  return (
    <DataContext.Provider value={{
      balances, rates, ops, balanceLogs, rateLogs, stats,
      permissions, myPerms, loading,
      doOperation,
      setRates:          updateRates,
      editBalance,
      reloadOps:         loadOps,
      reloadBalanceLogs: loadBalanceLogs,
      reloadRateLogs:    loadRateLogs,
      reloadStats:       loadStats,
      reloadBalances:    loadBalances,
      updatePermission,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() { return useContext(DataContext); }
