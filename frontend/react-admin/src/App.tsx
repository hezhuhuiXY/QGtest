import { useEffect, useMemo, useState } from 'react';
import { apiConfig, authApi, repairApi, storageKeys, studentApi } from './api';
import type { AdminUser, RepairItem, StudentUser, UserRole } from './types';

const pageSizeOptions = [5, 10, 20];

function parseJSON<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

function App() {
  const [baseURL, setBaseURL] = useState(apiConfig.getBaseURL());
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<UserRole | null>(parseJSON<UserRole>(storageKeys.role));
  const [activeRole, setActiveRole] = useState<UserRole>('admin');
  const [user, setUser] = useState<AdminUser | StudentUser | null>(
    parseJSON<AdminUser | StudentUser>(storageKeys.user)
  );
  const [authForm, setAuthForm] = useState({ account: '', password: '', confirmPassword: '' });
  const [repairs, setRepairs] = useState<RepairItem[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [detailItem, setDetailItem] = useState<RepairItem | null>(null);
  const [editingItem, setEditingItem] = useState<RepairItem | null>(null);
  const [editingStatus, setEditingStatus] = useState('待处理');
  const [notice, setNotice] = useState('');
  const [studentDorm, setStudentDorm] = useState('');
  const [studentRepair, setStudentRepair] = useState({ dorm: '', content: '' });
  const [studentPwd, setStudentPwd] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  const loggedIn = Boolean(localStorage.getItem(storageKeys.token) && role && user);
  const studentUser = role === 'student' ? (user as StudentUser | null) : null;

  useEffect(() => {
    if (studentUser) {
      setStudentDorm(studentUser.dormitory || '');
      setStudentRepair((prev) => ({ ...prev, dorm: studentUser.dormitory || '' }));
    }
  }, [studentUser]);

  const filteredRepairs = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    return repairs.filter((item) => {
      const matchStatus = !searchStatus || item.status === searchStatus;
      const allText = [item.id, item.studentId, item.dorm, item.content ?? ''].join(' ').toLowerCase();
      const matchKeyword = !keyword || allText.includes(keyword);
      return matchStatus && matchKeyword;
    });
  }, [repairs, searchKeyword, searchStatus]);

  const pagedRepairs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRepairs.slice(start, start + pageSize);
  }, [filteredRepairs, page, pageSize]);

  const stats = useMemo(() => {
    const total = repairs.length;
    const pending = repairs.filter((item) => item.status === '待处理').length;
    const processing = repairs.filter((item) => item.status === '处理中').length;
    const done = repairs.filter((item) => item.status === '已完成').length;
    return { total, pending, processing, done };
  }, [repairs]);

  useEffect(() => {
    setPage(1);
  }, [searchKeyword, searchStatus, pageSize]);

  useEffect(() => {
    if (loggedIn) {
      void loadRepairs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRepairs() {
    if (!loggedIn || !role) {
      return;
    }
    setLoading(true);
    try {
      const list = role === 'admin' ? await repairApi.getAll() : await repairApi.getMyList(studentUser!.studentId);
      setRepairs(role === 'student' ? list.filter((item) => item.studentId === studentUser!.studentId) : list);
    } catch (error) {
      setNotice((error as Error).message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }

  function persistSession(nextRole: UserRole, nextUser: AdminUser | StudentUser, token: string) {
    localStorage.setItem(storageKeys.role, JSON.stringify(nextRole));
    localStorage.setItem(storageKeys.user, JSON.stringify(nextUser));
    localStorage.setItem(storageKeys.token, token);
    setRole(nextRole);
    setUser(nextUser);
  }

  async function handleAuthSubmit() {
    try {
      if (!authForm.account || !authForm.password) {
        setNotice('请填写完整账号和密码');
        return;
      }
      if (mode === 'register' && authForm.password !== authForm.confirmPassword) {
        setNotice('两次密码输入不一致');
        return;
      }

      if (activeRole === 'student') {
        if (mode === 'login') {
          const result = await authApi.studentLogin({ studentId: authForm.account, password: authForm.password });
          persistSession('student', result.user, result.token);
        } else {
          await authApi.studentRegister({ studentId: authForm.account, password: authForm.password });
          setNotice('学生注册成功，请重新登录');
          setMode('login');
        }
      } else if (mode === 'login') {
        const result = await authApi.adminLogin({ adminId: authForm.account, password: authForm.password });
        persistSession('admin', result.user, result.token);
      } else {
        await authApi.adminRegister({ adminId: authForm.account, password: authForm.password });
        setNotice('管理员注册成功，请重新登录');
        setMode('login');
      }

      setAuthForm({ account: '', password: '', confirmPassword: '' });
      await loadRepairs();
    } catch (error) {
      setNotice((error as Error).message || '提交失败');
    }
  }

  function saveBaseURL() {
    if (!baseURL.trim()) {
      setNotice('请输入后端地址');
      return;
    }
    apiConfig.setBaseURL(baseURL);
    setBaseURL(apiConfig.getBaseURL());
    setNotice('后端地址已保存');
  }

  function logout() {
    localStorage.removeItem(storageKeys.role);
    localStorage.removeItem(storageKeys.user);
    localStorage.removeItem(storageKeys.token);
    setRole(null);
    setUser(null);
    setRepairs([]);
    setSelectedIds([]);
    setNotice('已退出登录');
  }

  async function openDetail(item: RepairItem) {
    try {
      if (item.id) {
        const detail = await repairApi.getDetail(item.id);
        setDetailItem(detail);
      } else {
        setDetailItem(item);
      }
    } catch {
      setDetailItem(item);
    }
  }

  async function removeRepairs(ids: number[]) {
    if (!ids.length) {
      setNotice('请选择要删除的数据');
      return;
    }
    if (!window.confirm(`确认删除 ${ids.length} 条报修单吗？`)) {
      return;
    }
    try {
      await repairApi.deleteByIds(ids);
      setSelectedIds([]);
      await loadRepairs();
      setNotice('删除成功');
    } catch (error) {
      setNotice((error as Error).message || '删除失败');
    }
  }

  async function submitStatus() {
    if (!editingItem?.id) {
      setNotice('缺少报修单编号');
      return;
    }
    try {
      await repairApi.updateStatus(editingItem.id, editingStatus);
      setEditingItem(null);
      await loadRepairs();
      setNotice('状态更新成功');
    } catch (error) {
      setNotice((error as Error).message || '状态更新失败');
    }
  }

  async function submitDormitory() {
    if (!studentUser) {
      return;
    }
    try {
      await studentApi.bindDorm({
        studentId: studentUser.studentId,
        password: studentUser.password,
        dormitory: studentDorm
      });
      const nextUser = { ...studentUser, dormitory: studentDorm };
      setUser(nextUser);
      localStorage.setItem(storageKeys.user, JSON.stringify(nextUser));
      setStudentRepair((prev) => ({ ...prev, dorm: studentDorm }));
      setNotice('宿舍信息已更新');
    } catch (error) {
      setNotice((error as Error).message || '宿舍更新失败');
    }
  }

  async function submitRepair() {
    if (!studentUser) {
      return;
    }
    try {
      await repairApi.create({
        studentId: studentUser.studentId,
        dorm: studentRepair.dorm,
        content: studentRepair.content,
        status: '待处理'
      });
      setStudentRepair((prev) => ({ ...prev, content: '' }));
      await loadRepairs();
      setNotice('报修单创建成功');
    } catch (error) {
      setNotice((error as Error).message || '报修单创建失败');
    }
  }

  async function submitPassword() {
    if (!studentUser) {
      return;
    }
    if (studentPwd.newPassword !== studentPwd.confirmPassword) {
      setNotice('两次新密码输入不一致');
      return;
    }
    try {
      await studentApi.updatePassword({
        studentId: studentUser.studentId,
        oldPassword: studentPwd.oldPassword,
        newPassword: studentPwd.newPassword
      });
      const nextUser = { ...studentUser, password: studentPwd.newPassword };
      setUser(nextUser);
      localStorage.setItem(storageKeys.user, JSON.stringify(nextUser));
      setStudentPwd({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setNotice('密码修改成功');
    } catch (error) {
      setNotice((error as Error).message || '密码修改失败');
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="title">
          <h1>宿舍报修管理系统</h1>
          <p>React + Axios 前端页面，覆盖登录、注册、查询表单、表格、弹窗编辑和接口请求。</p>
        </div>
        <div className="toolbar">
          <input
            value={baseURL}
            onChange={(event) => setBaseURL(event.target.value)}
            style={{ width: 320 }}
            placeholder="http://localhost:8080"
          />
          <button className="primary-btn" onClick={saveBaseURL}>
            保存地址
          </button>
          {loggedIn && (
            <button className="ghost-btn" onClick={logout}>
              退出登录
            </button>
          )}
        </div>
      </div>

      {!!notice && (
        <div className="card" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
          {notice}
        </div>
      )}

      {!loggedIn ? (
        <div className="card auth-card">
          <div className="section-head">
            <strong>{mode === 'login' ? '账号登录' : '账号注册'}</strong>
            <div className="auth-switch">
              <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
                登录
              </button>
              <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
                注册
              </button>
            </div>
          </div>
          <div className="auth-switch" style={{ margin: '16px 0' }}>
            <button className={activeRole === 'student' ? 'active' : ''} onClick={() => setActiveRole('student')}>
              学生
            </button>
            <button className={activeRole === 'admin' ? 'active' : ''} onClick={() => setActiveRole('admin')}>
              管理员
            </button>
          </div>
          <div className="field">
            <label>{activeRole === 'student' ? '学号' : '管理员账号'}</label>
            <input
              value={authForm.account}
              onChange={(event) => setAuthForm({ ...authForm, account: event.target.value })}
              placeholder="请输入账号"
            />
          </div>
          <div className="field">
            <label>密码</label>
            <input
              type="password"
              value={authForm.password}
              onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
              placeholder="请输入密码"
            />
          </div>
          {mode === 'register' && (
            <div className="field">
              <label>确认密码</label>
              <input
                type="password"
                value={authForm.confirmPassword}
                onChange={(event) => setAuthForm({ ...authForm, confirmPassword: event.target.value })}
                placeholder="请再次输入密码"
              />
            </div>
          )}
          <button className="primary-btn" onClick={handleAuthSubmit}>
            {mode === 'login' ? '立即登录' : '提交注册'}
          </button>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span>报修总数</span>
              <strong>{stats.total}</strong>
            </div>
            <div className="stat-card">
              <span>待处理</span>
              <strong>{stats.pending}</strong>
            </div>
            <div className="stat-card">
              <span>处理中</span>
              <strong>{stats.processing}</strong>
            </div>
            <div className="stat-card">
              <span>已完成</span>
              <strong>{stats.done}</strong>
            </div>
          </div>

          {role === 'student' && studentUser && (
            <>
              <div className="card">
                <div className="section-head">
                  <strong>学生自助</strong>
                  <span className="muted">当前学号：{studentUser.studentId}</span>
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label>宿舍号</label>
                    <input value={studentDorm} onChange={(event) => setStudentDorm(event.target.value)} />
                  </div>
                  <button className="primary-btn" onClick={submitDormitory}>
                    绑定/修改宿舍
                  </button>
                </div>
                <div className="form-grid" style={{ marginTop: 14 }}>
                  <div className="field">
                    <label>报修宿舍</label>
                    <input
                      value={studentRepair.dorm}
                      onChange={(event) => setStudentRepair({ ...studentRepair, dorm: event.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>报修内容</label>
                    <textarea
                      value={studentRepair.content}
                      onChange={(event) => setStudentRepair({ ...studentRepair, content: event.target.value })}
                    />
                  </div>
                  <button className="primary-btn" onClick={submitRepair}>
                    创建报修单
                  </button>
                </div>
                <div className="form-grid" style={{ marginTop: 14 }}>
                  <div className="field">
                    <label>旧密码</label>
                    <input
                      type="password"
                      value={studentPwd.oldPassword}
                      onChange={(event) => setStudentPwd({ ...studentPwd, oldPassword: event.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>新密码</label>
                    <input
                      type="password"
                      value={studentPwd.newPassword}
                      onChange={(event) => setStudentPwd({ ...studentPwd, newPassword: event.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>确认密码</label>
                    <input
                      type="password"
                      value={studentPwd.confirmPassword}
                      onChange={(event) => setStudentPwd({ ...studentPwd, confirmPassword: event.target.value })}
                    />
                  </div>
                  <button className="primary-btn" onClick={submitPassword}>
                    修改密码
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="card">
            <div className="section-head">
              <div>
                <strong>{role === 'admin' ? '报修单管理' : '我的报修记录'}</strong>
                <div className="muted">支持关键字查询、状态筛选、分页、详情和状态编辑。</div>
              </div>
              <div className="toolbar">
                <button className="ghost-btn" onClick={() => void loadRepairs()}>
                  刷新
                </button>
                <button className="danger-btn" onClick={() => void removeRepairs(selectedIds)}>
                  删除所选
                </button>
              </div>
            </div>

            <div className="form-grid" style={{ marginBottom: 16 }}>
              <div className="field">
                <label>关键字</label>
                <input value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} />
              </div>
              <div className="field" style={{ maxWidth: 180 }}>
                <label>状态</label>
                <select value={searchStatus} onChange={(event) => setSearchStatus(event.target.value)}>
                  <option value="">全部</option>
                  <option value="待处理">待处理</option>
                  <option value="处理中">处理中</option>
                  <option value="已完成">已完成</option>
                </select>
              </div>
              <div className="field" style={{ maxWidth: 120 }}>
                <label>每页条数</label>
                <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                  {pageSizeOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 56 }}>选择</th>
                    <th>编号</th>
                    <th>学号</th>
                    <th>宿舍号</th>
                    <th>报修内容</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7}>加载中...</td>
                    </tr>
                  ) : pagedRepairs.length ? (
                    pagedRepairs.map((item) => (
                      <tr key={`${item.id ?? 'no-id'}-${item.studentId}-${item.dorm}`}>
                        <td>
                          <input
                            type="checkbox"
                            checked={item.id ? selectedIds.includes(item.id) : false}
                            onChange={(event) => {
                              if (!item.id) return;
                              setSelectedIds((prev) =>
                                event.target.checked ? [...prev, item.id!] : prev.filter((id) => id !== item.id)
                              );
                            }}
                          />
                        </td>
                        <td>{item.id ?? '-'}</td>
                        <td>{item.studentId}</td>
                        <td>{item.dorm}</td>
                        <td className="content">{item.content || '-'}</td>
                        <td>
                          <span
                            className={`tag ${
                              item.status === '已完成'
                                ? 'done'
                                : item.status === '处理中'
                                  ? 'progress'
                                  : 'pending'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="ghost-btn" onClick={() => void openDetail(item)}>
                              详情
                            </button>
                            {role === 'admin' && (
                              <button
                                className="primary-btn"
                                onClick={() => {
                                  setEditingItem(item);
                                  setEditingStatus(item.status);
                                }}
                              >
                                编辑
                              </button>
                            )}
                            <button
                              className="danger-btn"
                              onClick={() => void removeRepairs(item.id ? [item.id] : [])}
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7}>暂无符合条件的数据</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>共 {filteredRepairs.length} 条</span>
              <button className="ghost-btn" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
                上一页
              </button>
              <span>
                第 {page} / {Math.max(1, Math.ceil(filteredRepairs.length / pageSize))} 页
              </span>
              <button
                className="ghost-btn"
                disabled={page >= Math.max(1, Math.ceil(filteredRepairs.length / pageSize))}
                onClick={() => setPage((prev) => prev + 1)}
              >
                下一页
              </button>
            </div>
          </div>
        </>
      )}

      {detailItem && (
        <div className="modal" onClick={() => setDetailItem(null)}>
          <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <h3>报修单详情</h3>
            <p>编号：{detailItem.id ?? '-'}</p>
            <p>学号：{detailItem.studentId}</p>
            <p>宿舍号：{detailItem.dorm}</p>
            <p>状态：{detailItem.status}</p>
            <p>报修内容：{detailItem.content || '后端未返回该字段'}</p>
            <button className="ghost-btn" onClick={() => setDetailItem(null)}>
              关闭
            </button>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="modal" onClick={() => setEditingItem(null)}>
          <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <h3>编辑报修状态</h3>
            <div className="field">
              <label>报修编号</label>
              <input value={editingItem.id ?? ''} disabled />
            </div>
            <div className="field">
              <label>状态</label>
              <select value={editingStatus} onChange={(event) => setEditingStatus(event.target.value)}>
                <option value="待处理">待处理</option>
                <option value="处理中">处理中</option>
                <option value="已完成">已完成</option>
              </select>
            </div>
            <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
              <button className="ghost-btn" onClick={() => setEditingItem(null)}>
                取消
              </button>
              <button className="primary-btn" onClick={() => void submitStatus()}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
