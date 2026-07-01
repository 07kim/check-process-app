/* ========================================
   Auth - 認証モジュール（Phase1: モック）
   ======================================== */
window.Auth = (() => {
  let currentUser = null;

  function login(userId) {
    const user = MockData.getUser(userId);
    if (!user) return false;
    currentUser = user;
    localStorage.setItem('cf_user', userId);
    return true;
  }

  function logout() {
    currentUser = null;
    localStorage.removeItem('cf_user');
  }

  function getCurrentUser() {
    if (currentUser) return currentUser;
    const saved = localStorage.getItem('cf_user');
    if (saved) {
      currentUser = MockData.getUser(saved);
      return currentUser;
    }
    return null;
  }

  function isLoggedIn() {
    return !!getCurrentUser();
  }

  function hasRole(requiredRoles) {
    const user = getCurrentUser();
    if (!user || !user.roles) return false;
    if (typeof requiredRoles === 'string') requiredRoles = [requiredRoles];
    return user.roles.some(r => requiredRoles.includes(r));
  }

  function isAdmin() {
    const user = getCurrentUser();
    if (!user || !user.roles) return false;
    return user.roles.includes('admin') || user.roles.includes('chairman');
  }

  // 自分がチェックすべき案件、または依頼した/されたタスクを取得
  function getMyTasks() {
    const user = getCurrentUser();
    if (!user) return [];
    
    // 承認ルート上のタスク（申請案件）
    const appTasks = MockData.applications.filter(app => {
      if (app.status === 'completed') return false;
      const wf = WorkflowEngine.buildWorkflowState(app);
      if (app.currentStepIndex >= wf.length) return false;
      const step = wf[app.currentStepIndex];
      return step.assignees && step.assignees.some(a => a.id === user.id);
    });

    // 自分に依頼された制作タスク、または「自分が依頼した」制作タスク（未完了のもの）
    const relatedTasks = (MockData.tasks || []).filter(t => 
      (t.assigneeId === user.id || t.requesterId === user.id) && t.status !== 'completed'
    );
    
    return [...appTasks, ...relatedTasks].sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  // 自分が作成した申請案件（通常の承認申請）を取得
  function getMyApplications() {
    const user = getCurrentUser();
    if (!user) return [];
    
    // 承認申請のみ（制作依頼タスクは getMyTasks に含めるため除外）
    return MockData.applications.filter(a => a.creatorId === user.id)
      .sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  return { login, logout, getCurrentUser, isLoggedIn, hasRole, isAdmin, getMyTasks, getMyApplications };
})();
