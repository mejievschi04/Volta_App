const getBaseUrl = () => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/api`;
};

function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? window.sessionStorage.getItem('adminKey') : null;
  return token ? { 'X-Admin-Key': token } : {};
}

function handleUnauthorized(res) {
  if (res.status === 401) {
    res.json().then((data) => {
      if (data?.error && /admin|Admin/.test(String(data.error))) {
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem('adminKey');
          window.dispatchEvent(new Event('admin-unauthorized'));
        }
      }
    }).catch(() => {});
  }
}

export async function api(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };
  const base = getBaseUrl().replace(/\/$/, '');
  const fullUrl = url.startsWith('http') ? url : `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  const res = await fetch(fullUrl, { ...options, headers });
  handleUnauthorized(res);
  return res;
}

/** Pentru FormData (upload): nu seta Content-Type, browser-ul setează boundary */
export async function apiFormData(url, options = {}) {
  const { body, ...rest } = options;
  const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
  if (body instanceof FormData) {
    // Nu adăuga Content-Type ca să rămână multipart/form-data; boundary
  } else {
    headers['Content-Type'] = 'application/json';
  }
  const base = getBaseUrl().replace(/\/$/, '');
  const fullUrl = url.startsWith('http') ? url : `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  const res = await fetch(fullUrl, { ...rest, headers, body });
  handleUnauthorized(res);
  return res;
}

export async function apiJson(url, options = {}) {
  const res = await api(url, options);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { ok: res.ok, data, status: res.status };
}

export async function apiJsonFormData(url, options = {}) {
  const res = await apiFormData(url, options);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { ok: res.ok, data, status: res.status };
}

export { getBaseUrl };
