<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { apiConfig, authApi, repairApi, studentApi, TOKEN_KEY } from './api';
import type { AdminUser, RepairItem, StudentUser, UserRole } from './types';

const USER_KEY = 'repair-user';
const ROLE_KEY = 'repair-role';

const authMode = ref<'login' | 'register'>('login');
const activeRole = ref<UserRole>('student');
const baseURL = ref(apiConfig.getBaseURL());

const authForm = reactive({
  account: '',
  password: '',
  confirmPassword: ''
});

const dormForm = reactive({
  dormitory: ''
});

const repairForm = reactive<RepairItem>({
  studentId: '',
  dorm: '',
  content: '',
  status: '待处理'
});

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const searchForm = reactive({
  keyword: '',
  status: ''
});

const pager = reactive({
  page: 1,
  size: 5
});

const repairs = ref<RepairItem[]>([]);
const tableSelection = ref<RepairItem[]>([]);
const detailDialogVisible = ref(false);
const statusDialogVisible = ref(false);
const detailItem = ref<RepairItem | null>(null);
const editingItem = ref<RepairItem | null>(null);
const editingStatus = ref('待处理');
const loading = ref(false);

function parseStorage<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

const currentRole = ref<UserRole | null>(parseStorage<UserRole>(ROLE_KEY));
const currentUser = ref<StudentUser | AdminUser | null>(parseStorage<StudentUser | AdminUser>(USER_KEY));

const isLoggedIn = computed(() => Boolean(localStorage.getItem(TOKEN_KEY) && currentRole.value && currentUser.value));
const isAdmin = computed(() => currentRole.value === 'admin');
const currentStudent = computed(() => (currentRole.value === 'student' ? (currentUser.value as StudentUser) : null));

const filteredRepairs = computed(() => {
  const keyword = searchForm.keyword.trim().toLowerCase();
  return repairs.value.filter((item) => {
    const matchStatus = !searchForm.status || item.status === searchForm.status;
    const fields = [item.studentId, item.dorm, item.content ?? '', String(item.id ?? '')].join(' ').toLowerCase();
    const matchKeyword = !keyword || fields.includes(keyword);
    return matchStatus && matchKeyword;
  });
});

const pagedRepairs = computed(() => {
  const start = (pager.page - 1) * pager.size;
  return filteredRepairs.value.slice(start, start + pager.size);
});

const stats = computed(() => {
  const total = repairs.value.length;
  const pending = repairs.value.filter((item) => item.status === '待处理').length;
  const processing = repairs.value.filter((item) => item.status === '处理中').length;
  const done = repairs.value.filter((item) => item.status === '已完成').length;
  return { total, pending, processing, done };
});

function handleSelectionChange(rows: RepairItem[]) {
  tableSelection.value = rows;
}

watch(
  () => [searchForm.keyword, searchForm.status, pager.size],
  () => {
    pager.page = 1;
  }
);

watch(
  currentStudent,
  (student) => {
    if (student) {
      dormForm.dormitory = student.dormitory || '';
      repairForm.studentId = student.studentId;
      repairForm.dorm = student.dormitory || '';
    }
  },
  { immediate: true }
);

function saveSession(role: UserRole, user: StudentUser | AdminUser, token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(ROLE_KEY, JSON.stringify(role));
  currentRole.value = role;
  currentUser.value = user;
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ROLE_KEY);
  currentRole.value = null;
  currentUser.value = null;
  repairs.value = [];
  tableSelection.value = [];
}

async function loadRepairs() {
  if (!isLoggedIn.value) {
    return;
  }
  loading.value = true;
  try {
    if (isAdmin.value) {
      repairs.value = await repairApi.getAll();
    } else {
      const student = currentStudent.value;
      if (!student) {
        repairs.value = [];
      } else {
        const list = await repairApi.getMyList(student.studentId);
        repairs.value = list.filter((item) => item.studentId === student.studentId);
      }
    }
  } catch (error) {
    ElMessage.error((error as Error).message || '加载报修单失败');
  } finally {
    loading.value = false;
  }
}

async function handleAuthSubmit() {
  try {
    if (!authForm.account || !authForm.password) {
      ElMessage.warning('请填写完整账号和密码');
      return;
    }
    if (authMode.value === 'register' && authForm.password !== authForm.confirmPassword) {
      ElMessage.warning('两次密码输入不一致');
      return;
    }

    if (activeRole.value === 'student') {
      if (authMode.value === 'login') {
        const result = await authApi.studentLogin({
          studentId: authForm.account,
          password: authForm.password
        });
        saveSession('student', result.user, result.token);
        ElMessage.success('学生登录成功');
      } else {
        await authApi.studentRegister({
          studentId: authForm.account,
          password: authForm.password
        });
        ElMessage.success('学生注册成功，请返回登录');
        authMode.value = 'login';
      }
    } else if (authMode.value === 'login') {
      const result = await authApi.adminLogin({
        adminId: authForm.account,
        password: authForm.password
      });
      saveSession('admin', result.user, result.token);
      ElMessage.success('管理员登录成功');
    } else {
      await authApi.adminRegister({
        adminId: authForm.account,
        password: authForm.password
      });
      ElMessage.success('管理员注册成功，请返回登录');
      authMode.value = 'login';
    }

    authForm.account = '';
    authForm.password = '';
    authForm.confirmPassword = '';
    await loadRepairs();
  } catch (error) {
    ElMessage.error((error as Error).message || '提交失败');
  }
}

function logout() {
  clearSession();
  ElMessage.success('已退出登录');
}

function updateBaseURL() {
  if (!baseURL.value.trim()) {
    ElMessage.warning('请输入后端地址');
    return;
  }
  apiConfig.setBaseURL(baseURL.value);
  baseURL.value = apiConfig.getBaseURL();
  ElMessage.success('后端地址已保存');
}

async function submitDormitory() {
  const student = currentStudent.value;
  if (!student) {
    return;
  }
  if (!dormForm.dormitory) {
    ElMessage.warning('请填写宿舍号');
    return;
  }
  try {
    await studentApi.bindDorm({
      studentId: student.studentId,
      password: student.password,
      dormitory: dormForm.dormitory
    });
    const updated = { ...student, dormitory: dormForm.dormitory };
    currentUser.value = updated;
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    repairForm.dorm = dormForm.dormitory;
    ElMessage.success('宿舍信息已更新');
  } catch (error) {
    ElMessage.error((error as Error).message || '宿舍更新失败');
  }
}

async function submitRepair() {
  const student = currentStudent.value;
  if (!student) {
    return;
  }
  if (!repairForm.dorm || !repairForm.content) {
    ElMessage.warning('请填写宿舍号和报修内容');
    return;
  }
  try {
    await repairApi.create({
      studentId: student.studentId,
      dorm: repairForm.dorm,
      content: repairForm.content,
      status: '待处理'
    });
    repairForm.content = '';
    await loadRepairs();
    ElMessage.success('报修单创建成功');
  } catch (error) {
    ElMessage.error((error as Error).message || '创建报修单失败');
  }
}

async function submitPassword() {
  const student = currentStudent.value;
  if (!student) {
    return;
  }
  if (!passwordForm.oldPassword || !passwordForm.newPassword) {
    ElMessage.warning('请填写完整密码信息');
    return;
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElMessage.warning('两次新密码输入不一致');
    return;
  }
  try {
    await studentApi.updatePassword({
      studentId: student.studentId,
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    });
    const updated = { ...student, password: passwordForm.newPassword };
    currentUser.value = updated;
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    passwordForm.oldPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
    ElMessage.success('密码修改成功');
  } catch (error) {
    ElMessage.error((error as Error).message || '修改密码失败');
  }
}

async function openDetail(item: RepairItem) {
  try {
    detailItem.value = item.id ? await repairApi.getDetail(item.id) : item;
  } catch {
    detailItem.value = item;
  }
  detailDialogVisible.value = true;
}

function openStatusDialog(item: RepairItem) {
  editingItem.value = item;
  editingStatus.value = item.status;
  statusDialogVisible.value = true;
}

async function submitStatus() {
  if (!editingItem.value?.id) {
    ElMessage.warning('缺少报修单编号');
    return;
  }
  try {
    await repairApi.updateStatus(editingItem.value.id, editingStatus.value);
    statusDialogVisible.value = false;
    await loadRepairs();
    ElMessage.success('状态更新成功');
  } catch (error) {
    ElMessage.error((error as Error).message || '状态更新失败');
  }
}

async function removeRepairs(rows: RepairItem[]) {
  const ids = rows.map((row) => row.id).filter((id): id is number => typeof id === 'number');
  if (!ids.length) {
    ElMessage.warning('请选择有编号的报修单');
    return;
  }
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${ids.length} 条报修单吗？`, '删除确认', {
      type: 'warning'
    });
    await repairApi.deleteByIds(ids);
    await loadRepairs();
    ElMessage.success('删除成功');
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message || '删除失败');
    }
  }
}

if (isLoggedIn.value) {
  void loadRepairs();
}
</script>

<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1>宿舍报修管理系统</h1>
        <p>Vue3 + Element Plus + Axios，适配当前 Spring Boot 后端接口。</p>
      </div>
      <div class="toolbar">
        <el-input v-model="baseURL" placeholder="后端地址，例如 http://localhost:8080" style="width: 320px" />
        <el-button type="primary" @click="updateBaseURL">保存地址</el-button>
        <el-button v-if="isLoggedIn" @click="logout">退出登录</el-button>
      </div>
    </div>

    <el-card v-if="!isLoggedIn" class="auth-card" shadow="hover">
      <template #header>
        <div class="page-header" style="margin-bottom: 0">
          <div>
            <h1 style="font-size: 22px">账号入口</h1>
            <p>支持学生与管理员登录/注册。</p>
          </div>
        </div>
      </template>
      <el-form label-width="90px">
        <el-form-item label="操作类型">
          <el-radio-group v-model="authMode">
            <el-radio-button label="login">登录</el-radio-button>
            <el-radio-button label="register">注册</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="角色">
          <el-radio-group v-model="activeRole">
            <el-radio-button label="student">学生</el-radio-button>
            <el-radio-button label="admin">管理员</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="activeRole === 'student' ? '学号' : '管理员账号'">
          <el-input v-model="authForm.account" placeholder="请输入账号" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="authForm.password" show-password placeholder="请输入密码" />
        </el-form-item>
        <el-form-item v-if="authMode === 'register'" label="确认密码">
          <el-input v-model="authForm.confirmPassword" show-password placeholder="请再次输入密码" />
        </el-form-item>
        <div class="footer-actions">
          <el-button type="primary" @click="handleAuthSubmit">
            {{ authMode === 'login' ? '立即登录' : '提交注册' }}
          </el-button>
        </div>
      </el-form>
    </el-card>

    <template v-else>
      <div class="stats-row">
        <div class="stat-card">
          <span class="label">报修总数</span>
          <span class="value">{{ stats.total }}</span>
        </div>
        <div class="stat-card">
          <span class="label">待处理</span>
          <span class="value">{{ stats.pending }}</span>
        </div>
        <div class="stat-card">
          <span class="label">处理中</span>
          <span class="value">{{ stats.processing }}</span>
        </div>
        <div class="stat-card">
          <span class="label">已完成</span>
          <span class="value">{{ stats.done }}</span>
        </div>
      </div>

      <div v-if="!isAdmin" class="grid two">
        <div class="grid">
          <el-card shadow="hover">
            <h3 class="panel-title">学生信息</h3>
            <p class="muted">当前学号：{{ currentStudent?.studentId }}</p>
            <el-form label-width="88px">
              <el-form-item label="宿舍号">
                <el-input v-model="dormForm.dormitory" placeholder="例如 6-302" />
              </el-form-item>
              <div class="footer-actions">
                <el-button type="primary" @click="submitDormitory">绑定/修改宿舍</el-button>
              </div>
            </el-form>
          </el-card>

          <el-card shadow="hover">
            <h3 class="panel-title">创建报修单</h3>
            <el-form label-width="88px">
              <el-form-item label="宿舍号">
                <el-input v-model="repairForm.dorm" placeholder="请输入报修宿舍号" />
              </el-form-item>
              <el-form-item label="报修内容">
                <el-input
                  v-model="repairForm.content"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入问题描述，例如水管漏水、门锁损坏等"
                />
              </el-form-item>
              <div class="footer-actions">
                <el-button type="primary" @click="submitRepair">新增报修</el-button>
              </div>
            </el-form>
          </el-card>

          <el-card shadow="hover">
            <h3 class="panel-title">修改密码</h3>
            <el-form label-width="88px">
              <el-form-item label="旧密码">
                <el-input v-model="passwordForm.oldPassword" show-password />
              </el-form-item>
              <el-form-item label="新密码">
                <el-input v-model="passwordForm.newPassword" show-password />
              </el-form-item>
              <el-form-item label="确认密码">
                <el-input v-model="passwordForm.confirmPassword" show-password />
              </el-form-item>
              <div class="footer-actions">
                <el-button type="primary" @click="submitPassword">更新密码</el-button>
              </div>
            </el-form>
          </el-card>
        </div>

        <el-card shadow="hover">
          <div class="page-header">
            <div>
              <h3 class="panel-title">我的报修记录</h3>
              <p class="muted">支持关键字检索、前端分页和取消报修单。</p>
            </div>
            <div class="toolbar">
              <el-button @click="loadRepairs">刷新</el-button>
              <el-button type="danger" plain @click="removeRepairs(tableSelection)">取消所选</el-button>
            </div>
          </div>

          <el-form inline>
            <el-form-item label="关键字">
              <el-input v-model="searchForm.keyword" placeholder="编号 / 宿舍 / 内容" clearable />
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="searchForm.status" clearable placeholder="全部状态" style="width: 140px">
                <el-option label="待处理" value="待处理" />
                <el-option label="处理中" value="处理中" />
                <el-option label="已完成" value="已完成" />
              </el-select>
            </el-form-item>
          </el-form>

          <el-table
            v-loading="loading"
            :data="pagedRepairs"
            border
            style="width: 100%"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="48" />
            <el-table-column prop="id" label="编号" width="80" />
            <el-table-column prop="studentId" label="学号" width="140" />
            <el-table-column prop="dorm" label="宿舍号" width="120" />
            <el-table-column prop="content" label="报修内容" min-width="220" show-overflow-tooltip />
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="row.status === '已完成' ? 'success' : row.status === '处理中' ? 'warning' : 'info'">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openDetail(row)">详情</el-button>
                <el-button link type="danger" @click="removeRepairs([row])">取消</el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-empty v-if="!filteredRepairs.length" description="暂无符合条件的报修单" />

          <div class="footer-actions" style="margin-top: 16px">
            <el-pagination
              v-model:current-page="pager.page"
              v-model:page-size="pager.size"
              background
              layout="total, sizes, prev, pager, next"
              :page-sizes="[5, 10, 20]"
              :total="filteredRepairs.length"
            />
          </div>
        </el-card>
      </div>

      <el-card v-else shadow="hover">
        <div class="page-header">
          <div>
            <h3 class="panel-title">报修单管理</h3>
            <p class="muted">包含查询、分页、详情、状态编辑和删除能力。</p>
          </div>
          <div class="toolbar">
            <el-button @click="loadRepairs">刷新列表</el-button>
            <el-button type="danger" plain @click="removeRepairs(tableSelection)">批量删除</el-button>
          </div>
        </div>

        <el-form inline>
          <el-form-item label="关键字">
            <el-input v-model="searchForm.keyword" placeholder="编号 / 学号 / 宿舍 / 内容" clearable />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" clearable placeholder="全部状态" style="width: 140px">
              <el-option label="待处理" value="待处理" />
              <el-option label="处理中" value="处理中" />
              <el-option label="已完成" value="已完成" />
            </el-select>
          </el-form-item>
        </el-form>

        <el-table
          v-loading="loading"
          :data="pagedRepairs"
          border
          style="width: 100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="48" />
          <el-table-column prop="id" label="编号" width="80" />
          <el-table-column prop="studentId" label="学号" width="140" />
          <el-table-column prop="dorm" label="宿舍号" width="120" />
          <el-table-column prop="content" label="报修内容" min-width="260" show-overflow-tooltip />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="row.status === '已完成' ? 'success' : row.status === '处理中' ? 'warning' : 'info'">
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">详情</el-button>
              <el-button link type="warning" @click="openStatusDialog(row)">编辑状态</el-button>
              <el-button link type="danger" @click="removeRepairs([row])">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-empty v-if="!filteredRepairs.length" description="暂无符合条件的数据" />

        <div class="footer-actions" style="margin-top: 16px">
          <el-pagination
            v-model:current-page="pager.page"
            v-model:page-size="pager.size"
            background
            layout="total, sizes, prev, pager, next"
            :page-sizes="[5, 10, 20]"
            :total="filteredRepairs.length"
          />
        </div>
      </el-card>
    </template>

    <el-dialog v-model="detailDialogVisible" title="报修单详情" width="520px">
      <el-descriptions v-if="detailItem" :column="1" border>
        <el-descriptions-item label="编号">{{ detailItem.id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="学号">{{ detailItem.studentId }}</el-descriptions-item>
        <el-descriptions-item label="宿舍号">{{ detailItem.dorm }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detailItem.status }}</el-descriptions-item>
        <el-descriptions-item label="报修内容">{{ detailItem.content || '后端未返回该字段' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <el-dialog v-model="statusDialogVisible" title="编辑报修状态" width="420px">
      <el-form label-width="88px">
        <el-form-item label="报修编号">
          <el-input :model-value="editingItem?.id" disabled />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editingStatus" placeholder="请选择状态" style="width: 100%">
            <el-option label="待处理" value="待处理" />
            <el-option label="处理中" value="处理中" />
            <el-option label="已完成" value="已完成" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="footer-actions">
          <el-button @click="statusDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitStatus">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
