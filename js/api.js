/* ========================================
   API Client - Phase1 はモック、Phase2 でPHP接続
   ======================================== */
window.API = (() => {
  // Phase1: 全てモックデータから返す
  async function getApplications(filters = {}) {
    let apps = [...MockData.applications];
    if (filters.category) apps = apps.filter(a => a.category === filters.category);
    if (filters.status) apps = apps.filter(a => a.status === filters.status);
    if (filters.tag) apps = apps.filter(a => a.tags && a.tags.includes(filters.tag));
    if (filters.search) {
      const q = filters.search.toLowerCase();
      apps = apps.filter(a => 
        a.title.toLowerCase().includes(q) || 
        a.description.toLowerCase().includes(q) ||
        (a.tags && a.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
    return apps;
  }

  async function getApplication(id) {
    return MockData.getApp(id);
  }

  async function createApplication(data) {
    const id = Utils.generateId();
    let workflow = [];
    if (data.templateId) {
      const template = MockData.workflowTemplates.find(t => t.id === data.templateId);
      if (template) {
        workflow = JSON.parse(JSON.stringify(template.steps));
      }
    }

    const app = {
      id, ...data, 
      status: 'pending', 
      currentStepIndex: 0,
      tags: data.tags || [],
      requesterId: data.requesterId || Auth.getCurrentUser().id,
      createdAt: new Date(), 
      workflow,
      versions: [{ version: 1, uploadedAt: new Date(), uploadedBy: Auth.getCurrentUser().id, note: '初稿提出' }],
    };
    MockData.applications.push(app);
    MockData.saveData();
    Utils.showToast('申請を作成しました', 'success');
    return app;
  }

  async function approveStep(appId, comment) {
    const app = MockData.getApp(appId);
    if (!app) return null;
    const user = Auth.getCurrentUser();
    const wf = WorkflowEngine.buildWorkflowState(app);
    const result = WorkflowEngine.processApproval(wf, app.currentStepIndex, user.id);
    app.currentStepIndex = result.currentStepIndex;
    if (result.completed) {
      app.status = 'completed';
      Utils.showToast('最終承認が完了しました！', 'success');
    } else {
      app.status = 'in_review';
      Utils.showToast('承認しました', 'success');
    }
    if (comment) {
      MockData.comments.push({
        id: Utils.generateId(), appId, userId: user.id, text: comment, createdAt: new Date(), type: 'approval'
      });
    }
    MockData.saveData();
    return app;
  }

  async function rejectStep(appId, comment, files) {
    const app = MockData.getApp(appId);
    if (!app) return null;
    const user = Auth.getCurrentUser();
    app.status = 'rejected';
    MockData.comments.push({
      id: Utils.generateId(), appId, userId: user.id, text: comment || '修正をお願いします', createdAt: new Date(), type: 'rejection'
    });
    MockData.saveData();
    Utils.showToast('差し戻しました', 'warning');
    return app;
  }

  async function addComment(appId, text) {
    const user = Auth.getCurrentUser();
    const c = { id: Utils.generateId(), appId, userId: user.id, text, createdAt: new Date(), type: 'comment' };
    MockData.comments.push(c);
    MockData.saveData();
    return c;
  }

  async function getComments(appId) {
    return MockData.getComments(appId);
  }

  async function getNotifications() {
    const user = Auth.getCurrentUser();
    return user ? MockData.getNotifications(user.id) : [];
  }

  async function getWorkflowTemplates() {
    return MockData.workflowTemplates;
  }

  async function updateWorkflowTemplates(templates) {
    MockData.workflowTemplates = templates;
    MockData.saveData();
    return templates;
  }

  async function getStats() {
    const apps = MockData.applications;
    const completed = apps.filter(a => a.status === 'completed');
    
    // カテゴリ別統計
    const catStats = {
      promotional: { total: 0, completed: 0, onTime: 0 },
      document: { total: 0, completed: 0, onTime: 0 }
    };

    apps.forEach(a => {
      const cat = a.category || 'document';
      if (!catStats[cat]) catStats[cat] = { total: 0, completed: 0, onTime: 0 };
      catStats[cat].total++;
      if (a.status === 'completed') {
        catStats[cat].completed++;
        if (a.completedAt && a.deadline && a.completedAt <= a.deadline) {
          catStats[cat].onTime++;
        }
      }
    });

    return {
      total: apps.length,
      pending: apps.filter(a => a.status === 'pending').length,
      inReview: apps.filter(a => a.status === 'in_review').length,
      rejected: apps.filter(a => a.status === 'rejected').length,
      completed: completed.length,
      overdue: apps.filter(a => Utils.getDaysUntil(a.deadline) < 0 && a.status !== 'completed').length,
      catStats
    };
  }

  async function getAnalytics() {
    const users = MockData.users;
    const apps = MockData.applications;
    
    // パフォーマンス最適化のためワークフロー状態を一度解決
    const appsWithWf = apps.map(a => ({
      ...a,
      wf: WorkflowEngine.buildWorkflowState(a)
    }));

    // ユーザー別パフォーマンス
    const userPerformance = users.map(u => {
      const userId = u.id;
      
      // 1. 作成した案件 (依頼数)
      const myCreatedApps = appsWithWf.filter(a => a.creatorId === userId);
      const myCreatedCompleted = myCreatedApps.filter(a => a.status === 'completed');
      const myCreatedOnTime = myCreatedCompleted.filter(a => a.completedAt && a.deadline && a.completedAt <= a.deadline);

      // 2. 関与した案件 (審査した案件)
      const handledApps = appsWithWf.filter(a => 
        a.wf.some(s => s.approvals?.some(ap => ap.userId === userId))
      );
      
      // 3. 達成率 (自分が作成した案件の期限遵守率)
      const rate = myCreatedCompleted.length > 0 
        ? Math.round((myCreatedOnTime.length / myCreatedCompleted.length) * 100) 
        : 100;

      // 4. 遅延率 (自分が作成した案件の遅延率)
      const delayCount = myCreatedCompleted.filter(a => a.completedAt && a.deadline && a.completedAt > a.deadline).length;
      const delayRate = myCreatedCompleted.length > 0 
        ? Math.round((delayCount / myCreatedCompleted.length) * 100) 
        : 0;

      // 5. 現在の業務量 (自分が担当者のステップにいる未完了案件)
      const activeTasks = appsWithWf.filter(a => {
        if (a.status === 'completed' || a.status === 'rejected') return false;
        const step = a.wf[a.currentStepIndex];
        return step && step.assignees && step.assignees.some(v => v.id === userId);
      });

      // 6. 未処理率 (関与した総案件のうち、現在自分が止めている案件の割合)
      const totalInvolved = [...new Set([...myCreatedApps, ...handledApps])];
      const unprocessedRate = totalInvolved.length > 0 
        ? Math.round((activeTasks.length / totalInvolved.length) * 100) 
        : 0;

      return {
        userId: u.id,
        name: u.name,
        department: u.department,
        year: u.year,
        completionRate: rate,
        delayRate: delayRate,
        workload: activeTasks.length,
        requestCount: myCreatedApps.length,
        totalHandled: handledApps.length,
        unprocessedRate: unprocessedRate
      };
    });

    // タグ別統計 (春企画, 夏企画など) - カテゴリ別の内訳を追加
    const tagStats = {};
    const targetTags = ['春企画', '夏企画', '大祭関連'];
    
    targetTags.forEach(tag => {
      const taggedApps = appsWithWf.filter(a => a.tags && a.tags.includes(tag));
      
      const breakdown = {
        promotional: { total: 0, completed: 0, onTime: 0 },
        document: { total: 0, completed: 0, onTime: 0 }
      };

      taggedApps.forEach(a => {
        const cat = a.category || 'document';
        if (!breakdown[cat]) breakdown[cat] = { total: 0, completed: 0, onTime: 0 };
        breakdown[cat].total++;
        if (a.status === 'completed') {
          breakdown[cat].completed++;
          if (a.completedAt && a.deadline && a.completedAt <= a.deadline) {
            breakdown[cat].onTime++;
          }
        }
      });

      const completed = taggedApps.filter(a => a.status === 'completed');
      const onTime = completed.filter(a => a.completedAt && a.deadline && a.completedAt <= a.deadline);
      
      tagStats[tag] = {
        total: taggedApps.length,
        completed: completed.length,
        completionRate: taggedApps.length > 0 ? Math.round((completed.length / taggedApps.length) * 100) : 0,
        onTimeRate: completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : 100,
        breakdown
      };
    });

    return {
      summary: await getStats(),
      userPerformance,
      tagStats
    };
  }

  async function getUsers() {
    return MockData.users;
  }

  async function updateUserRole(userId, roles) {
    const user = MockData.getUser(userId);
    if (user) {
      user.roles = [...new Set(roles)]; // 重複排除
      MockData.saveData();
      Utils.showToast(`${user.name}の権限を更新しました`, 'success');
    }
    return user;
  }

  async function impersonate(userId) {
    if (Auth.login(userId)) {
      window.location.hash = '#/dashboard';
      window.location.reload();
      return true;
    }
    return false;
  }

  async function getRoleDefinitions() {
    return MockData.roleDefinitions;
  }

  async function updateRoleDefinitions(roles) {
    MockData.roleDefinitions = roles;
    MockData.saveData();
    return roles;
  }

  async function getTagDefinitions() {
    return MockData.tagDefinitions;
  }

  async function updateTagDefinitions(tags) {
    MockData.tagDefinitions = tags;
    MockData.saveData();
    return tags;
  }

  async function getTasks() {
    const user = Auth.getCurrentUser();
    if (!user) return [];
    // 自分が依頼した、または自分が担当者のタスクを返す
    return MockData.tasks.filter(t => t.requesterId === user.id || t.assigneeId === user.id)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async function getTask(id) {
    return MockData.getTask(id);
  }

  async function createTask(data) {
    const id = Utils.generateId();
    const task = {
      id,
      ...data,
      senderId: Auth.getCurrentUser().id, // requesterId と同等
      status: 'requested',
      createdAt: new Date()
    };
    MockData.tasks.push(task);
    MockData.saveData();
    Utils.showToast('依頼を送信しました', 'success');
    return task;
  }

  async function getTaskPresets() {
    return MockData.taskPresets;
  }

  async function updateTask(id, data) {
    const task = MockData.getTask(id);
    if (!task) return null;
    
    // 内容をマージ（仕様、タイトル、期限、タグなど）
    Object.assign(task, data);
    task.updatedAt = new Date();
    
    MockData.saveData();
    
    // 担当者に通知
    MockData.createNotification(task.assigneeId, `【依頼変更】「${task.title}」の内容が更新されました`);
    
    Utils.showToast('依頼内容を更新しました', 'success');
    return task;
  }

  async function updateTaskPresets(presets) {
    MockData.taskPresets.length = 0;
    presets.forEach(p => MockData.taskPresets.push(p));
    MockData.saveData();
    return true;
  }

  return { 
    getApplications, getApplication, createApplication, approveStep, rejectStep, 
    addComment, getComments, getNotifications, getWorkflowTemplates, updateWorkflowTemplates, getStats, getAnalytics, getUsers, 
    updateUserRole, impersonate, getRoleDefinitions, updateRoleDefinitions, getTagDefinitions, updateTagDefinitions,
    getTasks, getTask, createTask, updateTask, getTaskPresets, updateTaskPresets
  };
})();
