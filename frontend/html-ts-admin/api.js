const BASE_URL_KEY = 'repair-base-url';
const TOKEN_KEY = 'repair-token';

function getBaseURL() {
  return localStorage.getItem(BASE_URL_KEY) || 'http://localhost:8080';
}

function setBaseURL(url) {
  localStorage.setItem(BASE_URL_KEY, url.replace(/\/$/, ''));
}

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${getBaseURL()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json();
  if (payload.code !== 200) {
    throw new Error(payload.msg || '请求失败');
  }
  return payload.data;
}

export const storageKeys = {
  token: TOKEN_KEY,
  role: 'repair-role',
  user: 'repair-user'
};

export const authApi = {
  studentLogin(payload) {
    return request('/user/student/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  studentRegister(payload) {
    return request('/user/student/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  adminLogin(payload) {
    return request('/user/admin/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  adminRegister(payload) {
    return request('/user/admin/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};

export const studentApi = {
  bindDorm(payload) {
    return request('/student/bindDorm', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  updatePassword(payload) {
    return request('/student/updatePwd', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};

export const repairApi = {
  create(payload) {
    return request('/repair/add', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  getMyList(studentId) {
    return request(`/repair/my?studentId=${encodeURIComponent(studentId)}`);
  },
  getAll() {
    return request('/repair/all');
  },
  getDetail(id) {
    return request(`/repair/detail?id=${id}`);
  },
  updateStatus(id, status) {
    return request(`/repair/updateStatus?id=${id}&status=${encodeURIComponent(status)}`, {
      method: 'POST'
    });
  },
  deleteByIds(ids) {
    const query = ids.map((id) => `ids=${id}`).join('&');
    return request(`/repair/delete?${query}`, {
      method: 'DELETE'
    });
  }
};

export const configApi = {
  getBaseURL,
  setBaseURL
};
