/* ========================================
   Workflow Engine - 承認フローエンジン
   ======================================== */
window.WorkflowEngine = (() => {
  // ─── ルート定義 ─────────────────
  function generateRoute(category, isFestivalRelated) {
    const steps = [];
    // Step 1: 責任者・所属部長
    steps.push({
      id: 'step1', name: '責任者・所属部長', type: 'sequential',
      assigneeRoles: ['responsible'], status: 'pending', approvals: []
    });
    // Step 2: 並列チェック (書類: 総務+企画, 広報物: 広報+企画)
    if (category === 'document') {
      steps.push({
        id: 'step2', name: '総務部長 & 企画部長', type: 'parallel',
        assigneeRoles: ['soumu_head', 'kikaku_head'], status: 'pending', approvals: []
      });
    } else {
      steps.push({
        id: 'step2', name: '広報部長 & 企画部長', type: 'parallel',
        assigneeRoles: ['kouhou_head', 'kikaku_head'], status: 'pending', approvals: []
      });
    }
    // Step 3: 条件付き - 大祭委員長
    if (isFestivalRelated) {
      steps.push({
        id: 'step3', name: '大祭委員長', type: 'conditional',
        assigneeRoles: ['taisai_chair'], status: 'pending', approvals: [],
        condition: { flag: 'isFestivalRelated', value: true }
      });
    }
    // Step 4: 副執行（並列）
    steps.push({
      id: isFestivalRelated ? 'step4' : 'step3', name: '副執行（2名）', type: 'parallel',
      assigneeRoles: ['vice_exec_1', 'vice_exec_2'], status: 'pending', approvals: []
    });
    // Step 5: 委員長（最終承認）
    steps.push({
      id: isFestivalRelated ? 'step5' : 'step4', name: '委員長（最終承認）', type: 'sequential',
      assigneeRoles: ['chairman'], status: 'pending', approvals: []
    });
    return steps;
  }

  // ─── ステップにユーザーを割り当て ─────────────────
  function assignUsersToSteps(steps) {
    const users = MockData.users;
    return steps.map(step => {
      // ロールに合致するユーザーを「すべて」抽出 (roles または assigneeRoles に対応)
      let assignees = [];
      const roles = step.assigneeRoles || step.roles || [];
      roles.forEach(role => {
        const matchingUsers = users.filter(u => u.roles && u.roles.includes(role));
        matchingUsers.forEach(u => {
          if (!assignees.find(a => a.id === u.id)) assignees.push(u);
        });
      });
      return { ...step, assignees };
    });
  }

  // ─── 案件の完全なワークフローを生成 ─────────────────
  function createWorkflow(app) {
    const route = generateRoute(app.category, app.isFestivalRelated);
    return assignUsersToSteps(route);
  }

  // ─── 現在の承認者を取得 ─────────────────
  function getCurrentAssignees(workflow, currentStepIndex) {
    if (currentStepIndex >= workflow.length) return [];
    const step = workflow[currentStepIndex];
    return step.assignees || [];
  }

  // ─── 承認処理 ─────────────────
  function processApproval(workflow, currentStepIndex, userId) {
    if (currentStepIndex >= workflow.length) return { workflow, currentStepIndex, completed: true };
    const step = workflow[currentStepIndex];
    // 承認を記録
    if (!step.approvals.find(a => a.userId === userId)) {
      step.approvals.push({ userId, approved: true, timestamp: new Date() });
    }
    // 並列チェック: 全員承認で次へ
    if (step.type === 'parallel') {
      const allApproved = step.assignees.every(a => step.approvals.find(ap => ap.userId === a.id && ap.approved));
      if (allApproved) {
        step.status = 'approved';
        return { workflow, currentStepIndex: currentStepIndex + 1, completed: currentStepIndex + 1 >= workflow.length };
      }
      step.status = 'in_review';
      return { workflow, currentStepIndex, completed: false };
    }
    // 順次・条件付き: 1人で次へ
    step.status = 'approved';
    return { workflow, currentStepIndex: currentStepIndex + 1, completed: currentStepIndex + 1 >= workflow.length };
  }

  // ─── 差し戻し処理（その人分だけ） ─────────────────
  function processRejection(workflow, currentStepIndex, userId, comment) {
    if (currentStepIndex >= workflow.length) return { workflow, currentStepIndex };
    const step = workflow[currentStepIndex];
    // 差し戻しを記録
    const existing = step.approvals.findIndex(a => a.userId === userId);
    if (existing >= 0) step.approvals.splice(existing, 1);
    step.approvals.push({ userId, approved: false, timestamp: new Date(), comment });
    step.status = 'rejected';
    return { workflow, currentStepIndex, rejectedBy: userId };
  }

  // ─── 再提出後の処理 ─────────────────
  function processResubmission(workflow, currentStepIndex, rejectedByUserId) {
    if (currentStepIndex >= workflow.length) return { workflow, currentStepIndex };
    const step = workflow[currentStepIndex];
    // 差し戻した人のrejectionをクリア
    step.approvals = step.approvals.filter(a => !(a.userId === rejectedByUserId && !a.approved));
    step.status = step.approvals.length > 0 ? 'in_review' : 'pending';
    return { workflow, currentStepIndex };
  }

  // ─── 期限逆算 ─────────────────
  function calculateDeadlines(workflow, finalDeadline) {
    if (!finalDeadline) return workflow;
    const fd = new Date(finalDeadline);
    const total = workflow.length;
    const daysPerStep = 2;
    return workflow.map((step, i) => {
      const daysFromEnd = (total - i - 1) * daysPerStep;
      const stepDeadline = new Date(fd.getTime() - daysFromEnd * 864e5);
      return { ...step, deadline: stepDeadline };
    });
  }

  // ─── ワークフロー状態をアプリデータからビルド ─────────────────
  function buildWorkflowState(app) {
    let workflow;
    if (app.workflow && app.workflow.length > 0) {
      // 保存されたカスタム/テンプレートルートを使用
      workflow = JSON.parse(JSON.stringify(app.workflow)); 
      // 担当者を最新のMockDataから再マッピング（roleに基づいて）
      workflow = assignUsersToSteps(workflow);
    } else {
      // カテゴリに基づく動的ルート
      workflow = createWorkflow(app);
    }
    
    workflow = calculateDeadlines(workflow, app.deadline);
    // currentStepIndexまでのステップを承認済みにする
    for (let i = 0; i < app.currentStepIndex && i < workflow.length; i++) {
      workflow[i].status = 'approved';
      const createdAt = new Date(app.createdAt || Date.now());
      workflow[i].approvals = (workflow[i].assignees || []).map(a => ({ 
        userId: a.id, 
        approved: true, 
        timestamp: new Date(createdAt.getTime() + (i + 1) * 864e5) 
      }));
    }
    // 現在のステップを設定
    if (app.currentStepIndex < workflow.length) {
      if (app.status === 'rejected') {
        workflow[app.currentStepIndex].status = 'rejected';
      } else if (app.status === 'in_review' || app.status === 'pending') {
        workflow[app.currentStepIndex].status = app.status === 'pending' ? 'pending' : 'in_review';
        // 並列の場合、部分的な承認を反映
        const comments = MockData.getComments(app.id);
        const step = workflow[app.currentStepIndex];
        if (step.type === 'parallel') {
          step.assignees.forEach(assignee => {
            const approval = comments.find(c => c.userId === assignee.id && c.type === 'approval');
            if (approval) {
              step.approvals.push({ userId: assignee.id, approved: true, timestamp: approval.createdAt });
            }
          });
          if (step.approvals.length > 0 && step.approvals.length < step.assignees.length) {
            step.status = 'in_review';
          }
        }
      }
    }
    // 完了
    if (app.status === 'completed') {
      workflow.forEach(s => { s.status = 'approved'; });
    }
    return workflow;
  }

  // ─── 統計 ─────────────────
  function getStats() {
    const apps = MockData.applications;
    return {
      total: apps.length,
      pending: apps.filter(a => a.status === 'pending').length,
      inReview: apps.filter(a => a.status === 'in_review').length,
      rejected: apps.filter(a => a.status === 'rejected').length,
      completed: apps.filter(a => a.status === 'completed').length,
      overdue: apps.filter(a => Utils.getDaysUntil(a.deadline) < 0 && a.status !== 'completed').length,
    };
  }

  return { generateRoute, createWorkflow, getCurrentAssignees, processApproval, processRejection, processResubmission, calculateDeadlines, buildWorkflowState, getStats };
})();
