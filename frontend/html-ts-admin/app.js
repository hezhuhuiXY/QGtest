import { authApi, configApi, repairApi, storageKeys, studentApi } from './api.js';

const state = {
  mode: 'login',
  role: JSON.parse(localStorage.getItem(storageKeys.role) || '"student"'),
  user: JSON.parse(localStorage.getItem(storageKeys.user) || 'null'),
  repairs: [],
  selectedIds: [],
  page: 1,
  pageSize: 5,
  keyword: '',
  status: '',
  editingItem: null
};

const elements = {
  baseURL: document.getElementById('baseURL'),
  saveBaseURL: document.getElementById('saveBaseURL'),
  logoutBtn: document.getElementById('logoutBtn'),
  notice: document.getElementById('notice'),
  authCard: document.getElementById('authCard'),
  dashboard: document.getElementById('dashboard'),
  loginTab: document.getElementById('loginTab'),
  registerTab: document.getElementById('registerTab'),
  studentRoleTab: document.getElementById('studentRoleTab'),
  adminRoleTab: document.getElementById('adminRoleTab'),
  accountLabel: document.getElementById('accountLabel'),
  account: document.getElementById('account'),
  password: document.getElementById('password'),
  confirmWrap: document.getElementById('confirmWrap'),
  confirmPassword: document.getElementById('confirmPassword'),
  submitAuth: document.getElementById('submitAuth'),
  studentPanel: document.getElementById('studentPanel'),
  studentIdentity: document.getElementById('studentIdentity'),
  studentDormitory: document.getElementById('studentDormitory'),
  saveDormBtn: document.getElementById('saveDormBtn'),
  repairDorm: document.getElementById('repairDorm'),
  repairContent: document.getElementById('repairContent'),
  createRepairBtn: document.getElementById('createRepairBtn'),
  oldPassword: document.getElementById('oldPassword'),
  newPassword: document.getElementById('newPassword'),
  confirmNewPassword: document.getElementById('confirmNewPassword'),
  updatePasswordBtn: document.getElementById('updatePasswordBtn'),
  listTitle: document.getElementById('listTitle'),
  listDesc: document.getElementById('listDesc'),
  refreshBtn: document.getElementById('refreshBtn'),
  deleteSelectedBtn: document.getElementById('deleteSelectedBtn'),
  keyword: document.getElementById('keyword'),
  statusFilter: document.getElementById('statusFilter'),
  pageSize: document.getElementById('pageSize'),
  tableBody: document.getElementById('tableBody'),
  selectAll: document.getElementById('selectAll'),
  actionsHeader: document.getElementById('actionsHeader'),
  prevPage: document.getElementById('prevPage'),
  nextPage: document.getElementById('nextPage'),
  pageInfo: document.getElementById('pageInfo'),
  statTotal: document.getElementById('statTotal'),
  statPending: document.getElementById('statPending'),
  statProcessing: document.getElementById('statProcessing'),
  statDone: document.getElementById('statDone'),
  detailModal: document.getElementById('detailModal'),
  detailContent: document.getElementById('detailContent'),
  editModal: document.getElementById('editModal'),
  editModalTitle: document.getElementById('editModalTitle'),
  editId: document.getElementById('editId'),
  editStatus: document.getElementById('editStatus'),
  saveStatusBtn: document.getElementById('saveStatusBtn')
};

elements.baseURL.value = configApi.getBaseURL();

function showNotice(message) {
  elements.notice.textContent = message;
  elements.notice.classList.remove('hidden');
}

function clearNotice() {
  elements.notice.textContent = '';
  elements.notice.classList.add('hidden');
}

function isLoggedIn() {
  return Boolean(localStorage.getItem(storageKeys.token) && state.user && state.role);
}

function setAuthMode(mode) {
  state.mode = mode;
  elements.loginTab.classList.toggle('active', mode === 'login');
  elements.registerTab.classList.toggle('active', mode === 'register');
  elements.confirmWrap.classList.toggle('hidden', mode !== 'register');
  elements.submitAuth.textContent = mode === 'login' ? '立即登录' : '提交注册';
}

function setRole(role) {
  state.role = role;
  elements.studentRoleTab.classList.toggle('active', role === 'student');
  elements.adminRoleTab.classList.toggle('active', role === 'admin');
  elements.accountLabel.textContent = role === 'student' ? '学号' : '管理员账号';
  elements.account.placeholder = role === 'student' ? '请输入学号' : '请输入管理员账号';
}

function syncDashboardByRole() {
  const isStudent = state.role === 'student';
  elements.studentPanel.classList.toggle('hidden', !isStudent);
  elements.deleteSelectedBtn.classList.toggle('hidden', false);
  elements.listTitle.textContent = isStudent ? '我的报修记录' : '报修单管理';
  elements.listDesc.textContent = isStudent
    ? '支持关键字查询、状态筛选、前端分页、详情查看和取消报修。'
    : '支持关键字查询、状态筛选、前端分页、详情查看、状态编辑和批量删除。';
  elements.actionsHeader.textContent = isStudent ? '操作' : '管理操作';
  if (isStudent && state.user) {
    elements.studentIdentity.textContent = `当前学号：${state.user.studentId}`;
    elements.studentDormitory.value = state.user.dormitory || '';
    elements.repairDorm.value = state.user.dormitory || '';
  }
}

function renderVisibility() {
  const loggedIn = isLoggedIn();
  elements.authCard.classList.toggle('hidden', loggedIn);
  elements.dashboard.classList.toggle('hidden', !loggedIn);
  elements.logoutBtn.classList.toggle('hidden', !loggedIn);
  if (loggedIn) {
    syncDashboardByRole();
  }
}

function getFilteredRepairs() {
  const keyword = state.keyword.trim().toLowerCase();
  return state.repairs.filter((item) => {
    const matchStatus = !state.status || item.status === state.status;
    const text = [item.id, item.studentId, item.dorm, item.content || ''].join(' ').toLowerCase();
    const matchKeyword = !keyword || text.includes(keyword);
    return matchStatus && matchKeyword;
  });
}

function renderStats() {
  elements.statTotal.textContent = String(state.repairs.length);
  elements.statPending.textContent = String(state.repairs.filter((item) => item.status === '待处理').length);
  elements.statProcessing.textContent = String(state.repairs.filter((item) => item.status === '处理中').length);
  elements.statDone.textContent = String(state.repairs.filter((item) => item.status === '已完成').length);
}

function renderTable() {
  const list = getFilteredRepairs();
  const totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
  if (state.page > totalPages) {
    state.page = totalPages;
  }
  const start = (state.page - 1) * state.pageSize;
  const pageItems = list.slice(start, start + state.pageSize);

  elements.pageInfo.textContent = `第 ${state.page} / ${totalPages} 页，共 ${list.length} 条`;
  elements.prevPage.disabled = state.page <= 1;
  elements.nextPage.disabled = state.page >= totalPages;

  if (!pageItems.length) {
    elements.tableBody.innerHTML = '<tr><td colspan="7">暂无符合条件的数据。</td></tr>';
    return;
  }

  elements.tableBody.innerHTML = pageItems
    .map((item) => {
      const checked = item.id && state.selectedIds.includes(item.id) ? 'checked' : '';
      const tagClass = item.status === '已完成' ? 'done' : item.status === '处理中' ? 'progress' : 'pending';
      const canEdit = state.role === 'admin';
      return `
        <tr>
          <td><input class="row-check" data-id="${item.id || ''}" type="checkbox" ${checked} /></td>
          <td>${item.id ?? '-'}</td>
          <td>${item.studentId}</td>
          <td>${item.dorm}</td>
          <td class="content">${item.content || '-'}</td>
          <td><span class="tag ${tagClass}">${item.status}</span></td>
          <td>
            <div class="toolbar">
              <button class="ghost detail-btn" data-id="${item.id || ''}">详情</button>
              ${
                canEdit
                  ? `<button class="primary edit-btn" data-id="${item.id || ''}" data-status="${item.status}">编辑状态</button>`
                  : ''
              }
              <button class="danger delete-btn" data-id="${item.id || ''}">${canEdit ? '删除' : '取消'}</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

async function loadRepairs() {
  try {
    clearNotice();
    if (state.role === 'admin') {
      state.repairs = await repairApi.getAll();
    } else {
      const list = await repairApi.getMyList(state.user.studentId);
      state.repairs = list.filter((item) => item.studentId === state.user.studentId);
    }
    renderStats();
    renderTable();
  } catch (error) {
    showNotice(error.message || '加载失败');
  }
}

async function submitAuth() {
  try {
    clearNotice();
    const account = elements.account.value.trim();
    const password = elements.password.value.trim();
    const confirmPassword = elements.confirmPassword.value.trim();
    if (!account || !password) {
      showNotice('请填写完整账号和密码');
      return;
    }
    if (state.mode === 'register' && password !== confirmPassword) {
      showNotice('两次密码输入不一致');
      return;
    }
    if (state.role === 'student') {
      if (state.mode === 'login') {
        const result = await authApi.studentLogin({ studentId: account, password });
        state.user = result.user;
        localStorage.setItem(storageKeys.token, result.token);
        localStorage.setItem(storageKeys.role, JSON.stringify('student'));
        localStorage.setItem(storageKeys.user, JSON.stringify(result.user));
        renderVisibility();
        await loadRepairs();
        showNotice('学生登录成功');
      } else {
        await authApi.studentRegister({ studentId: account, password });
        setAuthMode('login');
        showNotice('学生注册成功，请返回登录');
      }
    } else if (state.mode === 'login') {
      const result = await authApi.adminLogin({ adminId: account, password });
      state.user = result.user;
      localStorage.setItem(storageKeys.token, result.token);
      localStorage.setItem(storageKeys.role, JSON.stringify('admin'));
      localStorage.setItem(storageKeys.user, JSON.stringify(result.user));
      renderVisibility();
      await loadRepairs();
      showNotice('管理员登录成功');
    } else {
      await authApi.adminRegister({ adminId: account, password });
      setAuthMode('login');
      showNotice('管理员注册成功，请返回登录');
    }
    elements.account.value = '';
    elements.password.value = '';
    elements.confirmPassword.value = '';
  } catch (error) {
    showNotice(error.message || '提交失败');
  }
}

function logout() {
  localStorage.removeItem(storageKeys.token);
  localStorage.removeItem(storageKeys.role);
  localStorage.removeItem(storageKeys.user);
  state.user = null;
  state.repairs = [];
  state.selectedIds = [];
  renderVisibility();
  renderTable();
  showNotice('已退出登录');
}

async function openDetail(id) {
  try {
    const detail = await repairApi.getDetail(id);
    elements.detailContent.innerHTML = `
      <p><strong>编号：</strong>${detail.id ?? '-'}</p>
      <p><strong>学号：</strong>${detail.studentId}</p>
      <p><strong>宿舍号：</strong>${detail.dorm}</p>
      <p><strong>状态：</strong>${detail.status}</p>
      <p><strong>报修内容：</strong>${detail.content || '后端未返回该字段'}</p>
    `;
    elements.detailModal.classList.remove('hidden');
  } catch (error) {
    showNotice(error.message || '获取详情失败');
  }
}

function openEdit(id, status) {
  state.editingItem = { id, status };
  elements.editId.value = String(id);
  elements.editStatus.value = status;
  elements.editModalTitle.textContent = '编辑报修状态';
  elements.editModal.classList.remove('hidden');
}

async function saveStatus() {
  try {
    if (!state.editingItem?.id) {
      showNotice('缺少报修单编号');
      return;
    }
    await repairApi.updateStatus(state.editingItem.id, elements.editStatus.value);
    elements.editModal.classList.add('hidden');
    await loadRepairs();
    showNotice('状态更新成功');
  } catch (error) {
    showNotice(error.message || '状态更新失败');
  }
}

async function deleteRepairs(ids) {
  if (!ids.length) {
    showNotice('请选择要删除的数据');
    return;
  }
  if (!window.confirm(`确认删除 ${ids.length} 条报修单吗？`)) {
    return;
  }
  try {
    await repairApi.deleteByIds(ids);
    state.selectedIds = [];
    elements.selectAll.checked = false;
    await loadRepairs();
    showNotice('删除成功');
  } catch (error) {
    showNotice(error.message || '删除失败');
  }
}

async function saveDormitory() {
  if (!state.user || state.role !== 'student') {
    return;
  }
  if (!elements.studentDormitory.value.trim()) {
    showNotice('请输入宿舍号');
    return;
  }
  try {
    await studentApi.bindDorm({
      studentId: state.user.studentId,
      password: state.user.password,
      dormitory: elements.studentDormitory.value.trim()
    });
    state.user = {
      ...state.user,
      dormitory: elements.studentDormitory.value.trim()
    };
    localStorage.setItem(storageKeys.user, JSON.stringify(state.user));
    elements.repairDorm.value = state.user.dormitory || '';
    showNotice('宿舍信息更新成功');
  } catch (error) {
    showNotice(error.message || '宿舍更新失败');
  }
}

async function createRepair() {
  if (!state.user || state.role !== 'student') {
    return;
  }
  const dorm = elements.repairDorm.value.trim();
  const content = elements.repairContent.value.trim();
  if (!dorm || !content) {
    showNotice('请填写宿舍号和报修内容');
    return;
  }
  try {
    await repairApi.create({
      studentId: state.user.studentId,
      dorm,
      content,
      status: '待处理'
    });
    elements.repairContent.value = '';
    await loadRepairs();
    showNotice('报修单创建成功');
  } catch (error) {
    showNotice(error.message || '创建报修单失败');
  }
}

async function updatePassword() {
  if (!state.user || state.role !== 'student') {
    return;
  }
  const oldPassword = elements.oldPassword.value.trim();
  const newPassword = elements.newPassword.value.trim();
  const confirmNewPassword = elements.confirmNewPassword.value.trim();
  if (!oldPassword || !newPassword) {
    showNotice('请填写完整密码信息');
    return;
  }
  if (newPassword !== confirmNewPassword) {
    showNotice('两次新密码输入不一致');
    return;
  }
  try {
    await studentApi.updatePassword({
      studentId: state.user.studentId,
      oldPassword,
      newPassword
    });
    state.user = { ...state.user, password: newPassword };
    localStorage.setItem(storageKeys.user, JSON.stringify(state.user));
    elements.oldPassword.value = '';
    elements.newPassword.value = '';
    elements.confirmNewPassword.value = '';
    showNotice('密码修改成功');
  } catch (error) {
    showNotice(error.message || '密码修改失败');
  }
}

elements.saveBaseURL.addEventListener('click', () => {
  configApi.setBaseURL(elements.baseURL.value.trim());
  elements.baseURL.value = configApi.getBaseURL();
  showNotice('后端地址已保存');
});

elements.loginTab.addEventListener('click', () => setAuthMode('login'));
elements.registerTab.addEventListener('click', () => setAuthMode('register'));
elements.studentRoleTab.addEventListener('click', () => setRole('student'));
elements.adminRoleTab.addEventListener('click', () => setRole('admin'));
elements.submitAuth.addEventListener('click', () => void submitAuth());
elements.logoutBtn.addEventListener('click', logout);
elements.saveDormBtn.addEventListener('click', () => void saveDormitory());
elements.createRepairBtn.addEventListener('click', () => void createRepair());
elements.updatePasswordBtn.addEventListener('click', () => void updatePassword());
elements.refreshBtn.addEventListener('click', () => void loadRepairs());
elements.deleteSelectedBtn.addEventListener('click', () => void deleteRepairs(state.selectedIds));
elements.keyword.addEventListener('input', (event) => {
  state.keyword = event.target.value;
  state.page = 1;
  renderTable();
});
elements.statusFilter.addEventListener('change', (event) => {
  state.status = event.target.value;
  state.page = 1;
  renderTable();
});
elements.pageSize.addEventListener('change', (event) => {
  state.pageSize = Number(event.target.value);
  state.page = 1;
  renderTable();
});
elements.prevPage.addEventListener('click', () => {
  state.page -= 1;
  renderTable();
});
elements.nextPage.addEventListener('click', () => {
  state.page += 1;
  renderTable();
});
elements.selectAll.addEventListener('change', (event) => {
  const checked = event.target.checked;
  const visibleIds = getFilteredRepairs()
    .slice((state.page - 1) * state.pageSize, state.page * state.pageSize)
    .map((item) => item.id)
    .filter((id) => typeof id === 'number');
  state.selectedIds = checked ? visibleIds : [];
  renderTable();
});
elements.tableBody.addEventListener('click', (event) => {
  const target = event.target;
  if (target.classList.contains('detail-btn')) {
    void openDetail(Number(target.dataset.id));
  }
  if (target.classList.contains('edit-btn')) {
    openEdit(Number(target.dataset.id), target.dataset.status || '待处理');
  }
  if (target.classList.contains('delete-btn')) {
    void deleteRepairs([Number(target.dataset.id)]);
  }
});
elements.tableBody.addEventListener('change', (event) => {
  const target = event.target;
  if (!target.classList.contains('row-check')) {
    return;
  }
  const id = Number(target.dataset.id);
  state.selectedIds = target.checked
    ? [...new Set([...state.selectedIds, id])]
    : state.selectedIds.filter((item) => item !== id);
});
elements.saveStatusBtn.addEventListener('click', () => void saveStatus());

document.querySelectorAll('[data-close]').forEach((button) => {
  button.addEventListener('click', () => {
    document.getElementById(button.dataset.close).classList.add('hidden');
  });
});

renderVisibility();
renderTable();
setAuthMode('login');
setRole(state.role || 'student');
if (isLoggedIn()) {
  void loadRepairs();
}
