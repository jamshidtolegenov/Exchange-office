import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [loginStr, setLoginStr] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async () => {
    if (!loginStr || !password) { setError('Введите логин и пароль'); return; }
    setLoading(true);
    setError('');
    try {
      const user = await login(loginStr.trim(), password);
      if (user.role === 'admin') navigate('/admin');
      else navigate(`/city/${user.city}`);
    } catch (e) {
      setError(e.message || 'Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = e => { if (e.key === 'Enter') handleSubmit(); };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '2rem',
    }}>
      <div className="card" style={{ maxWidth: 380, width: '100%', padding: '2rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, textAlign: 'center', marginBottom: 6 }}>
          Обменный пункт
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1.5rem' }}>
          Сеть из 4 точек · Казахстан
        </p>

        <div style={{ marginBottom: '1rem' }}>
          <div className="label">Логин</div>
          <input
            className="input"
            type="text"
            placeholder="admin, user1–user4"
            autoComplete="username"
            value={loginStr}
            onChange={e => { setLoginStr(e.target.value); setError(''); }}
            onKeyDown={handleKey}
            disabled={loading}
          />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <div className="label">Пароль</div>
          <input
            className="input"
            type="password"
            placeholder="pass1234"
            autoComplete="current-password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            onKeyDown={handleKey}
            disabled={loading}
          />
        </div>

        <button
          className="btn btn-primary btn-block"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Входим...' : 'Войти'}
        </button>
        {error && (
          <p style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center', marginTop: 10 }}>
            {error}
          </p>
        )}

        <hr className="divider" />
        <div className="hint-box" style={{ fontSize: 12, lineHeight: 1.9 }}>
          <strong>admin</strong> / pass1234 — Администратор (все города)<br />
          <strong>user1</strong> / pass1234 — Оператор Шымкента<br />
          <strong>user2</strong> / pass1234 — Оператор Алматы<br />
          <strong>user3</strong> / pass1234 — Оператор Москвы<br />
          <strong>user4</strong> / pass1234 — Оператор Ташкента
        </div>
      </div>
    </div>
  );
}
