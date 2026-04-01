import { authApi, configApi, repairApi, storageKeys, type RepairItem } from './api';

interface AppState {
  mode: 'login' | 'register';
  repairs: RepairItem[];
  selectedIds: number[];
  page: number;
  pageSize: number;
  keyword: string;
  status: string;
  editingItem: { id: number; status: string } | null;
}

const state: AppState = {
  mode: 'login',
  repairs: [],
  selectedIds: [],
  page: 1,
  pageSize: 5,
  keyword: '',
  status: '',
  editingItem: null
};

const baseURLInput = document.getElementById('baseURL') as HTMLInputElement;
const notice = document.getElementById('notice') as HTMLDivElement;
const tableBody = document.getElementById('tableBody') as HTMLTableSectionElement;
const pageInfo = document.getElementById('pageInfo') as HTMLSpanElement;

baseURLInput.value = configApi.getBaseURL();

function showNotice(message: string): void {
  notice.textContent = message;
  notice.classList.remove('hidden');
}

function clearNotice(): void {
  notice.textContent = '';
  notice.classList.add('hidden');
}

function getFilteredRepairs(): RepairItem[] {
  const keyword = state.keyword.trim().toLowerCase();
  return state.repairs.filter((item) => {
    const matchStatus = !state.status || item.status === state.status;
    const text = [item.id, item.studentId, item.dorm, item.content || ''].join(' ').toLowerCase();
    const matchKeyword = !keyword || text.includes(keyword);
    return matchStatus && matchKeyword;
  });
}

function renderTable(): void {
  const list = getFilteredRepairs();
  const totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
  if (state.page > totalPages) {
    state.page = totalPages;
  }
  pageInfo.textContent = `第 ${state.page} / ${totalPages} 页，共 ${list.length} 条`;
  const pageItems = list.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
  tableBody.innerHTML = pageItems.length
    ? pageItems
        .map(
          (item) => `
            <tr>
              <td>${item.id ?? '-'}</td>
              <td>${item.studentId}</td>
              <td>${item.dorm}</td>
              <td>${item.content || '-'}</td>
              <td>${item.status}</td>
            </tr>
          `
        )
        .join('')
    : '<tr><td colspan="5">暂无数据</td></tr>';
}

async function loadRepairs(): Promise<void> {
  try {
    clearNotice();
    state.repairs = await repairApi.getAll();
    renderTable();
  } catch (error) {
    showNotice((error as Error).message || '加载失败');
  }
}

async function demoLogin(): Promise<void> {
  try {
    clearNotice();
    const result = await authApi.adminLogin({ adminId: 'admin', password: '123456' });
    localStorage.setItem(storageKeys.token, result.token);
    showNotice('TypeScript 源码示例可正常调用后端接口');
    await loadRepairs();
  } catch (error) {
    showNotice((error as Error).message || '示例登录失败');
  }
}

void demoLogin();
