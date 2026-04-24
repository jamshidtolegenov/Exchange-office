// ─── API base URL ─────────────────────────────────────────────────────────────
// LOCAL DEV:  REACT_APP_API_URL is empty → BASE = '/api'
//             CRA proxy (package.json) forwards /api/* → http://localhost:4000
//             This avoids CORS entirely in development.
//
// PRODUCTION: REACT_APP_API_URL = 'https://exchange-office-db-ttza.onrender.com/api'
//             (set via .env.production or Vercel Environment Variables)
//             Requests go directly to the Render backend.

// Убираем trailing slash чтобы не было двойного слеша в итоговом URL.
// Пример: "http://localhost:4000/" + "/auth/login" → "http://localhost:4000/auth/login" ✓
const BASE = (process.env.REACT_APP_API_URL || '/api').replace(/\/$/, '');

if (process.env.NODE_ENV === 'development') {
  if (BASE.startsWith('http://localhost:4000')) {
    console.warn(
      '[API] ⚠️  REACT_APP_API_URL указывает напрямую на localhost:4000.\n' +
      '     Это вызывает CORS-ошибку. Оставьте REACT_APP_API_URL пустым —\n' +
      '     CRA proxy сам перенаправит /api/* → localhost:4000 без CORS.\n' +
      '     Удалите REACT_APP_API_URL из вашего .env файла.'
    );
  }
  console.log('[API] Base URL:', BASE || '(proxy: /api → localhost:4000)');
}

function getToken() { return localStorage.getItem('exch_token'); }

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    // Network failure (backend not running, no internet, etc.)
    console.error('[API] Network error:', networkErr.message);
    throw new Error('Нет соединения с сервером. Убедитесь, что backend запущен.');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const msg = data.error || `Ошибка сервера (${res.status})`;
    console.error(`[API] ${method} ${path} → ${res.status}:`, msg);
    throw new Error(msg);
  }

  return data;
}

// Filter out empty/falsy query params so backend never gets city=''
function cleanParams(params) {
  if (!params) return undefined;
  const out = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function qs(params) {
  const clean = cleanParams(params);
  return clean ? '?' + new URLSearchParams(clean).toString() : '';
}

export const api = {
  login:              (login, password)          => request('POST', '/auth/login', { login, password }),
  getRates:           ()                          => request('GET',  '/rates'),
  setRates:           (rates)                     => request('PUT',  '/rates', rates),
  getRateLogs:        (params)                    => request('GET',  `/rates/logs${qs(params)}`),
  getBalance:         (cityId)                    => request('GET',  `/balances/${cityId}`),
  getAllBalances:      ()                          => request('GET',  '/balances'),
  editBalance:        (cityId, newValues, comment) => request('PATCH', `/balances/${cityId}`, { newValues, comment }),
  getBalanceLogs:     (params)                    => request('GET',  `/balances/logs/all${qs(params)}`),
  doOperation:        (payload)                   => request('POST', '/operations/exchange', payload),
  getCityOps:         (cityId, params)            => request('GET',  `/operations/${cityId}${qs(params)}`),
  getAllOps:           (params)                    => request('GET',  `/operations${qs(params)}`),
  getStats:           (params)                    => request('GET',  `/stats${qs(params)}`),
  getPermissions:     ()                          => request('GET',  '/settings/permissions'),
  setPermission:      (login, body)               => request('PATCH', `/settings/permissions/${login}`, body),
  getMyPermissions:   ()                          => request('GET',  '/settings/my-permissions'),
};
