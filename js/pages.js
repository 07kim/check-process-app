/* ========================================
   Pages - 全ページモジュール (高機能・安定版)
   ======================================== */
window.Pages = (() => {
  console.log('Pages init: Utils exists?', !!window.Utils);
  const Pages = {};
  const {Icons,escapeHtml,formatDate,getStatusInfo,getCategoryInfo,getDeadlineClass,getDeadlineLabel,getRoleLabel,calcProgress} = Utils;
  const C = Components;

  try {
    // ═══════════════════════════════════════
    // ダッシュボード
    // ═══════════════════════════════════════
    Pages.dashboard = async (container) => {
      const user = Auth.getCurrentUser();
      const stats = await API.getStats();
      const myTasks = Auth.getMyTasks();
      const myApps = Auth.getMyApplications();

      container.innerHTML = `
        <div class="page-header">
          <div>
            <h1 class="page-title">ダッシュボード</h1>
            <p class="page-subtitle">おかえりなさい、${escapeHtml(user.name)}さん</p>
          </div>
          <a href="#/applications/new" class="btn btn-primary">${Icons.plus} 新規申請</a>
        </div>

        <div class="stats-grid">
          ${C.statsCard(Icons.clock, '審査待ち', stats.pending, '#F59E0B', '', "Pages._goStatus('pending')")}
          ${C.statsCard(Icons.eye, '審査中', stats.inReview, '#4F6AFF', '', "Pages._goStatus('in_review')")}
          ${C.statsCard(Icons.x, '差し戻し', stats.rejected, '#EF4444', '', "Pages._goStatus('rejected')")}
          ${C.statsCard(Icons.check, '完了', stats.completed, '#10B981', '', "Pages._goStatus('completed')")}
        </div>

        <div class="dashboard-grid">
          <div class="dashboard-section">
            <div class="section-header">
              <h2 class="section-title">${Icons.alert} 自分のタスク</h2>
              <span class="section-count">${myTasks.length}件</span>
            </div>
            <div class="section-body">
              ${myTasks.length ? myTasks.map(app => C.applicationCard(app)).join('') :
                C.emptyState(Icons.check, 'タスクなし', '現在チェック待ちの案件はありません')}
            </div>
          </div>
          <div class="dashboard-section">
            <div class="section-header">
              <h2 class="section-title">${Icons.fileText} 自分の申請</h2>
              <span class="section-count">${myApps.length}件</span>
            </div>
            <div class="section-body">
              ${myApps.length ? myApps.map(app => C.applicationCard(app)).join('') :
                C.emptyState(Icons.fileText, '申請なし', 'まだ申請を作成していません')}
            </div>
          </div>
        </div>
      `;
    };
    
    Pages._goStatus = (status) => {
      Pages._appInitialStatus = status;
      App.navigate('/applications');
    };

    // ═══════════════════════════════════════
    // 申請一覧
    // ═══════════════════════════════════════
    Pages.applications = async (container) => {
      let currentFilter = { category: '', status: Pages._appInitialStatus || '', search: Pages._appInitialSearch || '' };
      Pages._appInitialStatus = ''; // クリア
      Pages._appInitialSearch = ''; // クリア

      const renderBase = () => {
        container.innerHTML = `
          <div class="page-header">
            <div>
              <h1 class="page-title">申請一覧</h1>
              <p class="page-subtitle" id="app-list-subtitle">読み込み中...</p>
            </div>
            <a href="#/applications/new" class="btn btn-primary">${Icons.plus} 新規申請</a>
          </div>

          <div class="filter-bar">
            <div class="filter-group">
              <select id="filter-category" class="form-select form-select-sm">
                <option value="">全カテゴリ</option>
                <option value="document" ${currentFilter.category==='document'?'selected':''}>書類</option>
                <option value="promotional" ${currentFilter.category==='promotional'?'selected':''}>広報物</option>
              </select>
              <select id="filter-status" class="form-select form-select-sm">
                <option value="">全ステータス</option>
                <option value="pending" ${currentFilter.status==='pending'?'selected':''}>審査待ち</option>
                <option value="in_review" ${currentFilter.status==='in_review'?'selected':''}>審査中</option>
                <option value="rejected" ${currentFilter.status==='rejected'?'selected':''}>差し戻し</option>
                <option value="completed" ${currentFilter.status==='completed'?'selected':''}>完了</option>
              </select>
            </div>
            <div class="filter-search">
              <input type="text" id="filter-search" class="form-input form-input-sm" placeholder="キーワード検索..." value="${escapeHtml(currentFilter.search)}">
            </div>
          </div>

          <div class="app-grid" id="app-grid"></div>
        `;

        document.getElementById('filter-category').addEventListener('change', e => { currentFilter.category = e.target.value; updateList(); });
        document.getElementById('filter-status').addEventListener('change', e => { currentFilter.status = e.target.value; updateList(); });
        document.getElementById('filter-search').addEventListener('input', e => { currentFilter.search = e.target.value; updateList(); });
      };

      const updateList = async () => {
        const apps = await API.getApplications(currentFilter);
        const grid = document.getElementById('app-grid');
        const subtitle = document.getElementById('app-list-subtitle');
        if (subtitle) subtitle.textContent = `全${apps.length}件の申請`;
        if (grid) {
          grid.innerHTML = apps.length ? `
            <div class="realtime-list-update" style="display:contents;">
              ${apps.map(app => C.applicationCard(app)).join('')}
            </div>` : C.emptyState(Icons.fileText, '該当する申請がありません', 'フィルター条件を変更してください');
        }
      };

      renderBase();
      await updateList();
    };

    // ═══════════════════════════════════════
    // 新規申請
    // ═══════════════════════════════════════
    Pages.applicationNew = (container, initialContext = null) => {
      let step = 1;
      let formData = { 
        category: '', 
        templateId: '', 
        title: initialContext ? initialContext.title : '', 
        description: initialContext ? initialContext.specifications : '', 
        deadline: initialContext ? initialContext.deadline : '', 
        tags: [], 
        files: {},
        originTaskId: initialContext ? initialContext.id : null
      };
      let templates = [];

      const loadTemplates = async () => { 
        templates = await API.getWorkflowTemplates(); 
        renderStep(); 
      };

      const renderStep = () => {
        let content = '';
        if (step === 1) {
          content = `
            <div class="form-step fade-in-up">
              <h2 class="form-step-title">カテゴリを選択</h2>
              <p class="form-step-desc">申請する案件の種類を選んでください。</p>
              <div class="category-select">
                <div class="category-option ${formData.category==='document'?'selected':''}" onclick="Pages._selectCategory('document')">
                  <div class="category-icon" style="background:rgba(79, 106, 255, 0.1); color:var(--primary)">${Icons.fileText}</div>
                  <h3>書類</h3>
                  <p>企画書、規約、報告書などのテキストベースの資料</p>
                </div>
                <div class="category-option ${formData.category==='promotional'?'selected':''}" onclick="Pages._selectCategory('promotional')">
                  <div class="category-icon" style="background:rgba(139, 92, 246, 0.1); color:#8B5CF6">${Icons.image}</div>
                  <h3>広報物</h3>
                  <p>ポスター、チラシ、バナー画像などのデザイン制作物</p>
                </div>
              </div>
            </div>`;
        } else if (step === 2) {
          const filtered = templates.filter(t => formData.category==='promotional' ? (t.id.includes('pub')||t.id.includes('urgent')) : (t.id.includes('doc')||t.id.includes('urgent')));
          content = `
            <div class="form-step fade-in-up">
              <h2 class="form-step-title">承認ルートを選択</h2>
              <p class="form-step-desc">案件に最適な承認フローを選択してください。</p>
              <div class="template-select-grid">
                <div class="template-option ${formData.templateId === 'custom' ? 'selected' : ''}" onclick="Pages._selectTemplate('custom')">
                  <div class="template-info">
                    <h3 style="display:flex; align-items:center; gap:8px;">${Icons.edit} カスタムルート</h3>
                    <p>標準的なステップで自動生成します（後で調整可能）</p>
                  </div>
                </div>
                ${filtered.map(t => `
                  <div class="template-option ${formData.templateId === t.id ? 'selected' : ''}" onclick="Pages._selectTemplate('${t.id}')">
                    <div class="template-info">
                      <h3 style="display:flex; align-items:center; gap:8px;">${Icons.fileText} ${escapeHtml(t.name)}</h3>
                      <p>${escapeHtml(t.description)}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>`;
        } else if (step === 3) {
          content = `
            <div class="form-step fade-in-up">
              <h2 class="form-step-title">案件の詳細を入力</h2>
              <p class="form-step-desc">審査に必要な基本情報を記入してください。</p>
              <div class="detail-card" style="padding: 32px;">
                <div class="form-group">
                  <label class="form-label">案件のタイトル</label>
                  <input type="text" id="app-title" class="form-input" placeholder="例：2024年度 新歓ポスター制作" value="${escapeHtml(formData.title)}">
                </div>
                <div class="form-group">
                  <label class="form-label">詳細な説明</label>
                  <textarea id="app-desc" class="form-textarea" rows="4" placeholder="案件の目的や注意点などを入力してください">${escapeHtml(formData.description)}</textarea>
                </div>
                <div class="form-group" style="margin-bottom: 24px;">
                  <label class="form-label">タグの設定</label>
                  <div style="display:flex; gap:8px; margin-bottom: 12px;">
                    <input type="text" id="app-tag-input" class="form-input form-input-sm" placeholder="新しいタグを追加...">
                    <button class="btn btn-outline btn-sm" onclick="Pages._addCustomTag()">追加</button>
                  </div>
                  <div id="tag-selector" class="tag-selector" style="display:flex; flex-wrap:wrap; gap:8px;"></div>
                </div>
                <div class="form-group">
                  <label class="form-label">最終承認希望日</label>
                  <input type="date" id="app-deadline" class="form-input" value="${formData.deadline}">
                  <p style="font-size:12px; color:var(--text-muted); margin-top:8px;">※ 審査期間を考慮し、余裕を持った日付を設定してください。</p>
                </div>
              </div>
            </div>`;
          setTimeout(async () => {
            const tagDefs = await API.getTagDefinitions();
            const selector = document.getElementById('tag-selector');
            if (selector) {
              Pages._updateTagsUI = () => {
                selector.innerHTML = tagDefs.map(t => {
                  const active = (formData.tags || []).includes(t.name);
                  return `<span class="badge" style="cursor:pointer; padding: 6px 12px; border-radius: 8px; font-size: 13px; color:${active?'#fff':'var(--text-secondary)'}; background:${active?t.color:'var(--bg-alt)'}; border:1px solid ${active?t.color:'var(--border-light)'};" onclick="Pages._toggleTag('${t.name}')">${t.name}</span>`;
                }).join('');
              };
              Pages._updateTagsUI();
            }
          }, 0);
        } else if (step === 4) {
          const reqs = Utils.getFileRequirements(formData.category);
          content = `
            <div class="form-step fade-in-up">
              <h2 class="form-step-title">ファイルをアップロード</h2>
              <p class="form-step-desc">審査に必要なデータを添付してください。</p>
              ${Object.entries(reqs).map(([key,req]) => `
                <div class="upload-zone" style="border-color: ${formData.files[key] ? 'var(--success)' : 'var(--border)'}; background: ${formData.files[key] ? 'rgba(16, 185, 129, 0.05)' : ''}">
                  <div class="upload-zone-content">
                    <div class="upload-icon-container" style="${formData.files[key] ? 'color:var(--success); background:rgba(16, 185, 129, 0.1);' : ''}">
                      ${formData.files[key] ? Icons.check : Icons.fileText}
                    </div>
                    <div class="upload-label">${req.label}</div>
                    <p style="font-size:12px; color:var(--text-muted);">許可される形式: ${req.accept.join(', ')}</p>
                    ${formData.files[key] ? `
                      <div class="upload-file-name">✓ ${escapeHtml(formData.files[key].name)}</div>
                    ` : `
                      <div style="margin-top:8px;"><span class="btn btn-outline btn-sm">ファイルを選択</span></div>
                    `}
                    <input type="file" class="upload-input" onchange="Pages._handleFile('${key}',this)">
                  </div>
                </div>
              `).join('')}
            </div>`;
        } else if (step === 5) {
          content = `
            <div class="form-step fade-in-up">
              <h2 class="form-step-title">申請内容の最終確認</h2>
              <p class="form-step-desc">送信前に内容に誤りがないかご確認ください。</p>
              <div class="confirm-summary">
                <div class="confirm-section">
                  <span class="confirm-label">案件タイトル</span>
                  <div class="confirm-value">${escapeHtml(formData.title)}</div>
                </div>
                <div class="confirm-section">
                  <span class="confirm-label">カテゴリ / 承認ルート</span>
                  <div class="confirm-value">
                    ${getCategoryInfo(formData.category).label} 
                    <span style="color:var(--text-muted); margin:0 8px;">/</span> 
                    ${formData.templateId === 'custom' ? 'カスタムルート' : escapeHtml(templates.find(t=>t.id===formData.templateId)?.name || '')}
                  </div>
                </div>
                <div class="confirm-section">
                  <span class="confirm-label">最終承認希望日</span>
                  <div class="confirm-value" style="color:var(--primary);">${formData.deadline}</div>
                </div>
                <div class="confirm-section">
                  <span class="confirm-label">関連タグ</span>
                  <div class="confirm-tags">
                    ${formData.tags.length ? formData.tags.map(t=>Utils.tagBadge(t)).join('') : '<span style="color:var(--text-muted); font-size:14px;">なし</span>'}
                  </div>
                </div>
                <div class="confirm-section" style="border-top: 1px dashed var(--border-light); padding-top: 24px; margin-top: 24px;">
                  <span class="confirm-label">添付ファイル</span>
                  <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
                    ${Object.entries(formData.files).map(([key, file]) => `
                      <div style="display:flex; align-items:center; gap:10px; font-size:14px; font-weight:600; color:var(--success);">
                        ${Icons.check} ${escapeHtml(file.name)}
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>`;
        }

        container.innerHTML = `
          <div class="page-header">
            <div><h1 class="page-title">新規申請</h1><p class="page-subtitle">申請の作成と送信</p></div>
          </div>
          <div class="stepper-nav">
            <div class="stepper-nav-bar" style="width: ${((step - 1) / 4) * 100}%"></div>
          </div>
          <div class="stepper-content">${content}</div>
          <div class="stepper-actions" style="display:flex; justify-content:space-between; margin-top:40px; padding-top:32px; border-top:1px solid var(--border-light)">
            ${step > 1 ? `<button class="btn btn-ghost" onclick="Pages._prevStep()">${Icons.arrowLeft} 戻る</button>` : '<div></div>'}
            ${step < 5 ? `<button class="btn btn-primary" onclick="Pages._nextStep()">次へ ${Icons.arrowRight}</button>` : `<button class="btn btn-success" onclick="Pages._submitApp()">${Icons.check} 申請を送信する</button>`}
          </div>
        `;
      };

      Pages._selectCategory = (cat) => { formData.category = cat; Pages._nextStep(); };
      Pages._selectTemplate = (tid) => { formData.templateId = tid; Pages._nextStep(); };
      Pages._prevStep = () => { step--; renderStep(); };
      Pages._nextStep = () => {
        if (step === 3) {
          formData.title = document.getElementById('app-title').value;
          formData.description = document.getElementById('app-desc').value;
          formData.deadline = document.getElementById('app-deadline').value;
          if (!formData.title || !formData.deadline) { Utils.showToast('必須項目を入力してください','warning'); return; }
        }
        step++; renderStep();
      };
      Pages._toggleTag = (tag) => {
        formData.tags = formData.tags || [];
        if (formData.tags.includes(tag)) formData.tags = formData.tags.filter(t => t !== tag);
        else formData.tags.push(tag);
        Pages._updateTagsUI();
      };
      Pages._addCustomTag = () => {
        const input = document.getElementById('app-tag-input');
        const val = input.value.trim();
        if (val) {
          formData.tags = formData.tags || [];
          if (!formData.tags.includes(val)) formData.tags.push(val);
          input.value = '';
          Pages._updateTagsUI();
        }
      };
      Pages._handleFile = (key, input) => { if (input.files[0]) { formData.files[key] = input.files[0]; renderStep(); } };
      Pages._submitApp = async () => {
        let wf = [];
        if (formData.templateId === 'custom') { wf = WorkflowEngine.generateRoute(formData.category, false); }
        else { const tpl = templates.find(t=>t.id===formData.templateId); wf = tpl.steps.map(s => ({ ...s, assigneeRoles: s.roles })); }
        
        await API.createApplication({ ...formData, workflow: wf, creatorId: Auth.getCurrentUser().id });
        
        // 元の依頼があった場合はステータスを更新
        if (formData.originTaskId) {
          const task = MockData.getTask(formData.originTaskId);
          if (task) {
            task.status = 'submitted';
            MockData.saveData();
          }
        }

        Utils.showToast('申請が完了しました', 'success');
        App.navigate('/applications');
      };

      loadTemplates();
    };

    // ═══════════════════════════════════════
    // 依頼（Tasks）
    // ═══════════════════════════════════════
    Pages.tasks = async (container) => {
      const user = Auth.getCurrentUser();
      const allTasks = await API.getTasks();
      
      const received = allTasks.filter(t => t.assigneeId === user.id);
      const sent = allTasks.filter(t => t.requesterId === user.id);

      let activeTab = 'received';

      const render = () => {
        const list = activeTab === 'received' ? received : sent;
        
        container.innerHTML = `
          <div class="page-header">
            <div>
              <h1 class="page-title">依頼一覧</h1>
              <p class="page-subtitle">あなたへの依頼、および作成した依頼を管理します</p>
            </div>
            <a href="#/tasks/new" class="btn btn-primary">${Icons.plus} 新規依頼</a>
          </div>

          <div class="tabs" style="margin-bottom: 24px; border-bottom: 1px solid var(--border-light); display: flex; gap: 24px;">
            <div class="tab-item ${activeTab === 'received' ? 'tab-active' : ''}" onclick="Pages._setTaskTab('received')" style="padding: 12px 4px; cursor: pointer; font-weight: 600; font-size: 14px; position: relative; color: ${activeTab === 'received' ? 'var(--primary)' : 'var(--text-muted)'}">
              受信した依頼
              ${received.length > 0 ? `<span style="margin-left:6px; background:var(--primary); color:#fff; font-size:10px; padding:2px 6px; border-radius:10px;">${received.length}</span>` : ''}
              ${activeTab === 'received' ? '<div style="position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: var(--primary);"></div>' : ''}
            </div>
            <div class="tab-item ${activeTab === 'sent' ? 'tab-active' : ''}" onclick="Pages._setTaskTab('sent')" style="padding: 12px 4px; cursor: pointer; font-weight: 600; font-size: 14px; position: relative; color: ${activeTab === 'sent' ? 'var(--primary)' : 'var(--text-muted)'}">
              作成した依頼
              ${activeTab === 'sent' ? '<div style="position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: var(--primary);"></div>' : ''}
            </div>
          </div>

          <div class="task-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">
            ${list.length ? list.map(t => {
              const otherUser = activeTab === 'received' ? MockData.getUser(t.requesterId) : MockData.getUser(t.assigneeId);
              return `
                <div class="detail-card fade-in-up" onclick="App.navigate('/tasks/${t.id}')" style="cursor: pointer; transition: transform 0.2s;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span class="badge" style="background: var(--bg-alt); color: var(--text-muted);">${activeTab === 'received' ? 'From: ' : 'To: '}${otherUser?.name || '不明'}</span>
                    <span class="badge" style="background: ${t.status === 'submitted' ? 'var(--success-light)' : 'var(--primary-light)'}; color: ${t.status === 'submitted' ? 'var(--success)' : 'var(--primary)'};">${t.status === 'submitted' ? '提出済み' : '進行中'}</span>
                  </div>
                  <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">${escapeHtml(t.title)}</h3>
                  <p style="font-size: 13px; color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 16px;">
                    ${typeof t.specifications === 'object' ? escapeHtml(t.specifications.projectInfo?.overview || '仕様書あり') : escapeHtml(t.specifications)}
                  </p>
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-muted);">
                    <span>${Icons.clock} ${Utils.formatDate(t.createdAt, 'date')}</span>
                    ${t.deadline ? `<span style="color: var(--danger); font-weight: 600;">締切: ${t.deadline}</span>` : ''}
                  </div>
                </div>
              `;
            }).join('') : `<div style="grid-column: 1/-1;">${C.emptyState(Icons.fileText, '依頼がありません', '新しい依頼を作成するか、依頼が届くのをお待ちください')}</div>`}
          </div>
        `;
      };

      Pages._setTaskTab = (tab) => { activeTab = tab; render(); };
      render();
    };

    Pages.taskNew = async (container, editId = null) => {
      const users = await API.getUsers();
      const templates = await API.getWorkflowTemplates();
      const tagDefs = await API.getTagDefinitions();
      const presets = await API.getTaskPresets();
      const isEdit = !!editId;

      let taskToEdit = null;
      if (isEdit) {
        taskToEdit = await API.getTask(editId);
        if (!taskToEdit) return App.navigate('/tasks');
      }
      
      let state = {
        assigneeId: isEdit ? taskToEdit.assigneeId : '',
        title: isEdit ? taskToEdit.title : '',
        category: isEdit ? taskToEdit.category : 'promotional',
        templateId: isEdit ? taskToEdit.templateId : '',
        tags: isEdit ? [...(taskToEdit.tags || [])] : [],
        deadline: isEdit ? taskToEdit.deadline : '',
        specifications: isEdit ? JSON.parse(JSON.stringify(taskToEdit.specifications)) : JSON.parse(JSON.stringify(presets[0].specifications)),
        activeTab: 'project',
        userSearch: '',
        showUserResults: false,
        cursorPos: 0
      };

      const render = () => {
        const selectedAssignee = users.find(u => u.id === state.assigneeId);

        container.innerHTML = `
          <div class="page-header">
            <div>
              <h1 class="page-title">${isEdit ? '制作依頼の編集' : '新規制作依頼'}</h1>
              <p class="page-subtitle">${isEdit ? '依頼内容を修正して、担当者に通知を送ります' : '制作担当者を指名して、制作依頼を発行します'}</p>
            </div>
            <div style="display: flex; gap: 8px;">
               <button class="btn btn-ghost" onclick="App.navigate('${isEdit ? '/tasks/'+editId : '/tasks'}')">キャンセル</button>
               <button class="btn btn-primary" id="btn-submit-task">${isEdit ? '変更を保存・通知' : '依頼を送信する'}</button>
            </div>
          </div>

          <div class="task-new-grid" style="display: grid; grid-template-columns: 1fr 350px; gap: 24px;">
            <div class="task-new-main">
              <!-- 1. 基本設定 -->
              <div class="detail-card fade-in-up" style="margin-bottom: 24px;">
                <h2 class="section-title">基本情報</h2>
                <div class="form-group">
                  <label class="form-label">制作タイトル</label>
                  <input type="text" id="task-title" class="form-input" placeholder="例：2024年学園祭ポスター制作" value="${Utils.escapeHtml(state.title)}">
                </div>
                <div class="settings-grid" style="grid-template-columns: 1fr 1fr; margin-top: 16px;">
                  <div class="form-group">
                    <label class="form-label">掲載/提出希望日</label>
                    <input type="date" id="task-deadline" class="form-input" value="${state.deadline}">
                  </div>
                  <div class="form-group">
                    <label class="form-label">仕様プリセット</label>
                    <select class="form-select" onchange="Pages._loadTaskPreset(this.value)" ${isEdit ? 'disabled' : ''}>
                      ${presets.map(p => `<option value="${p.id}" ${isEdit && taskToEdit.category === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                  </div>
                </div>

                <!-- サブタブ (カテゴリに応じて表示を切り替え) -->
                <div class="tabs" style="margin-bottom: 24px; border-bottom: 1px solid var(--border-light);">
                  <div class="tab-item ${state.activeTab === 'project' ? 'tab-active' : ''}" onclick="Pages._setTaskValue('activeTab', 'project')">企画面</div>
                  ${state.category === 'promotional' ? `
                    <div class="tab-item ${state.activeTab === 'design' ? 'tab-active' : ''}" onclick="Pages._setTaskValue('activeTab', 'design')">デザイン面</div>
                    <div class="tab-item ${state.activeTab === 'requirements' ? 'tab-active' : ''}" onclick="Pages._setTaskValue('activeTab', 'requirements')">制作要件</div>
                  ` : ''}
                  <div class="tab-item ${state.activeTab === 'references' ? 'tab-active' : ''}" onclick="Pages._setTaskValue('activeTab', 'references')">参考資料</div>
                </div>

                <div class="spec-editor-content">
                  ${state.activeTab === 'project' ? renderProjectTab() : 
                    (state.activeTab === 'design' && state.category === 'promotional') ? renderDesignTab() : 
                    (state.activeTab === 'requirements' && state.category === 'promotional') ? renderRequirementsTab() :
                    renderReferencesTab()}
                </div>
              </div>
            </div>

            <div class="task-new-sidebar">
              <div class="detail-card fade-in-up" style="position: sticky; top: 88px;">
                <h2 class="section-title">担当者指名</h2>
                <div class="form-group">
                  <label class="form-label">制作担当者</label>
                  <button class="btn btn-outline btn-block" onclick="Pages._showTaskAssigneePicker()" style="margin-bottom: 12px; justify-content: center;">
                    ${Icons.search} 担当者を選択する
                  </button>

                  ${selectedAssignee ? `
                    <div class="selected-user-card" style="padding: 16px; background: var(--primary-light); border-radius: 12px; display: flex; align-items: center; gap: 12px; border: 1px solid var(--primary);">
                      ${C.avatar(selectedAssignee, 'sm')}
                      <div style="flex: 1;">
                        <div style="font-weight: 700; color: var(--primary);">${Utils.escapeHtml(selectedAssignee.name)}</div>
                        <div style="font-size: 12px; color: var(--primary); opacity: 0.8;">${selectedAssignee.department}</div>
                      </div>
                      <button class="btn btn-ghost btn-sm" onclick="Pages._selectAssignee('')" style="color: var(--primary); padding: 4px;">&times;</button>
                    </div>
                  ` : `
                    <div style="padding: 20px; text-align: center; border: 2px dashed var(--border); border-radius: 12px; color: var(--text-muted); font-size: 13px;">
                      担当者が未選択です
                    </div>
                  `}
                </div>

                <div class="form-group" style="margin-top: 24px;">
                  <label class="form-label">関連タグ</label>
                  <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
                    ${tagDefs.map(t => {
                      const active = state.tags.includes(t.name);
                      return `<span class="badge" onclick="Pages._toggleTaskTag('${t.name}')" style="cursor: pointer; background: ${active?t.color:'var(--bg-alt)'}; color: ${active?'#fff':'var(--text-secondary)'}; border: 1px solid ${active?t.color:'var(--border-light)'};">${t.name}</span>`;
                    }).join('')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

        setupEvents();
      };

      function renderProjectTab() {
        const p = state.specifications.projectInfo;
        let fields = p.fields;
        let values = p.values;

        if (!fields) {
          fields = [
            { id: 'name', label: '企画名', type: 'text' },
            { id: 'purpose', label: '開催目的', type: 'textarea' },
            { id: 'overview', label: '企画概要', type: 'textarea' },
            { id: 'date', label: '開催日時', type: 'text' },
            { id: 'location', label: '開催場所', type: 'text' },
            { id: 'todo', label: '作業依頼内容', type: 'textarea' }
          ];
          values = p;
        }
        if (!values) values = {};

        return `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            ${fields.map(f => {
              const isLarge = f.type === 'textarea';
              const val = values[f.id] || f.defaultValue || '';
              const inputHtml = f.type === 'textarea' ?
                `<textarea class="form-textarea" rows="3" onchange="Pages._updateSpec('projectInfo', 'values.${f.id}', this.value)">${Utils.escapeHtml(val)}</textarea>` :
                `<input type="${f.type}" class="form-input" placeholder="${f.label}を入力..." value="${Utils.escapeHtml(val)}" onchange="Pages._updateSpec('projectInfo', 'values.${f.id}', this.value)">`;
              
              return `
                <div class="form-group" style="${isLarge ? 'grid-column: 1 / -1;' : ''}">
                  <label class="form-label" style="font-size: 13px;">${f.label}</label>
                  ${inputHtml}
                </div>
              `;
            }).join('')}
            ${fields.length === 0 ? '<div style="grid-column:1 / -1; padding:40px; text-align:center; color:var(--text-muted); opacity:0.5;">このセットには入力項目が規定されていません</div>' : ''}
          </div>
        `;
      }

      function renderDesignTab() {
        const d = state.specifications.designInfo;
        const labels = d.labels || { bg: '背景色', title: 'タイトル', text: '本文', main: '主要要素', glow: '強調', shadow: '影' };
        const keys = d.cmyk ? Object.keys(d.cmyk) : ['bg','title','text','main','glow','shadow'];

        return `
          <div class="design-editor-split">
            <div class="color-palette-editor">
              <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 16px; color: var(--primary); display: flex; align-items: center; gap: 8px;">
                ${Icons.image} ビジュアルカラー設定
              </h4>
              
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                ${keys.map(key => {
                  const r = d.rgb ? d.rgb[key] : {r:200,g:200,b:200};
                  const label = labels[key] || key;
                  const hex = r ? Utils.colorRgbToHex(r.r, r.g, r.b) : '#CCCCCC';
                  return `
                    <div class="color-swatch-row" style="margin-bottom:0; flex-direction:column; align-items:flex-start; height:auto; padding:12px;">
                      <div style="display:flex; align-items:center; gap:8px; width:100%; margin-bottom:8px;">
                        <input type="color" class="color-picker-input" value="${hex}" oninput="Pages._updateColorPicker('${key}', this.value)">
                        <div style="font-weight: 700; font-size: 12px; color: var(--text-primary); flex:1;">${Utils.escapeHtml(label)}</div>
                      </div>
                      <div style="font-size:10px; font-family:monospace; color:var(--text-muted); padding-left:40px;">HEX: ${hex.toUpperCase()}</div>
                    </div>
                  `;
                }).join('')}
              </div>

              <h4 style="font-size: 14px; font-weight: 700; margin: 24px 0 12px; color: var(--primary); display: flex; align-items: center; gap: 8px;">
                ${Icons.fileText} 各種フォント / リンク
              </h4>
              <div style="display: flex; flex-direction: column; gap: 12px;">
                ${['title', 'main', 'text'].map(key => {
                  const val = d.fonts[key];
                  const fData = (typeof val === 'object' && val !== null) ? val : { name: val, link: '' };
                  const labels = {title:'タイトル用フォント', main:'メイン用フォント', text:'本文・その他フォント'};
                  return `
                    <div class="form-group" style="margin-bottom: 20px; background: #fff; padding: 16px; border-radius: 12px; border: 1px solid var(--border-light); box-shadow: var(--shadow-sm);">
                      <label class="form-label" style="font-size: 13px; font-weight: 800; color: var(--primary); display: flex; align-items: center; gap: 6px;">
                        ${Icons.fileText} ${labels[key]}
                      </label>
                      <div style="display: flex; flex-direction: column; gap: 10px;">
                        <input type="text" class="form-input" placeholder="名称 (例: 游明朝, 装甲明朝)" value="${Utils.escapeHtml(fData.name)}" oninput="Pages._updateFont('${key}', 'name', this.value)">
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <div style="font-size: 11px; color: var(--text-muted); min-width: 40px;">URL:</div>
                          <input type="text" class="form-input" style="flex: 1; font-family: monospace; font-size: 12px;" placeholder="https://..." value="${Utils.escapeHtml(typeof fData.link === 'string' ? fData.link : '')}" oninput="Pages._updateFont('${key}', 'link', this.value)">
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <div class="live-preview-panel">
              <div class="live-preview-container">
                <span class="spec-item-label" style="margin-bottom: 8px;">プレビュー (イメージ)</span>
                <div class="preview-mockup-poster" style="background: #fff; border: 1px solid var(--border-light);">
                  <div class="preview-title" style="color: rgb(${d.rgb.title.r},${d.rgb.title.g},${d.rgb.title.b}); font-family: '${d.fonts.title.name}', sans-serif;">
                    ${Utils.escapeHtml(state.specifications.projectInfo.values?.name || 'Sample Title')}
                  </div>
                  <div class="preview-main-graphic" style="background: rgb(${d.rgb.main.r},${d.rgb.main.g},${d.rgb.main.b}); opacity: 0.8; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px;">
                    Main Graphic
                  </div>
                  <div class="preview-text" style="color: rgb(${d.rgb.text.r},${d.rgb.text.g},${d.rgb.text.b});">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.
                  </div>
                  <div style="position: absolute; bottom: 12px; right: 12px; width: 30px; height: 30px; border-radius: 50%; border: 2px solid rgb(${d.rgb.glow.r},${d.rgb.glow.g},${d.rgb.glow.b});"></div>
                </div>
                <p style="font-size: 10px; color: var(--text-muted); text-align: center; margin-top: 8px;">
                  ※ 実際のフォントやレイアウトは<br>制作担当者によって調整されます
                </p>
              </div>
            </div>
          </div>
        `;
      }

      function renderRequirementsTab() {
        const p = state.specifications.projectInfo;
        const printSizes = [
          {id: 'A2', label: 'A2', sub: '420 x 594 mm'},
          {id: 'A3', label: 'A3', sub: '297 x 420 mm'},
          {id: 'A4', label: 'A4', sub: '210 x 297 mm'},
          {id: 'B5', label: 'B5', sub: '182 x 257 mm'},
          {id: 'custom', label: 'Custom', sub: '自由入力'}
        ];
        const webSizes = [
          {id: '1920x1080', label: 'Full HD', sub: '1920 x 1080 (16:9)'},
          {id: '1080x1080', label: 'Square', sub: '1080 x 1080 (1:1)'},
          {id: '1080x1920', label: 'Story', sub: '1080 x 1920 (9:16)'},
          {id: 'custom', label: 'Custom', sub: '自由入力'}
        ];

        return `
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <div class="form-group">
              <label class="form-label" style="font-size: 14px; font-weight: 700;">制作物の種類 / 媒体</label>
              <div class="segmented-control" style="max-width: 400px;">
                <button class="segment-btn ${p.mediaType==='print'?'active':''}" onclick="Pages._updateSpec('projectInfo', 'mediaType', 'print'); Pages._updateSpec('projectInfo', 'size', 'A4'); render();">印刷物 (Poster, Flyer etc)</button>
                <button class="segment-btn ${p.mediaType==='web'?'active':''}" onclick="Pages._updateSpec('projectInfo', 'mediaType', 'web'); Pages._updateSpec('projectInfo', 'size', '1920x1080'); render();">ウェブ / SNS (Banner etc)</button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-size: 14px; font-weight: 700;">納品サイズ / 比率</label>
              <div class="size-grid">
                ${(p.mediaType==='print' ? printSizes : webSizes).map(s => `
                  <div class="size-chip ${p.size===s.id?'active':''}" onclick="Pages._updateSpec('projectInfo', 'size', '${s.id}'); render();">
                    <span class="size-chip-label">${s.label}</span>
                    <span class="size-chip-sub">${s.sub}</span>
                  </div>
                `).join('')}
              </div>
              
              ${p.size === 'custom' ? `
                <div style="display: flex; gap: 12px; margin-top: 16px; align-items: center;" class="fade-in">
                  <input type="text" class="form-input" style="width: 120px;" placeholder="横幅" oninput="Pages._updateCustomSize('width', this.value)">
                  <span>&times;</span>
                  <input type="text" class="form-input" style="width: 120px;" placeholder="縦幅" oninput="Pages._updateCustomSize('height', this.value)">
                  <span style="font-size: 12px; color: var(--text-muted);">(mm または px)</span>
                </div>
              ` : ''}
            </div>

            <div class="form-group">
              <label class="form-label" style="font-size: 14px; font-weight: 700;">制作要件 / メモ</label>
              <textarea class="form-textarea" rows="4" placeholder="例：光沢紙での印刷を想定。写真は高解像度なものを使用してください。" oninput="Pages._updateSpec('projectInfo', 'todo', this.value)">${Utils.escapeHtml(p.todo)}</textarea>
            </div>
          </div>
        `;
      }

      function renderReferencesTab() {
        const refs = state.specifications.references || [];
        
        return `
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <div class="form-group">
              <label class="form-label" style="font-size: 14px; font-weight: 700;">参考リンク・資料</label>
              <div style="background: var(--bg-alt); padding: 16px; border-radius: 12px; border: 1px dashed var(--border);">
                <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                  <input type="text" id="ref-link-title" class="form-input form-input-sm" style="flex:1;" placeholder="タイトル (例: 去年の制作物)">
                  <input type="text" id="ref-link-url" class="form-input form-input-sm" style="flex:2;" placeholder="URL (Google Drive, Pinterest等)">
                  <button class="btn btn-primary btn-sm" onclick="Pages._addRefLink()">追加</button>
                </div>
                
                <div class="ref-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">
                  ${refs.map((ref, idx) => {
                    const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(ref.url);
                    return `
                      <div class="ref-card" style="background: #fff; border: 1px solid var(--border-light); border-radius: 8px; overflow: hidden; position: relative;">
                        ${isImg ? `
                          <div style="height: 100px; background: url('${ref.url}') center/cover no-repeat;"></div>
                        ` : `
                          <div style="height: 60px; display: flex; align-items: center; justify-content: center; background: var(--bg-alt); color: var(--text-muted);">
                            ${Icons.link}
                          </div>
                        `}
                        <div style="padding: 10px;">
                          <div style="font-size: 12px; font-weight: 700; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${Utils.escapeHtml(ref.title)}</div>
                          <a href="${ref.url}" target="_blank" style="font-size: 10px; color: var(--primary); text-decoration: none;">リンクを開く</a>
                        </div>
                        <button onclick="Pages._removeRef(${idx})" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.5); color: #fff; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; cursor: pointer;">&times;</button>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-size: 14px; font-weight: 700;">画像ファイルのアップロード</label>
              <input type="file" class="form-input" style="padding: 8px;" onchange="Pages._mockUploadFile(this)">
              <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">※モックアップのため、選択したファイル名は参考リンクとして追加されます</p>
            </div>
          </div>
        `;
      }

      const setupEvents = () => {
        const titleInput = document.getElementById('task-title');
        if (titleInput) {
          titleInput.addEventListener('input', (e) => { 
            state.title = e.target.value; 
            // プレビューのテキストのみ更新
            const pt = container.querySelector('.preview-title');
            if (pt) pt.textContent = e.target.value || 'Sample Title';
          });
        }

        const deadlineInput = document.getElementById('task-deadline');
        if (deadlineInput) {
          deadlineInput.addEventListener('input', (e) => { state.deadline = e.target.value; });
        }

        const submitBtn = document.getElementById('btn-submit-task');
        if (submitBtn) {
          submitBtn.onclick = async () => {
            if (!state.assigneeId || !state.title) {
              Utils.showToast('担当者とタイトルを入力してください', 'warning');
              return;
            }
            
            const taskData = {
              assigneeId: state.assigneeId,
              requesterId: isEdit ? taskToEdit.requesterId : Auth.getCurrentUser().id,
              title: state.title,
              category: state.category,
              templateId: state.templateId,
              tags: state.tags,
              deadline: state.deadline,
              specifications: state.specifications
            };

            if (isEdit) {
              await API.updateTask(editId, taskData);
              App.navigate('/tasks/' + editId);
            } else {
              await API.createTask(taskData);
              App.navigate('/tasks');
            }
          };
        }
      };

      // ─── ロジック ─────────────────
      Pages._render = render;
      Pages._setTaskValue = (key, val) => { state[key] = val; Pages._render(); };
      Pages._selectAssignee = (id) => { state.assigneeId = id; state.showUserResults = false; state.userSearch = ''; Pages._render(); };
      Pages._toggleTaskTag = (tag) => {
        if (state.tags.includes(tag)) state.tags = state.tags.filter(t => t !== tag);
        else state.tags.push(tag);
        Pages._render();
      };
      Pages._updateSpec = (section, path, val) => {
        if (path.includes('.')) {
          const [p1, p2] = path.split('.');
          state.specifications[section][p1][p2] = val;
        } else {
          state.specifications[section][path] = val;
        }
        Pages._render(); 
      };
      Pages._updateColorPicker = (rowId, hex) => {
        const rgb = Utils.colorHexToRgb(hex);
        const cmyk = Utils.colorRgbToCmyk(rgb.r, rgb.g, rgb.b);
        const d = state.specifications.designInfo;
        d.rgb[rowId] = rgb;
        d.cmyk[rowId] = cmyk;
        
        // プレビュー反映
        const previewIcon = container.querySelector('.preview-mockup-poster');
        if (previewIcon) {
          if (rowId === 'title') {
            const el = previewIcon.querySelector('.preview-title');
            if(el) el.style.color = hex;
          }
          if (rowId === 'main') {
            const el = previewIcon.querySelector('.preview-main-graphic');
            if(el) el.style.backgroundColor = hex;
          }
          if (rowId === 'text') {
            const el = previewIcon.querySelector('.preview-text');
            if(el) el.style.color = hex;
          }
          if (rowId === 'glow') {
            const glowRing = previewIcon.querySelector('div[style*="border: 2px solid"]');
            if(glowRing) glowRing.style.borderColor = hex;
          }
          if (rowId === 'bg') {
            // 背景色プレビュー
            previewIcon.style.background = hex;
          }
        }
        
        // 数値表示の更新 (カスタムラベルを反映)
        const labels = d.labels || { title: 'タイトル', text: '本文 / その他', main: '主要グラフィック', glow: 'アクセント', shadow: '影/ベース' };
        const labelText = labels[rowId] || rowId;

        const inputEl = container.querySelector(`.color-swatch-row input[oninput*="${rowId}"]`);
        if (inputEl) {
          const infoDiv = inputEl.parentElement.querySelector('div:last-child');
          if (infoDiv) {
            infoDiv.innerHTML = `
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                <input type="text" value="${Utils.escapeHtml(labelText)}" 
                       oninput="Pages._updateSpec('designInfo', 'labels.${rowId}', this.value)"
                       style="font-weight: 700; font-size: 13px; border: none; background: transparent; padding: 0; width: 100%; color: var(--text-primary); outline: none;"
                       placeholder="項目名を入力...">
              </div>
              <div style="display: flex; gap: 12px; font-size: 10px; color: var(--text-muted);">
                <span>HEX: ${hex.toUpperCase()}</span>
                <span>RGB: ${rgb.r},${rgb.g},${rgb.b}</span>
              </div>
            `;
          }
        }
      };
      
      Pages._updateFont = (key, prop, val) => {
        state.specifications.designInfo.fonts[key][prop] = val;
        // プレビューのフォント名反映
        if (prop === 'name') {
          const previewTitle = container.querySelector('.preview-title');
          if (previewTitle && key === 'title') previewTitle.style.fontFamily = `'${val}', sans-serif`;
        }
      };

      Pages._updateCustomSize = (prop, val) => {
        if (!state.specifications.projectInfo._custom) state.specifications.projectInfo._custom = { width: '', height: '' };
        state.specifications.projectInfo._custom[prop] = val;
        state.specifications.projectInfo.size = `Custom (${state.specifications.projectInfo._custom.width} x ${state.specifications.projectInfo._custom.height})`;
      };

      Pages._loadTaskPreset = (pid) => {
        const p = presets.find(x => x.id === pid);
        if (p) {
          state.specifications = JSON.parse(JSON.stringify(p.specifications));
          if (!state.title) state.title = p.name;
          state.category = p.category || 'promotional';
          render();
        }
      };

      Pages._addRefLink = () => {
        const titleEl = document.getElementById('ref-link-title');
        const urlEl = document.getElementById('ref-link-url');
        const title = titleEl.value.trim();
        const url = urlEl.value.trim();
        if (!title || !url) return alert('タイトルとURLを入力してください');
        if (!state.specifications.references) state.specifications.references = [];
        state.specifications.references.push({ title, url });
        render();
      };

      Pages._removeRef = (idx) => {
        state.specifications.references.splice(idx, 1);
        render();
      };

      Pages._mockUploadFile = (input) => {
        if (input.files && input.files[0]) {
          const file = input.files[0];
          if (!state.specifications.references) state.specifications.references = [];
          state.specifications.references.push({ title: `[File] ${file.name}`, url: '#' });
          render();
        }
      };

      Pages._showTaskAssigneePicker = () => {
        let searchQuery = '';
        
        const renderPickerModal = () => {
          const content = `
            <div class="modal-content" style="width: 840px; max-width: 95vw;">
              <div class="modal-header"><h3>担当者の指名</h3></div>
              <div class="modal-body" style="padding: 24px; display: grid; grid-template-columns: 1fr 300px; gap: 24px;">
                <div class="picker-main">
                  <div class="form-group"><input type="text" id="assignee-search-modal" class="form-input" placeholder="名前・部署を日本語で入力..." value="${Utils.escapeHtml(searchQuery)}"></div>
                  <div id="assignee-results-list" style="max-height: 450px; overflow-y: auto;">
                    ${users.filter(u => !searchQuery || u.name.includes(searchQuery) || (u.department||'').includes(searchQuery)).map(u => `
                      <div class="picker-item" onclick="Pages._selectAssignee('${u.id}'); Utils.closeModal();" onmouseenter="Pages._showUserStatsInPanel('${u.id}')" style="cursor:pointer; padding:12px; border:1px solid var(--border-light); border-radius:8px; display:flex; align-items:center; gap:12px; margin-bottom:8px; background:#fff;">
                        ${C.avatar(u, 'sm')}
                        <div>
                          <div style="font-size:14px; font-weight:700;">${Utils.escapeHtml(u.name)}</div>
                          <div style="font-size:11px; color:var(--text-muted);">${u.department} / ${u.year}回生</div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
                <div class="picker-stats-panel" id="user-stats-panel" style="background:var(--bg-alt); padding:24px; border-radius:12px; border:1px solid var(--border-light); min-height:450px;">
                  <div style="text-align:center; color:var(--text-muted); padding-top:100px;">メンバーを選んでください</div>
                </div>
              </div>
            </div>
          `;
          Utils.showModal(content, { size: 'modal-xl' });
          
          const modalSearch = document.getElementById('assignee-search-modal');
          if (modalSearch) {
            modalSearch.focus();
            modalSearch.selectionStart = modalSearch.selectionEnd = modalSearch.value.length;
            modalSearch.oninput = (e) => {
              searchQuery = e.target.value;
              const list = document.getElementById('assignee-results-list');
              const filtered = users.filter(u => !searchQuery || u.name.includes(searchQuery) || (u.department||'').includes(searchQuery));
              list.innerHTML = filtered.map(u => `
                <div class="picker-item" onclick="Pages._selectAssignee('${u.id}'); Utils.closeModal();" onmouseenter="Pages._showUserStatsInPanel('${u.id}')" style="cursor:pointer; padding:12px; border:1px solid var(--border-light); border-radius:8px; display:flex; align-items:center; gap:12px; margin-bottom:8px; background:#fff;">
                  ${C.avatar(u, 'sm')}
                  <div>
                    <div style="font-size:14px; font-weight:700;">${Utils.escapeHtml(u.name)}</div>
                    <div style="font-size:11px; color:var(--text-muted);">${u.department} / ${u.year}回生</div>
                  </div>
                </div>
              `).join('');
            };
          }
        };
        renderPickerModal();
      };

      Pages._showUserStatsInPanel = (uid) => {
        const u = users.find(x => x.id === uid);
        const panel = document.getElementById('user-stats-panel');
        if (!u || !panel) return;
        panel.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; gap:12px; margin-bottom:20px;">
            ${C.avatar(u, 'lg')}
            <div style="text-align:center;">
              <div style="font-size:18px; font-weight:800;">${Utils.escapeHtml(u.name)}</div>
              <div style="font-size:12px; color:var(--text-muted);">${u.department} / ${u.year}回生</div>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:20px;">
            <div style="background:#fff; border-radius:12px; padding:16px; border:1px solid var(--border-light);">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:12px; font-weight:700;">審査遅延率</span>
                  <span style="font-size:16px; font-weight:800; color:${u.delayRate > 10 ? 'var(--danger)' : 'var(--success)'}">${u.delayRate}%</span>
              </div>
            </div>
            <div>
              <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px;">最近の担当案件</div>
              ${(u.recentWorks || []).map(work => `<div style="background:#fff; border:1px solid var(--border-light); border-radius:8px; padding:10px; font-size:11px; margin-bottom:4px;">${work}</div>`).join('') || '<div style="font-size:11px;">登録なし</div>'}
            </div>
          </div>
        `;
      };

      // グリッド外クリックで検索結果を閉じる
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.form-group')) {
          if (state.showUserResults) {
            state.showUserResults = false;
            render();
          }
        }
      }, { once: true });

      render();
    };

    Pages.taskDetail = async (container, id) => {
      const task = await API.getTask(id);
      if (!task) { container.innerHTML = '依頼が見つかりません'; return; }
      const requester = MockData.getUser(task.requesterId);
      const assignee = MockData.getUser(task.assigneeId);
      const user = Auth.getCurrentUser();
      const isAssignee = user.id === task.assigneeId;

      // 内部状態（ファイルアップロード用）
      let selectedFiles = [];

      const render = () => {
        container.innerHTML = `
          <div class="page-header">
            <div>
              <button class="btn btn-ghost" onclick="App.navigate('/tasks')">${Icons.arrowLeft} 一覧に戻る</button>
              <h1 class="page-title">${Utils.escapeHtml(task.title)}</h1>
              <p class="page-subtitle">
                ${Utils.formatDate(task.createdAt, 'full')} に ${Utils.escapeHtml(requester?.name)} からの依頼
              </p>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
              ${user.id === task.requesterId ? `
                <button class="btn btn-outline" style="padding: 8px 16px;" onclick="App.navigate('/tasks/${task.id}/edit')">
                  ${Icons.edit} 依頼内容を編集
                </button>
              ` : ''}
              <span class="badge" style="padding: 8px 16px; border-radius: 20px; font-size: 14px; background: ${task.status === 'submitted' ? 'var(--success-light)' : 'var(--primary-light)'}; color: ${task.status === 'submitted' ? 'var(--success)' : 'var(--primary)'}; font-weight: 700;">
                ${task.status === 'submitted' ? '提出済み' : '進行中'}
              </span>
            </div>
          </div>

          <div class="detail-grid" style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
            <div class="detail-main" style="display: flex; flex-direction: column; gap: 24px;">
              ${typeof task.specifications === 'object' ? renderStructuredSpecs(task.specifications) : `
                <div class="detail-card fade-in-up">
                  <h2 class="section-title">${Icons.fileText} 仕様書 / 要望内容</h2>
                  <div style="white-space: pre-wrap; line-height: 1.8; color: var(--text-dark); margin-top: 16px; font-size: 15px;">${Utils.escapeHtml(task.specifications)}</div>
                </div>
              `}
            </div>

            <div class="detail-sidebar">
              <!-- 依頼者・担当者情報 -->
              <div class="detail-card fade-in-up" style="margin-bottom: 24px;">
                <h2 class="section-title">依頼ステータス</h2>
                <div style="display: flex; flex-direction: column; gap: 16px; margin-top: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="info-label">依頼者</span>
                    <div style="display: flex; align-items: center; gap: 8px; font-weight: 600;">
                      ${C.avatar(requester, 'xs')} ${Utils.escapeHtml(requester?.name)}
                    </div>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="info-label">担当者</span>
                    <div style="display: flex; align-items: center; gap: 8px; font-weight: 600;">
                      ${C.avatar(assignee, 'xs')} ${Utils.escapeHtml(assignee?.name)}
                    </div>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="info-label">提出希望日</span>
                    <span style="color: var(--danger); font-weight: 700;">${task.deadline || '指定なし'}</span>
                  </div>
                </div>
              </div>

              <!-- 提出セクション -->
              ${isAssignee && task.status !== 'submitted' ? `
                <div class="detail-card fade-in-up" style="border: 2px solid var(--primary-light); background: linear-gradient(135deg, #fff 0%, var(--bg-alt) 100%);">
                  <h3 style="font-size: 16px; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    ${Icons.check} 制作物の提出
                  </h3>
                  <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px;">
                    完成したファイルをアップロードして、承認申請を開始します。
                    依頼時の設定（${Utils.getCategoryInfo(task.category).label} / ${task.templateId ? '事前指定ルート' : 'カスタムルート'}）が適用されます。
                  </p>
                  
                  <div class="upload-zone" id="task-upload-zone" style="border: 2px dashed var(--border); border-radius: 12px; padding: 24px; text-align: center; cursor: pointer; transition: all 0.2s; background: #fff; margin-bottom: 16px;">
                    <div style="font-size: 24px; color: var(--text-muted); margin-bottom: 8px;">${Icons.upload}</div>
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-secondary);">クリックしてファイルを選択</div>
                    <input type="file" id="task-file-input" style="display: none;" multiple>
                  </div>

                  <div id="selected-files-list" style="margin-bottom: 20px;">
                    ${selectedFiles.map((f, i) => `
                      <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #fff; border: 1px solid var(--border-light); border-radius: 8px; margin-bottom: 6px; font-size: 12px;">
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;">${Utils.escapeHtml(f.name)}</span>
                        <button onclick="Pages._removeFile(${i})" style="background: none; border: none; color: var(--text-muted); cursor: pointer;">&times;</button>
                      </div>
                    `).join('')}
                  </div>

                  <button class="btn btn-primary btn-block" id="btn-submit-work" style="padding: 14px;" ${selectedFiles.length === 0 ? 'disabled' : ''}>
                    ${Icons.send} 制作物を提出して申請する
                  </button>
                </div>
              ` : task.status === 'submitted' ? `
                <div class="detail-card fade-in-up" style="background: var(--success-light); border: 1px solid var(--success); text-align: center; padding: 24px;">
                  <div style="font-size: 32px; color: var(--success); margin-bottom: 8px;">✓</div>
                  <h3 style="font-size: 15px; font-weight: 700; color: var(--success);">提出済み</h3>
                  <p style="font-size: 12px; color: var(--success); opacity: 0.8; margin-top: 4px;">承認フローが開始されています</p>
                </div>
              ` : ''}
            </div>
          </div>
        `;

        setupEvents();
      };

      function renderStructuredSpecs(s) {
        const p = s.projectInfo;
        const d = s.designInfo;

        const colorLabels = d.labels || {
          bg: '背景色', title: 'タイトル', text: '本文/その他', main: 'キービジュアル主体', 
          glow: 'アクセント/光沢', shadow: '影/ベース'
        };

        let fields = p.fields;
        let values = p.values;

        // 互換性対応: 旧形式（fields/valuesがない）の場合はデフォルト項目を割り当てる
        if (!fields) {
          fields = [
            { id: 'name', label: '企画名', type: 'text' },
            { id: 'purpose', label: '開催目的', type: 'textarea' },
            { id: 'overview', label: '企画概要', type: 'textarea' },
            { id: 'date', label: '開催日時', type: 'text' },
            { id: 'todo', label: '依頼内容', type: 'textarea' }
          ];
          values = p;
        }

        return `
          <div class="spec-sheet fade-in-up">
            <!-- ヘッダー：基本スペック -->
            <div class="spec-sheet-header">
              <div>
                <span class="spec-item-label">制作種別 / 媒体</span>
                <div style="font-size: 18px; font-weight: 800; color: var(--primary);">
                  ${p.mediaType === 'print' ? '印刷物' : 'ウェブ / SNS'}
                </div>
              </div>
              <div style="text-align: right;">
                <span class="spec-item-label">納品サイズ</span>
                <div style="font-size: 18px; font-weight: 800; color: var(--text-dark);">
                  ${Utils.escapeHtml(p.size || '未指定')}
                </div>
              </div>
            </div>

            <!-- セクション1：企画詳細（動的項目） -->
            <div class="spec-section">
              <h3 style="font-size: 12px; font-weight: 800; color: var(--primary); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.1em;">
                Project Information - 企画概要・詳細
              </h3>
              <div class="spec-label-group">
                ${fields.map(f => `
                  <div class="spec-item" style="${f.type === 'textarea' ? 'grid-column: 1 / -1;' : ''}">
                    <span class="spec-item-label">${f.label}</span>
                    <div class="spec-item-value" style="white-space: pre-wrap;">${Utils.escapeHtml(values[f.id] || '-')}</div>
                  </div>
                `).join('')}
                ${fields.length === 0 ? '<div style="color:var(--text-muted); opacity:0.5; padding:20px; text-align:center; grid-column:1/-1;">詳細情報の規定項目はありません</div>' : ''}
              </div>
            </div>

            <!-- セクション2：ビジュアルカラー -->
            <div class="spec-section" style="background: #fafafa;">
              <h3 style="font-size: 12px; font-weight: 800; color: var(--primary); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.1em;">
                Color Palette - 配色指定
              </h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px;">
                ${Object.keys(d.cmyk).map(key => {
                  const r = d.rgb[key];
                  const c = d.cmyk[key];
                  const hex = Utils.colorRgbToHex(r.r, r.g, r.b);
                  return `
                    <div style="display: flex; gap: 12px; padding: 12px; border: 1px solid var(--border-light); background: #fff; border-radius: 12px; align-items: center;">
                      <div style="width: 48px; height: 48px; border-radius: 8px; background: ${hex}; border: 1px solid var(--border-light);"></div>
                      <div style="flex: 1;">
                        <div style="font-size: 12px; font-weight: 700;">${colorLabels[key] || key}</div>
                        <div style="font-size: 10px; color: var(--text-muted); line-height: 1.4; margin-top: 2px;">
                          HEX: ${hex.toUpperCase()}<br>
                          RGB: ${r.r}, ${r.g}, ${r.b} / CMYK: ${c.c}, ${c.m}, ${c.y}, ${c.k}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- セクション3：タイポグラフィ -->
            <div class="spec-section">
              <h3 style="font-size: 12px; font-weight: 800; color: var(--primary); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.1em;">
                Typography - フォント指定
              </h3>
              <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                ${Object.entries(d.fonts).map(([key, val]) => {
                  const labels = {title:'タイトル用', main:'メイン用', text:'本文・その他'};
                  // データの正規化: 文字列であればオブジェクトに変換（[native code] 対策）
                  const fData = (typeof val === 'object' && val !== null) ? val : { name: val, link: '' };
                  const fName = fData.name;
                  const fLink = (typeof fData.link === 'string') ? fData.link : '';
                  
                  return `
                    <div style="flex: 1; min-width: 200px;">
                      <span class="spec-item-label">${labels[key] || key}</span>
                      <div class="font-chip" style="margin-top: 4px; justify-content: space-between;">
                        <span style="font-family: '${fName}', sans-serif;">${Utils.escapeHtml(fName)}</span>
                        ${fLink ? `<a href="${fLink}" target="_blank" class="font-link-btn">${Icons.externalLink} Link</a>` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- セクション4：ビジュアルプレビュー -->
            <div class="spec-section" style="border-top: 1px solid var(--border-light); padding-top: 32px;">
              <h3 style="font-size: 12px; font-weight: 800; color: var(--primary); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.1em;">
                Visual Preview - 完成イメージ（案）
              </h3>
              <div style="display: flex; justify-content: center; background: var(--bg-alt); padding: 40px; border-radius: 16px; border: 1px solid var(--border-light);">
                <div class="preview-mockup-poster" style="background: #fff; width: 280px; height: 396px; border: 1px solid var(--border-light); box-shadow: var(--shadow-lg); transition: none; transform: none; cursor: default;">
                   <div class="preview-title" style="color: rgb(${d.rgb.title.r},${d.rgb.title.g},${d.rgb.title.b}); font-family: '${d.fonts.title.name}', sans-serif;">
                    ${Utils.escapeHtml(values.name || 'Sample Title')}
                   </div>
                   <div class="preview-main-graphic" style="background: rgb(${d.rgb.main.r},${d.rgb.main.g},${d.rgb.main.b}); opacity: 0.8; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px;">
                    Main Graphic / Key Visual
                   </div>
                   <div class="preview-text" style="color: rgb(${d.rgb.text.r},${d.rgb.text.g},${d.rgb.text.b});">
                    ${Utils.escapeHtml(values.overview || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.')}
                   </div>
                   <div style="position: absolute; bottom: 12px; right: 12px; width: 30px; height: 30px; border-radius: 50%; border: 2px solid rgb(${d.rgb.glow.r},${d.rgb.glow.g},${d.rgb.glow.b});"></div>
                </div>
              </div>
              <p style="font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 12px;">
                ※ 本プレビューは指定カラーとフォントに基づいた自動生成イメージです。レイアウト等は制作にあたって調整されます。
              </p>
            </div>
          </div>
        `;
      }


      const setupEvents = () => {
        const zone = document.getElementById('task-upload-zone');
        const input = document.getElementById('task-file-input');
        if (zone && input) {
          zone.onclick = () => input.click();
          input.onchange = (e) => {
            const files = Array.from(e.target.files);
            selectedFiles = [...selectedFiles, ...files.map(f => ({
              id: Utils.generateId(),
              name: f.name,
              size: f.size,
              type: 'final',
              version: 1,
              uploadedAt: new Date()
            }))];
            render();
          };
        }

        const submitBtn = document.getElementById('btn-submit-work');
        if (submitBtn) {
          submitBtn.onclick = async () => {
            if (selectedFiles.length === 0) return;
            
            // 申請を作成
            const appData = {
              title: task.title,
              category: task.category,
              description: typeof task.specifications === 'object' ? `[依頼からの提出]\n企画名: ${task.specifications.projectInfo.name}\n目的: ${task.specifications.projectInfo.purpose}` : task.specifications,
              deadline: task.deadline,
              isFestivalRelated: task.tags.includes('大祭関連'),
              tags: task.tags,
              files: selectedFiles,
              templateId: task.templateId
            };

            const newApp = await API.createApplication(appData);
            
            // タスクステータス更新
            task.status = 'submitted';
            MockData.saveData();

            Utils.showToast('制作物を提出し、承認フローを開始しました', 'success');
            App.navigate('/applications/' + newApp.id);
          };
        }
      };

      Pages._removeFile = (idx) => {
        selectedFiles.splice(idx, 1);
        render();
      };

      render();
    };

    // ═══════════════════════════════════════
    // 申請詳細
    // ═══════════════════════════════════════
    Pages.applicationDetail = async (container, id) => {
      const app = await API.getApplication(id);
      if (!app) { container.innerHTML = '案件が見つかりません'; return; }
      const creator = MockData.getUser(app.creatorId);
      const comments = await API.getComments(id);
      const wf = WorkflowEngine.buildWorkflowState(app);
      const user = Auth.getCurrentUser();
      const isAssignee = app.currentStepIndex < wf.length && wf[app.currentStepIndex].assignees && wf[app.currentStepIndex].assignees.some(a=>a.id===user.id);
      const canAct = isAssignee && app.status !== 'completed';

      container.innerHTML = `
        <div class="page-header">
          <div>
            <button class="btn btn-ghost" onclick="App.navigate('/applications')">${Icons.arrowLeft} 一覧に戻る</button>
            <h1 class="page-title">${escapeHtml(app.title)}</h1>
            <div class="page-meta">
              ${C.categoryBadge(app.category)}
              ${C.statusBadge(app.status)}
              ${C.deadlineBadge(app.deadline)}
              ${(app.tags || []).map(t => Utils.tagBadge(t)).join('')}
            </div>
          </div>
        </div>

        <div class="detail-flow-section">
          <h2 class="section-title">承認フロー</h2>
          ${C.workflowDiagram(wf, app.currentStepIndex)}
        </div>

        <div class="detail-grid">
          <div class="detail-main">
            <div class="detail-card">
              <h2 class="section-title">ファイル</h2>
              ${C.fileList(app.files)}
            </div>
            <div class="detail-card">
              <h2 class="section-title">案件情報</h2>
              <p class="detail-desc">${escapeHtml(app.description || '説明なし')}</p>
              <div class="detail-info-grid">
                <div><span class="info-label">作成者</span><div class="info-value">${C.avatar(creator,'xs')} ${creator?creator.name:'不明'}</div></div>
                <div><span class="info-label">作成日</span><div class="info-value">${formatDate(app.createdAt,'full')}</div></div>
                <div><span class="info-label">カテゴリ</span><div class="info-value">${getCategoryInfo(app.category).label}</div></div>
              </div>
            </div>
            ${canAct ? `
            <div class="detail-card action-card" style="background: #F0F7FF; border: 1px solid #4F6AFF50;">
              <h2 class="section-title">${Icons.check} 承認アクション</h2>
              <div class="form-group">
                <textarea id="action-comment" class="form-textarea" placeholder="承認または差し戻しの理由を記入（任意）" rows="3"></textarea>
              </div>
              <div class="action-buttons">
                <button class="btn btn-success btn-lg" onclick="Pages._approve('${id}')">${Icons.check} 承認する</button>
                <button class="btn btn-danger btn-lg" onclick="Pages._reject('${id}')">${Icons.undo} 差し戻す</button>
              </div>
            </div>` : ''}
          </div>

          <div class="detail-sidebar">
            <div class="detail-card">
              <h2 class="section-title">タイムライン</h2>
              ${C.commentThread(app, comments)}
              ${C.commentForm(id)}
            </div>
          </div>
        </div>
      `;
    };

    Pages._approve = (id) => {
      const comment = document.getElementById('action-comment')?.value || '';
      API.approveStep(id, comment).then(() => App.navigate('/applications/' + id));
    };
    Pages._reject = (id) => {
      const comment = document.getElementById('action-comment')?.value;
      if (!comment) { Utils.showToast('差し戻しには理由の記入が必要です','warning'); return; }
      API.rejectStep(id, comment).then(() => App.navigate('/applications/' + id));
    };

    // ═══════════════════════════════════════
    // 分析 (管理者)
    // ═══════════════════════════════════════
    Pages.admin = async (container) => {
      let analytics = await API.getAnalytics();
      let apps = await API.getApplications();
      
      let currentView = 'performance';
      let taskFilterStatus = '';
      let userSearch = '';
      let userSort = { key: 'completionRate', order: 'desc' };

      const renderUserRows = (usersList) => {
        return usersList.map(u => `
          <tr>
            <td><div style="display:flex;align-items:center;gap:8px;">${C.avatar({id:u.userId, name:u.name}, 'xs')} <span style="font-weight:600">${escapeHtml(u.name)}</span></div></td>
            <td><span class="badge" style="background:#f1f5f9; color:#64748b; font-size:10px;">${escapeHtml(u.department)}</span></td>
            <td>${u.year}回生</td>
            <td>${u.requestCount}</td>
            <td>${u.totalHandled}</td>
            <td style="font-weight:700; color:${u.completionRate > 80 ? 'var(--success)' : 'var(--warning)'}">${u.completionRate}%</td>
            <td style="color:${u.delayRate > 20 ? 'var(--danger)' : 'var(--text-muted)'}">${u.delayRate}%</td>
            <td style="color:${u.unprocessedRate > 30 ? 'var(--danger)' : 'var(--text-muted)'}">${u.unprocessedRate}%</td>
            <td>
              <span class="badge" style="background:${u.workload > 3 ? 'var(--danger-light)' : '#f1f5f9'}; color:${u.workload > 3 ? 'var(--danger)' : '#64748b'};">
                ${u.workload}件
              </span>
            </td>
          </tr>
        `).join('');
      };

      const render = () => {
        const {summary:s, userPerformance:p, tagStats:ts} = analytics;
        
        container.innerHTML = `
          <div class="page-header">
            <div>
              <h1 class="page-title">分析ダッシュボード</h1>
              <p class="page-subtitle">組織全体のパフォーマンスと進捗を可視化します</p>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn ${currentView==='performance'?'btn-primary':'btn-outline'} btn-sm" id="btn-view-performance">パフォーマンス</button>
              <button class="btn ${currentView==='tasks'?'btn-primary':'btn-outline'} btn-sm" id="btn-view-tasks">タスク確認</button>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stats-card clickable" onclick="Pages._filterAdminTasks('pending')" style="--stats-color: var(--warning); cursor:pointer;">
              <div class="stats-icon">${Icons.clock}</div>
              <div><span class="stats-value">${s.pending}</span><span class="stats-label">審査待ち</span></div>
            </div>
            <div class="stats-card clickable" onclick="Pages._filterAdminTasks('rejected')" style="--stats-color: var(--danger); cursor:pointer;">
              <div class="stats-icon">${Icons.alert}</div>
              <div><span class="stats-value">${s.rejected}</span><span class="stats-label">差し戻し</span></div>
            </div>
            <div class="stats-card clickable" onclick="Pages._filterAdminTasks('completed')" style="--stats-color: var(--success); cursor:pointer;">
              <div class="stats-icon">${Icons.check}</div>
              <div><span class="stats-value">${s.completed}</span><span class="stats-label">完了済み</span></div>
            </div>
            <div class="stats-card" style="--stats-color: var(--primary);">
              <div class="stats-icon">${Icons.trending}</div>
              <div><span class="stats-value">${s.total}</span><span class="stats-label">累計案件数</span></div>
            </div>
          </div>

          <div class="admin-dashboard-layout" style="display:grid; grid-template-columns: 280px 1fr; gap:24px; margin-top:24px;">
            <aside class="admin-sidebar" id="admin-sidebar-container"></aside>
            <main class="admin-main" id="admin-main-container"></main>
          </div>
        `;

        const sidebar = container.querySelector('#admin-sidebar-container');
        const main = container.querySelector('#admin-main-container');

        sidebar.innerHTML = `
          <div class="detail-card">
            <h3 class="section-title" style="margin-bottom:16px;">カテゴリ別分析</h3>
            <div style="display:flex; flex-direction:column; gap:16px;">
              ${Object.entries(s.catStats).map(([catId, data]) => {
                const info = Utils.getCategoryInfo(catId);
                const rate = data.completed > 0 ? Math.round((data.onTime / data.completed) * 100) : 100;
                return `
                  <div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
                      <span style="font-weight:600; color:${info.color}">${info.label}</span>
                      <span style="color:var(--text-muted)">${data.completed}/${data.total} 件</span>
                    </div>
                    <div class="bar-track" style="height:8px; background:var(--bg-alt); border-radius:10px;">
                      <div class="bar-fill" style="width:${rate}%; background:${info.color}; border-radius:10px;"></div>
                    </div>
                    <div style="font-size:11px; margin-top:4px; color:var(--text-muted)">期限遵守率: ${rate}%</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="detail-card">
            <h3 class="section-title" style="margin-bottom:16px;">企画・タグ別分析</h3>
            <div style="display:flex; flex-direction:column; gap:20px;">
              ${Object.entries(ts).map(([tagName, data]) => `
                <div style="padding:16px; border-radius:14px; background:var(--bg-alt); border:1px solid var(--border-light); box-shadow:var(--shadow-sm);">
                  <div style="font-size:14px; font-weight:800; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                    <span style="display:flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:8px; background:var(--primary-light); color:var(--primary);">${Icons.tag}</span>
                    ${escapeHtml(tagName)}
                  </div>
                  <div style="display:flex; flex-direction:column; gap:12px;">
                    ${Object.entries(data.breakdown).map(([catId, cData]) => {
                      const info = Utils.getCategoryInfo(catId);
                      const rate = cData.total > 0 ? Math.round((cData.completed / cData.total) * 100) : 0;
                      return `
                        <div>
                          <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px;">
                            <span style="font-weight:600; color:var(--text-secondary)">${info.label}</span>
                            <span style="color:var(--text-muted)">${cData.completed}/${cData.total}</span>
                          </div>
                          <div class="bar-track" style="height:6px; background:var(--border); border-radius:10px;">
                            <div class="bar-fill" style="width:${rate}%; background:${info.color}; border-radius:10px;"></div>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                  <div style="margin-top:12px; padding-top:12px; border-top:1px dashed var(--border); display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:11px; font-weight:700; color:var(--text-muted);">期限遵守率</span>
                    <span style="font-size:13px; font-weight:800; color:var(--success);">${data.onTimeRate}%</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        const updateMain = () => {
          if (currentView === 'performance') {
            main.innerHTML = `
              <div class="detail-card">
                <div class="section-header" style="margin-bottom:20px;">
                  <h2 class="section-title">メンバー別パフォーマンス</h2>
                  <div class="filter-search" style="width:240px;">
                    <input type="text" id="admin-user-search" class="form-input form-input-sm" placeholder="名前・部署で検索..." value="${escapeHtml(userSearch)}">
                  </div>
                </div>
                <div style="overflow-x:auto;">
                  <table class="admin-table">
                    <thead>
                      <tr>
                        <th onclick="Pages._sortAdminUser('name')" style="cursor:pointer;">メンバー ${userSort.key==='name'? (userSort.order==='asc'?'↑':'↓') : ''}</th>
                        <th onclick="Pages._sortAdminUser('department')" style="cursor:pointer;">部署 ${userSort.key==='department'? (userSort.order==='asc'?'↑':'↓') : ''}</th>
                        <th onclick="Pages._sortAdminUser('year')" style="cursor:pointer;">回生 ${userSort.key==='year'? (userSort.order==='asc'?'↑':'↓') : ''}</th>
                        <th onclick="Pages._sortAdminUser('requestCount')" style="cursor:pointer;">依頼 ${userSort.key==='requestCount'? (userSort.order==='asc'?'↑':'↓') : ''}</th>
                        <th onclick="Pages._sortAdminUser('totalHandled')" style="cursor:pointer;">審査 ${userSort.key==='totalHandled'? (userSort.order==='asc'?'↑':'↓') : ''}</th>
                        <th onclick="Pages._sortAdminUser('completionRate')" style="cursor:pointer;">達成率 ${userSort.key==='completionRate'? (userSort.order==='asc'?'↑':'↓') : ''}</th>
                        <th onclick="Pages._sortAdminUser('delayRate')" style="cursor:pointer;">遅延率 ${userSort.key==='delayRate'? (userSort.order==='asc'?'↑':'↓') : ''}</th>
                        <th onclick="Pages._sortAdminUser('unprocessedRate')" style="cursor:pointer;">未処理 ${userSort.key==='unprocessedRate'? (userSort.order==='asc'?'↑':'↓') : ''}</th>
                        <th onclick="Pages._sortAdminUser('workload')" style="cursor:pointer;">負荷 ${userSort.key==='workload'? (userSort.order==='asc'?'↑':'↓') : ''}</th>
                      </tr>
                    </thead>
                    <tbody id="admin-user-table-body"></tbody>
                  </table>
                </div>
              </div>
            `;
            const input = container.querySelector('#admin-user-search');
            input.addEventListener('input', e => {
              userSearch = e.target.value;
              refreshTable();
            });
            refreshTable();
          } else {
            main.innerHTML = `
              <div class="detail-card">
                <div class="section-header" style="margin-bottom:20px;">
                  <h2 class="section-title">${taskFilterStatus ? Utils.getStatusInfo(taskFilterStatus).label : '全案件'} リスト</h2>
                  <button class="btn btn-ghost btn-sm" onclick="Pages._filterAdminTasks('')">フィルタ解除</button>
                </div>
                <div class="admin-task-list" style="display:flex; flex-direction:column; gap:12px;">
                  ${apps.filter(a => !taskFilterStatus || a.status === taskFilterStatus).map(app => C.applicationCard(app)).join('')}
                  ${apps.filter(a => !taskFilterStatus || a.status === taskFilterStatus).length === 0 ? '<div class="empty-state">該当する案件はありません</div>' : ''}
                </div>
              </div>
            `;
          }
        };

        const refreshTable = () => {
          const tbody = container.querySelector('#admin-user-table-body');
          if (!tbody) return;
          let filteredUsers = p.filter(u => 
            u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
            u.department.toLowerCase().includes(userSearch.toLowerCase())
          );
          filteredUsers.sort((a,b) => {
            let vA = a[userSort.key], vB = b[userSort.key];
            if (typeof vA === 'string') return userSort.order === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
            return userSort.order === 'asc' ? vA - vB : vB - vA;
          });
          tbody.innerHTML = renderUserRows(filteredUsers);
        };

        updateMain();

        container.querySelector('#btn-view-performance').onclick = () => { currentView = 'performance'; updateMain(); };
        container.querySelector('#btn-view-tasks').onclick = () => { currentView = 'tasks'; updateMain(); };
      };

      Pages._setAdminView = (v) => { currentView = v; render(); };
      Pages._filterAdminTasks = (s) => { currentView = 'tasks'; taskFilterStatus = s; render(); };
      Pages._sortAdminUser = (key) => {
        if (userSort.key === key) userSort.order = userSort.order === 'asc' ? 'desc' : 'asc';
        else { userSort.key = key; userSort.order = 'desc'; }
        render();
      };

      render();
    };

    // ═══════════════════════════════════════
    // ユーザー管理
    // ═══════════════════════════════════════
    // ───────────────────────────────────────
    // システム管理 (統合版)
    // ───────────────────────────────────────
    Pages.systemSettings = async (container) => {
      let [roleDefs, templates, tagDefs, users] = await Promise.all([
        API.getRoleDefinitions(),
        API.getWorkflowTemplates(),
        API.getTagDefinitions(),
        API.getUsers()
      ]);

      let activeTab = 'users'; // デフォルトはユーザー一覧
      let selectedRoleId = roleDefs.length > 0 ? roleDefs[0].id : null;
      let roleSubTab = 'settings'; // rolesタブ内のサブタブ: 'settings' or 'members'
      
      // ユーザー一覧の状態管理
      let userFilters = { search: '', depts: [], years: [], role: '' };
      let userSort = { key: 'name', order: 'asc' };

      const render = () => {
        container.innerHTML = `
          <div class="page-header">
            <div>
              <h2 class="page-title">システム管理</h2>
              <p class="page-subtitle">組織構成・権限・フロー・マスタの一元管理</p>
            </div>
          </div>

          <div class="tabs-container">
            <div class="tabs">
              <button class="tab ${activeTab==='users'?'tab-active':''}" onclick="Pages._switchAdminSuiteTab('users')">ユーザー一覧</button>
              <button class="tab ${activeTab==='roles'?'tab-active':''}" onclick="Pages._switchAdminSuiteTab('roles')">ロール・権限</button>
              <button class="tab ${activeTab==='routes'?'tab-active':''}" onclick="Pages._switchAdminSuiteTab('routes')">ルートプリセット</button>
              <button class="tab ${activeTab==='presets'?'tab-active':''}" onclick="Pages._switchAdminSuiteTab('presets')">仕様書セット</button>
              <button class="tab ${activeTab==='tags'?'tab-active':''}" onclick="Pages._switchAdminSuiteTab('tags')">マスタタグ</button>
            </div>
          </div>

          <div id="admin-suite-content" class="admin-tab-content">
            ${activeTab === 'users' ? renderUsers() : 
              activeTab === 'roles' ? renderRoles() : 
              activeTab === 'routes' ? renderRoutes() : 
              activeTab === 'presets' ? renderPresets() : renderTags()}
          </div>
        `;
        if (activeTab === 'roles') attachRoleEvents();
      };

      // 1. ユーザー一覧タブ
      function renderUsers() {
        const departments = ['財務','総務','企画','広報','渉外','厚生','福祉'];
        let filtered = users.filter(u => {
          const matchSearch = !userFilters.search || u.name.toLowerCase().includes(userFilters.search.toLowerCase()) || u.email.toLowerCase().includes(userFilters.search.toLowerCase());
          
          // 部署（複数選択）
          const normalizedUserDept = Utils.normalizeDept(u.department);
          const matchDept = userFilters.depts.length === 0 || userFilters.depts.some(fd => Utils.normalizeDept(fd) === normalizedUserDept);
          
          // 回生（複数選択）
          const matchYear = userFilters.years.length === 0 || userFilters.years.includes(String(u.year || 1));
          
          const matchRole = !userFilters.role || (u.roles || []).includes(userFilters.role);
          return matchSearch && matchDept && matchYear && matchRole;
        });

        // ソート適用
        filtered.sort((a,b) => {
          let v1 = a[userSort.key], v2 = b[userSort.key];
          if (userSort.key === 'year') { v1 = Number(v1); v2 = Number(v2); }
          if (v1 < v2) return userSort.order === 'asc' ? -1 : 1;
          if (v1 > v2) return userSort.order === 'asc' ? 1 : -1;
          return 0;
        });

        const sortIcon = (key) => {
          if (userSort.key !== key) return '<span style="opacity:0.2">↕</span>';
          return userSort.order === 'asc' ? '↑' : '↓';
        };

        return `
          <div class="filter-bar" style="gap:20px; align-items:flex-end;">
            <div class="filter-group" style="flex:1; min-width:240px;">
              <div class="filter-label">キーワード検索</div>
              <input type="text" class="form-input" placeholder="名前・メールでリアルタイム検索..." value="${Utils.escapeHtml(userFilters.search)}" oninput="Pages._updateUserFilter('search', this.value)">
            </div>

            <!-- 部署マルチセレクト -->
            <div class="filter-group" style="width:160px;">
              <div class="filter-label">部署 (複数可)</div>
              <div class="custom-multiselect">
                <details class="dropdown">
                  <summary class="btn btn-outline btn-sm" style="width:100%; justify-content:space-between; font-weight:500;">
                    ${userFilters.depts.length > 0 ? `${userFilters.depts.length}個選択中` : 'すべて'}
                    <span style="font-size:10px;">▼</span>
                  </summary>
                  <div class="dropdown-content" style="padding:12px; min-width:180px;">
                    ${departments.map(d => `
                      <label style="display:flex; align-items:center; gap:8px; margin-bottom:8px; font-size:13px; cursor:pointer;">
                        <input type="checkbox" onchange="Pages._toggleMultiFilter('depts', '${d}')" ${userFilters.depts.includes(d)?'checked':''}>
                        ${d}
                      </label>
                    `).join('')}
                  </div>
                </details>
              </div>
            </div>

            <!-- 回生マルチセレクト -->
            <div class="filter-group" style="width:140px;">
              <div class="filter-label">回生 (複数可)</div>
              <div class="custom-multiselect">
                <details class="dropdown">
                  <summary class="btn btn-outline btn-sm" style="width:100%; justify-content:space-between; font-weight:500;">
                    ${userFilters.years.length > 0 ? `${userFilters.years.length}個選択中` : 'すべて'}
                    <span style="font-size:10px;">▼</span>
                  </summary>
                  <div class="dropdown-content" style="padding:12px; min-width:140px;">
                    ${[1,2,3,4].map(y => `
                      <label style="display:flex; align-items:center; gap:8px; margin-bottom:8px; font-size:13px; cursor:pointer;">
                        <input type="checkbox" onchange="Pages._toggleMultiFilter('years', '${y}')" ${userFilters.years.includes(String(y))?'checked':''}>
                        ${y}回生
                      </label>
                    `).join('')}
                  </div>
                </details>
              </div>
            </div>

            <div class="filter-group" style="width:160px;">
              <div class="filter-label">ロール</div>
              <select class="form-select form-select-sm" onchange="Pages._updateUserFilter('role', this.value)">
                <option value="">すべて</option>
                ${roleDefs.map(r => `<option value="${r.id}" ${userFilters.role===r.id?'selected':''}>${r.name}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- フィルタチップエリア -->
          <div class="filter-chip-container">
            ${userFilters.depts.map(d => `
              <div class="filter-chip">部署: ${d} <span class="filter-chip-remove" onclick="Pages._toggleMultiFilter('depts', '${d}')">&times;</span></div>
            `).join('')}
            ${userFilters.years.map(y => `
              <div class="filter-chip">${y}回生 <span class="filter-chip-remove" onclick="Pages._toggleMultiFilter('years', '${y}')">&times;</span></div>
            `).join('')}
            ${userFilters.role ? `
              <div class="filter-chip">ロール: ${roleDefs.find(r=>r.id===userFilters.role)?.name} <span class="filter-chip-remove" onclick="Pages._updateUserFilter('role', '')">&times;</span></div>
            ` : ''}
            ${(userFilters.depts.length > 0 || userFilters.years.length > 0 || userFilters.role) ? `
              <button class="btn btn-ghost btn-xs" onclick="Pages._clearAllUserFilters()" style="color:var(--danger); font-weight:700;">すべてクリア</button>
            ` : ''}
          </div>


          <div class="detail-card" style="padding:0; overflow:hidden;">
            <table class="admin-table">
              <thead>
                <tr>
                  <th onclick="Pages._toggleUserSort('name')" class="sort-header">ユーザー ${sortIcon('name')}</th>
                  <th onclick="Pages._toggleUserSort('department')" class="sort-header">部署 ${sortIcon('department')}</th>
                  <th onclick="Pages._toggleUserSort('year')" class="sort-header">回生 ${sortIcon('year')}</th>
                  <th>所属ロール</th>
                  <th style="text-align:right;">アクション</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(u => `
                  <tr>
                    <td>
                      <div style="display:flex; align-items:center; gap:12px">
                        ${C.avatar(u, 'sm')}
                        <div>
                          <div style="font-weight:600">${Utils.escapeHtml(u.name)}</div>
                          <div style="font-size:11px; color:var(--text-muted)">${Utils.escapeHtml(u.email)}</div>
                        </div>
                      </div>
                    </td>
                    <td><span class="badge" style="background:var(--secondary-light); color:var(--secondary);">${Utils.escapeHtml(u.department)}</span></td>
                    <td>${u.year || 1}回生</td>
                    <td>
                      <div style="display:flex; flex-wrap:wrap; gap:4px; align-items:center;">
                        ${(u.roles || []).map(rid => `
                          <div onclick="event.stopPropagation(); Pages._jumpToRole('${rid}')" style="cursor:pointer;">
                            ${Utils.roleBadge(rid, roleDefs)}
                          </div>
                        `).join('')}
                        <button class="btn btn-ghost btn-xs" onclick="Pages._manageUserRoles('${u.id}')" style="border:1px dashed var(--border); border-radius:12px; height:24px; width:24px; padding:0; display:flex; align-items:center; justify-content:center;">+</button>
                      </div>
                    </td>
                    <td style="text-align:right;">
                      <button class="btn btn-ghost btn-sm" onclick="Pages._impersonation('${u.id}')" title="このユーザーとして操作">代理ログイン</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${filtered.length === 0 ? '<div class="empty-state" style="padding:48px;">条件に一致するユーザーが見つかりません</div>' : ''}
          </div>
        `;
      }

      // 2. ロール・権限タブ (Discord風)
      function renderRoles() {
        if (!roleDefs || roleDefs.length === 0) return '<div class="empty-state">ロールが定義されていません</div>';
        const role = roleDefs.find(r => r.id === selectedRoleId) || roleDefs[0];
        const permissions = [
          { id: 'view_analytics', name: '分析ダッシュボードの閲覧', desc: 'チーム全体の統計データにアクセスできます' },
          { id: 'manage_users', name: 'ユーザー管理', desc: 'ユーザーの追加・削除・ロールの割り当てができます' },
          { id: 'manage_system', name: 'システム設定の変更', desc: 'ロール定義やルートプリセットを編集できます' },
          { id: 'create_app', name: '申請の作成', desc: '新しいチェック案件を作成できます' },
          { id: 'approve_app', name: '案件の承認', desc: '承認ステップを実行できます' }
        ];

        // そのロールを持つメンバー
        const roleMembers = users.filter(u => (u.roles || []).includes(role.id));

        return `
          <div class="settings-split-container" style="height:calc(100vh - 280px); min-height:500px; border:none; box-shadow:var(--shadow-lg);">
            <div class="settings-sidebar" style="background: rgba(249, 250, 251, 0.7); backdrop-filter: blur(12px); border-right: 1px solid var(--border-light); padding: 20px 12px;">
              <div style="padding:0 12px 16px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.1em; display:flex; align-items:center; gap:8px;">
                ${Icons.users} ロール
              </div>
              <div style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:4px;">
                ${roleDefs.map(r => `
                  <div class="settings-sidebar-item ${r.id === selectedRoleId ? 'active' : ''}" 
                       onclick="Pages._selectRole('${r.id}')"
                       style="${r.id === selectedRoleId ? `background:${r.color}; color:#fff; box-shadow: 0 4px 12px ${r.color}40;` : ''}">
                    <span style="display:flex; align-items:center; gap:10px;">
                      <span style="width:8px; height:8px; border-radius:50%; background:${r.id === selectedRoleId ? '#fff' : r.color};"></span>
                      <span style="font-weight:600;">${Utils.escapeHtml(r.name)}</span>
                    </span>
                    <span style="font-size:10px; opacity:0.7;">${users.filter(u=>(u.roles||[]).includes(r.id)).length}</span>
                  </div>
                `).join('')}
              </div>
              <button class="btn btn-ghost btn-sm" style="margin-top:12px; border:1px dashed var(--border); border-radius:10px; justify-content:center; width:100%;" onclick="Pages._editRoleDef()">
                ${Icons.plus} 新規追加
              </button>
            </div>
            
            <div class="settings-main" style="padding:40px;">
              ${!role ? '<div class="empty-state">ロールを選択してください</div>' : `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px;">
                  <div>
                    <h3 style="font-size:24px; font-weight:800; margin-bottom:4px; display:flex; align-items:center; gap:12px;">
                      ${Utils.escapeHtml(role.name)}
                      <span style="font-size:12px; font-weight:400; color:var(--text-muted); padding:2px 8px; background:var(--bg-alt); border-radius:4px;">ID: ${role.id}</span>
                    </h3>
                  </div>
                  <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="Pages._deleteRoleDef('${role.id}')">ロールを削除</button>
                </div>

                <!-- サブタブ: 設定 / メンバー -->
                <div class="tabs-container" style="margin-bottom:32px; border-bottom:1px solid var(--border-light);">
                  <div class="tabs" style="gap:24px;">
                    <button class="tab-sm ${roleSubTab==='settings'?'active':''}" onclick="Pages._switchRoleSubTab('settings')">基本設定・権限</button>
                    <button class="tab-sm ${roleSubTab==='members'?'active':''}" onclick="Pages._switchRoleSubTab('members')">所属メンバー (${roleMembers.length})</button>
                  </div>
                </div>

                <div class="role-subtab-content">
                  ${roleSubTab === 'settings' ? `
                    <div class="form-group" style="max-width:400px;">
                      <label class="form-label">表示名</label>
                      <input type="text" class="form-input" id="edit-role-name" value="${Utils.escapeHtml(role.name)}">
                    </div>

                    <div class="form-group">
                      <label class="form-label">テーマカラー</label>
                      <div style="display:flex; align-items:center; gap:16px;">
                        <input type="color" id="edit-role-color" value="${role.color}" style="width:40px; height:40px; border:none; padding:0; background:none; cursor:pointer;">
                        <input type="text" class="form-input" id="edit-role-color-text" value="${role.color}" style="max-width:120px; font-family:monospace; text-transform:uppercase;">
                        ${Utils.roleBadge(role.id, roleDefs)}
                      </div>
                    </div>

                    <div style="margin-top:40px;">
                      <h4 style="font-size:16px; font-weight:700; margin-bottom:20px;">権限設定</h4>
                      <div class="permission-grid">
                        ${permissions.map(p => `
                          <div class="permission-item" style="padding:16px; border:1px solid var(--border-light); border-radius:12px; background:var(--bg-white);">
                            <div style="flex:1;">
                              <div style="font-weight:700; font-size:14px; margin-bottom:4px;">${p.name}</div>
                              <div class="permission-desc" style="font-size:12px; color:var(--text-muted); line-height:1.4;">${p.desc}</div>
                            </div>
                            <label class="toggle">
                              <input type="checkbox" class="role-permission-check" data-perm="${p.id}" ${(role.permissions||[]).includes(p.id)?'checked':''}>
                              <span class="toggle-slider"></span>
                            </label>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  ` : `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                      <h4 style="font-size:16px; font-weight:700;">所属メンバー一覧</h4>
                      <button class="btn btn-outline btn-sm" onclick="Pages._showAddMemberToRoleModal('${role.id}')">+ メンバーを追加</button>
                    </div>
                    <div class="role-member-list">
                      ${roleMembers.map(m => `
                        <div class="member-mini-card">
                          ${C.avatar(m, 'sm')}
                          <div style="flex:1;">
                            <div style="font-weight:600; font-size:13px;">${Utils.escapeHtml(m.name)}</div>
                            <div style="font-size:11px; color:var(--text-muted);">${m.year || 1}回生 / ${(m.department || '').replace(/部$/, '')}</div>
                          </div>
                          <button onclick="Pages._removeUserRoleFromRoleTab('${m.id}', '${role.id}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:18px; line-height:1;">&times;</button>
                        </div>
                      `).join('')}
                    </div>
                    ${roleMembers.length === 0 ? '<div class="empty-state" style="padding:40px;">このロールを持つメンバーはいません</div>' : ''}
                  `}
                </div>

                ${roleSubTab === 'settings' ? `
                  <div style="margin-top:48px; padding-top:24px; border-top:1px solid var(--border-light); display:flex; justify-content:flex-end;">
                    <button class="btn btn-primary" onclick="Pages._saveRoleAdvanced()">変更を保存</button>
                  </div>
                ` : ''}
              `}
            </div>
          </div>
        `;
      }

      // 3. ルートプリセットタブ
      // 3. ルートプリセットタブ
      function renderRoutes() {
        return `
          <div class="section-header" style="margin-bottom:32px;">
            <div>
              <h3 class="section-title">ルートプリセット管理</h3>
              <p class="page-subtitle">承認ルートの雛形を作成・編集します</p>
            </div>
            <button class="btn btn-primary btn-sm" onclick="Pages._editTemplateVisual()">+ 新規ルート作成</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 24px;">
            ${templates.map(t => `
              <div class="template-card" style="display:flex; flex-direction:column; background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:24px; box-shadow:var(--shadow-sm);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
                  <div>
                    <h4 style="font-size:16px; font-weight:700; margin-bottom:4px;">${Utils.escapeHtml(t.name)}</h4>
                    <p style="font-size:13px; color:var(--text-muted);">${Utils.escapeHtml(t.description || '説明なし')}</p>
                  </div>
                  <div style="display:flex; gap:8px;">
                    <button class="btn btn-outline btn-sm" onclick="Pages._editTemplateVisual('${t.id}')">編集</button>
                    <button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="Pages._deleteTemplate('${t.id}')">削除</button>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:16px; overflow-x:auto; padding-bottom:8px;">
                  ${t.steps.map((s, i) => {
                    // ロール情報の取得（色やバッジ用）
                    const firstRole = s.roles && s.roles.length > 0 ? roleDefs.find(r => r.id === s.roles[0]) : null;
                    const roleColor = firstRole ? firstRole.color : 'var(--primary)';
                    const fallbackRole = '<span class="badge" style="background:var(--bg-alt); color:var(--text-muted); border:1px dashed var(--border);">指定なし</span>';

                    const roleHtml = (s.roles && s.roles.length > 0) 
                      ? s.roles.map(rid => Utils.roleBadge(rid, roleDefs)).join('') 
                      : fallbackRole;
                    
                    const userHtmls = (s.userIds || []).map(uid => {
                      const u = users.find(x => x.id === uid);
                      if (!u) return '';
                      return `
                        <div class="step-user-item">
                          ${Components.avatar(u, 'xs')}
                          <span class="step-user-name">${Utils.escapeHtml(u.name)}</span>
                        </div>
                      `;
                    }).join('');

                    return `
                      <div style="display:flex; align-items:center; gap:8px;">
                        <div class="step-node step-box-clickable" onclick="Pages._editTemplateVisual('${t.id}')" style="width: auto; min-width: 170px; pointer-events: auto;">
                          <div class="step-node-card" style="border-top-color: ${roleColor}; pointer-events: none;">
                            <div class="step-header">
                              <span style="font-size:11px; font-weight:700; color:${roleColor};">STEP ${i+1}</span>
                            </div>
                            <div class="step-content" style="padding: 0 16px 16px 16px;">
                              <div style="font-size:14px; font-weight:700; margin-bottom:8px;">${Utils.escapeHtml(s.name)}</div>
                              <div>${roleHtml}</div>
                              ${userHtmls ? `<div style="display:flex; flex-direction:column; gap:2px; margin-top:8px;">${userHtmls}</div>` : ''}
                            </div>
                          </div>
                        </div>
                        ${i < t.steps.length - 1 ? `<div class="step-arrow-connector"></div>` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>
          ${templates.length === 0 ? '<div class="empty-state" style="padding:100px;">ルートプリセットが登録されていません</div>' : ''}
        `;
      }

      // 3-2. 仕様書プリセット管理タブ
      function renderPresets() {
        const presets = MockData.taskPresets;
        return `
          <div class="section-header" style="margin-bottom:32px;">
            <div>
              <h3 class="section-title">仕様書セット管理</h3>
              <p class="page-subtitle">依頼作成時のデフォルト入力内容（プリセット）を定義します</p>
            </div>
            <button class="btn btn-primary btn-sm" onclick="Pages._editPresetVisual()">+ 新規プリセット作成</button>
          </div>

          <div class="preset-manager-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:20px;">
            ${presets.map(p => `
              <div class="detail-card fade-in-up" style="display:flex; flex-direction:column; justify-content:space-between; height:180px;">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                    <h4 style="font-size:16px; font-weight:700;">${Utils.escapeHtml(p.name)}</h4>
                    <span class="badge" style="background:var(--bg-alt); color:var(--text-muted);">${p.specifications.projectInfo.mediaType === 'print' ? '印刷物' : 'ウェブ'}</span>
                  </div>
                  <p style="font-size:12px; color:var(--text-muted); line-height:1.4;">
                    サイズ: ${p.specifications.projectInfo.size}<br>
                    デフォルトフォント: ${p.specifications.designInfo.fonts.title.name}
                  </p>
                </div>
                <div style="display:flex; gap:8px; margin-top:20px; border-top:1px solid var(--border-light); padding-top:12px;">
                  <button class="btn btn-outline btn-block btn-sm" onclick="Pages._editPresetVisual('${p.id}')">編集</button>
                  <button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="Pages._deletePreset('${p.id}')">${Icons.trash || '削除'}</button>
                </div>
              </div>
            `).join('')}
            ${presets.length === 0 ? '<div class="empty-state" style="grid-column: 1/-1; padding:60px;">登録されたプリセットはありません</div>' : ''}
          </div>
        `;
      }
      // 4. マスタタグ管理タブ (GUI版)
      function renderTags() {
        return `
          <div class="section-header" style="margin-bottom:32px;">
            <div>
              <h3 class="section-title">マスタタグ管理</h3>
              <p class="page-subtitle">申請案件を分類するための共通ラベルを管理します</p>
            </div>
            <button class="btn btn-primary btn-sm" onclick="Pages._showAddTagModal()">+ 新規タグ追加</button>
          </div>

          <div class="tag-manager-grid">
            ${tagDefs.map(t => `
              <div class="tag-card">
                <div class="tag-card-header">
                  <div class="tag-preview-large" style="background:${t.color}15; color:${t.color}; border:1px solid ${t.color}30;">
                    # ${Utils.escapeHtml(t.name)}
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                  <div style="flex:1;">
                    <div class="filter-label">カラー調整</div>
                    <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
                      <input type="color" value="${t.color}" onchange="Pages._updateTagColor('${t.name}', this.value)" style="width:32px; height:32px; border:none; padding:0; background:none; cursor:pointer;">
                      <span style="font-size:12px; font-family:monospace; color:var(--text-muted);">${t.color.toUpperCase()}</span>
                    </div>
                  </div>
                  <button class="btn btn-ghost btn-sm" style="color:var(--danger); padding:8px;" onclick="Pages._deleteMasterTagVisual('${t.name}')" title="削除">
                    <span style="font-size:18px;">&times;</span>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
          ${tagDefs.length === 0 ? '<div class="empty-state" style="padding:100px;">マスタタグが登録されていません</div>' : ''}
        `;
      }

      // ─── イベント/ロジック (統合スイート用) ─────────────────
      Pages._switchAdminSuiteTab = (tab) => { activeTab = tab; render(); };
      Pages._switchRoleSubTab = (sub) => { roleSubTab = sub; render(); };
      Pages._selectRole = (id) => { selectedRoleId = id; roleSubTab = 'settings'; render(); };
      Pages._jumpToRole = (rid) => { activeTab = 'roles'; selectedRoleId = rid; roleSubTab = 'members'; render(); };
      
      // ユーザー一覧用ロジック
      Pages._updateUserFilter = (key, val) => { userFilters[key] = val; render(); };
      Pages._toggleMultiFilter = (key, val) => {
        val = String(val);
        const idx = userFilters[key].indexOf(val);
        if (idx > -1) userFilters[key].splice(idx, 1);
        else userFilters[key].push(val);
        render();
      };
      Pages._toggleUserSort = (key) => {
        if (userSort.key === key) { userSort.order = userSort.order === 'asc' ? 'desc' : 'asc'; } 
        else { userSort.key = key; userSort.order = 'asc'; }
        render();
      };
      Pages._clearAllUserFilters = () => {
        userFilters = { search: '', depts: [], years: [], role: '' };
        render();
      };

      Pages._manageUserRoles = (userId) => {
        const user = users.find(u => u.id === userId);
        const modal = `
          <div class="modal-header"><h3>ロール管理: ${Utils.escapeHtml(user.name)}</h3></div>
          <div class="modal-body">
            <div style="margin-bottom:20px;">
              <div class="filter-label" style="margin-bottom:12px;">割り当て済みロール</div>
                ${(user.roles || []).map(rid => `
                  <div style="position:relative; display:inline-block; margin-right:8px; margin-bottom:8px;">
                    ${Utils.roleBadge(rid, roleDefs)}
                    <span onclick="Pages._removeUserRoleFromModal('${userId}', '${rid}')" style="position:absolute; -top:5px; -right:5px; background:var(--bg-white); border:1px solid var(--border); border-radius:50%; width:16px; height:16px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:12px; box-shadow:var(--shadow-sm); z-index:1;">&times;</span>
                  </div>
                `).join('')}
                ${(user.roles || []).length === 0 ? '<p style="font-size:13px; color:var(--text-muted);">割り当てなし</p>' : ''}
              </div>
            </div>
            <div class="filter-label" style="margin-bottom:12px;">ロールを追加</div>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:10px;">
              ${roleDefs.filter(r => !(user.roles || []).includes(r.id)).map(r => `
                <div class="picker-item" onclick="Pages._addUserRoleFromModal('${userId}', '${r.id}')" style="cursor:pointer; display:flex; align-items:center; gap:8px; padding:10px 14px; border:1px solid var(--border-light); border-radius:8px; transition:all 0.2s;">
                  <span style="width:8px; height:8px; border-radius:50%; background:${r.color};"></span>
                  <span style="font-size:13px; font-weight:600;">${Utils.escapeHtml(r.name)}</span>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="modal-footer"><button class="btn btn-primary" onclick="Utils.closeModal()">完了</button></div>
        `;
        Utils.showModal(modal);
      };

      Pages._addUserRoleFromModal = async (uid, rid) => {
        const u = users.find(x => x.id === uid);
        if (u && !u.roles.includes(rid)) {
          u.roles = [...u.roles, rid];
          await API.updateUserRole(uid, u.roles);
          render();
          Pages._manageUserRoles(uid); // モーダル再表示
        }
      };
      Pages._removeUserRoleFromModal = async (uid, rid) => {
        const u = users.find(x => x.id === uid);
        if (u) {
          u.roles = u.roles.filter(r => r !== rid);
          await API.updateUserRole(uid, u.roles);
          render();
          Pages._manageUserRoles(uid); // モーダル再表示
        }
      };

      Pages._impersonation = (id) => {
        if (confirm(`${users.find(u=>u.id===id).name} としてログインしますか？`)) {
          API.impersonate(id);
        }
      };

      // ロールタブ用ロジック
      Pages._removeUserRoleFromRoleTab = async (uid, rid) => {
        const u = users.find(x => x.id === uid);
        if (u) {
          u.roles = u.roles.filter(r => r !== rid);
          await API.updateUserRole(uid, u.roles);
          render();
        }
      };

      Pages._showAddMemberToRoleModal = (roleId) => {
        const role = roleDefs.find(rd => rd.id === roleId);
        const nonMembers = users.filter(u => !(u.roles || []).includes(roleId));
        const modal = `
          <div class="modal-header"><h3>${role.name} にメンバーを追加</h3></div>
          <div class="modal-body">
            <div style="max-height:400px; overflow-y:auto; display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:4px;">
              ${nonMembers.map(u => `
                <div class="member-mini-card" style="cursor:pointer;" onclick="Pages._addUserToRoleFinal('${u.id}', '${roleId}')">
                  ${C.avatar(u, 'sm')}
                  <div style="flex:1;">
                    <div style="font-weight:600; font-size:13px;">${Utils.escapeHtml(u.name)}</div>
                    <div style="font-size:11px; color:var(--text-muted);">${u.year || 1}回生 / ${(u.department || '').replace(/部$/, '')}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        Utils.showModal(modal);
      };

      Pages._addUserToRoleFinal = async (uid, rid) => {
        const u = users.find(x => x.id === uid);
        if (u && !u.roles.includes(rid)) {
          u.roles = [...u.roles, rid];
          await API.updateUserRole(uid, u.roles);
          Utils.closeModal();
          render();
        }
      };

      // タグタブ用ロジック
      Pages._showAddTagModal = () => {
        const modal = `
          <div class="modal-header"><h3>新規マスタタグ追加</h3></div>
          <div class="modal-body">
            <div class="form-group"><label class="form-label">タグ名</label><input type="text" id="new-tag-name-m" class="form-input" placeholder="例: 重要案件"></div>
            <div class="form-group"><label class="form-label">カラー</label><input type="color" id="new-tag-color-m" value="#6366F1"></div>
          </div>
          <div class="modal-footer" style="padding-top:16px; display:flex; justify-content:flex-end; gap:8px;">
            <button class="btn btn-ghost" onclick="Utils.closeModal()">キャンセル</button>
            <button class="btn btn-primary" onclick="Pages._addMasterTagVisualFinal()">タグを作成</button>
          </div>
        `;
        Utils.showModal(modal);
      };

      Pages._addMasterTagVisualFinal = async () => {
        const name = document.getElementById('new-tag-name-m').value.trim();
        const color = document.getElementById('new-tag-color-m').value;
        if (name) {
          tagDefs.push({ name, color });
          await API.updateTagDefinitions(tagDefs);
          Utils.closeModal();
          render();
        }
      };

      Pages._updateTagColor = async (tagName, color) => {
        const tag = tagDefs.find(t => t.name === tagName);
        if (tag) {
          tag.color = color;
          await API.updateTagDefinitions(tagDefs);
          render();
        }
      };

      Pages._deleteMasterTagVisual = async (name) => {
        if (confirm(`タグ「${name}」を削除しますか？`)) {
          tagDefs = tagDefs.filter(t => t.name !== name);
          await API.updateTagDefinitions(tagDefs);
          render();
        }
      };

      // 共通イベント/イベント
      Pages._switchSettingTab = (tab) => { activeTab = tab; render(); }; // 互換性維持
      Pages._selectRole = (id) => { selectedRoleId = id; roleSubTab = 'settings'; render(); };

      Pages._saveRoleAdvanced = async () => {
        const name = document.getElementById('edit-role-name').value.trim();
        const color = document.getElementById('edit-role-color').value;
        const perms = Array.from(document.querySelectorAll('.role-permission-check:checked')).map(el => el.dataset.perm);
        const idx = roleDefs.findIndex(r => r.id === selectedRoleId);
        roleDefs[idx] = { ...roleDefs[idx], name, color, permissions: perms };
        await API.updateRoleDefinitions(roleDefs);
        Utils.showToast(`${name} ロールを更新しました`, 'success');
        render();
      };

      Pages._editRoleDef = () => {
        const modal = `
          <div class="modal-header"><h3>ロール新規作成</h3></div>
          <div class="modal-body">
            <div class="form-group"><label class="form-label">ロール名</label><input type="text" id="new-role-name" class="form-input" placeholder="例: 広報部署"></div>
            <div class="form-group"><label class="form-label">ロールID</label><input type="text" id="new-role-id" class="form-input" placeholder="例: kouhou_dept"></div>
          </div>
          <div class="modal-footer" style="padding-top:16px; display:flex; justify-content:flex-end; gap:8px;">
            <button class="btn btn-ghost" onclick="Utils.closeModal()">キャンセル</button>
            <button class="btn btn-primary" onclick="Pages._createRoleFinal()">作成</button>
          </div>
        `;
        Utils.showModal(modal);
      };

      Pages._createRoleFinal = async () => {
        const name = document.getElementById('new-role-name').value.trim();
        const id = document.getElementById('new-role-id').value.trim();
        if (!name || !id) return alert('名称とIDを入力してください');
        if (roleDefs.find(r=>r.id===id)) return alert('そのIDは既に使用されています');
        roleDefs.push({ id, name, color: '#6366F1', permissions: [] });
        await API.updateRoleDefinitions(roleDefs);
        selectedRoleId = id;
        Utils.closeModal();
        render();
      };

      Pages._deleteRoleDef = async (id) => {
        if (!confirm('このロールを削除しますか？')) return;
        roleDefs = roleDefs.filter(r => r.id !== id);
        await API.updateRoleDefinitions(roleDefs);
        selectedRoleId = roleDefs.length > 0 ? roleDefs[0].id : null;
        render();
      };

      Pages._editTemplateVisual = (tid) => {
        const isNew = !tid;
        const tpl = isNew 
          ? { id: Utils.generateId(), name: '', description: '', steps: [{ name: '一次チェック', roles: ['creator'], userIds: [], type: 'serial' }] }
          : JSON.parse(JSON.stringify(templates.find(t => t.id === tid)));
        
        if (isNew) {
          const creatorUsers = users.filter(u => u.roles.includes('creator')).map(u => u.id);
          tpl.steps[0].userIds = creatorUsers;
        }

        const renderModal = () => {
          const content = `
            <div class="modal-header"><h3>承認ルート・エディタ</h3></div>
            <div class="modal-body" style="max-height:80vh; overflow-y:auto; padding:40px;">
              <div class="settings-grid" style="grid-template-columns: 250px 1fr; gap:40px; margin-bottom:48px;">
                <div class="form-group"><label class="form-label">ルート名</label><input type="text" id="tpl-name-v" class="form-input" value="${Utils.escapeHtml(tpl.name)}" placeholder="例: 広報物チェック（標準）"></div>
                <div class="form-group"><label class="form-label">説明</label><input type="text" id="tpl-desc-v" class="form-input" value="${Utils.escapeHtml(tpl.description || '')}" placeholder="このルートの用途について"></div>
              </div>

              <div class="visual-workflow-editor" id="workflow-visual-area" style="display: flex; align-items: flex-start; gap: 24px; padding: 20px 0; overflow-x: auto; flex-wrap: nowrap; min-height: 250px;">
                ${tpl.steps.map((s, i) => {
                  const currentRoles = s.roles.map(rid => roleDefs.find(r => r.id === rid)).filter(Boolean);
                  const roleColor = currentRoles.length > 0 ? currentRoles[0].color : 'var(--border)';
                  
                  return `
                    <div class="step-node">
                      <div class="step-node-card" style="border-top-color: ${roleColor};">
                        <div class="step-header">
                          <span style="font-size:11px; font-weight:700; color:${roleColor};">STEP ${i+1}</span>
                          <button class="btn btn-ghost btn-xs" onclick="Pages._removeTplStepVisual(${i})" style="padding:0; min-width:20px; color:var(--danger)">&times;</button>
                        </div>
                        <div class="step-content">
                          <div class="form-group" style="margin-bottom:12px;">
                            <input type="text" class="form-input form-input-sm" style="border:none; padding:4px 0; font-weight:700; font-size:14px; background:transparent;" value="${Utils.escapeHtml(s.name)}" onchange="window._tplV.steps[${i}].name=this.value" placeholder="ステップ名">
                          </div>
                          <div class="step-role-section" style="margin-bottom:12px;">
                            <div class="step-section-title">担当ロール (複数可)</div>
                            <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px;">
                              ${(s.roles || []).map(rid => `
                                <div class="badge" style="background:var(--bg-alt); color:var(--text-secondary); border:1px solid var(--border-light); font-size:10px; display:flex; align-items:center; gap:4px; padding:2px 6px;">
                                  ${roleDefs.find(r=>r.id===rid)?.name || rid}
                                  <span onclick="Pages._removeNodeTarget(${i}, 'role', '${rid}')" style="cursor:pointer; font-weight:700;">&times;</span>
                                </div>
                              `).join('')}
                              ${(s.roles || []).length === 0 ? '<span style="font-size:10px; color:var(--text-muted);">未設定</span>' : ''}
                            </div>
                            <select class="form-select form-select-sm" onchange="Pages._onRoleChange(${i}, this.value)">
                              <option value="">ロールを追加...</option>
                              ${roleDefs.filter(r => !s.roles.includes(r.id)).map(r => `<option value="${r.id}">${Utils.escapeHtml(r.name)}</option>`).join('')}
                            </select>
                          </div>
                          <div class="step-members-section">
                            <div class="step-section-title">指名メンバー</div>
                            <div class="participant-list" style="flex-wrap:wrap; gap:6px;">
                              ${(s.userIds || []).map(uid => {
                                const u = users.find(x=>x.id===uid);
                                return u ? `
                                  <div class="participant-item" title="${u.name}">
                                    <div class="participant-badge" style="background:var(--primary-light); color:var(--primary); font-size:10px;">${Utils.getInitials(u.name)}</div>
                                    <button onclick="Pages._removeNodeTarget(${i}, 'user', '${uid}')" style="position:absolute; top:-4px; right:-4px; width:14px; height:14px; background:var(--danger); color:#fff; border:none; border-radius:50%; font-size:8px; display:flex; align-items:center; justify-content:center; cursor:pointer;">&times;</button>
                                  </div>
                                ` : '';
                              }).join('')}
                              <div class="participant-add-bubble" onclick="Pages._showMemberPickerOnly(${i})">+</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    ${i < tpl.steps.length - 1 ? '<div class="step-node-connector"></div>' : ''}
                  `;
                }).join('')}
                <div class="step-add-node-btn" onclick="Pages._addTplStepVisual()" style="margin-left:20px;">+</div>
              </div>
            </div>
            <div class="modal-footer" style="padding:16px 32px; border-top:1px solid var(--border); display:flex; justify-content:flex-end; gap:8px;">
              <button class="btn btn-ghost" onclick="Utils.closeModal()">キャンセル</button>
              <button class="btn btn-primary" onclick="Pages._saveTemplateFinalVisual()">プリセットを保存</button>
            </div>
          `;
          Utils.showModal(content, { size: 'modal-xl' });
        };
        
        window._tplV = tpl;
        Pages._tplV_render = renderModal;

        Pages._onRoleChange = (idx, roleId) => {
          if (!roleId) return;
          const step = window._tplV.steps[idx];
          if (!step.roles.includes(roleId)) {
            step.roles.push(roleId);
            // そのロールを持つユーザーを自動配置（追加）
            const autoUsers = users.filter(u => u.roles.includes(roleId)).map(u => u.id);
            const newUsers = autoUsers.filter(uid => !step.userIds.includes(uid));
            step.userIds = [...step.userIds, ...newUsers];
            Utils.showToast(`${roleId} ロールのメンバーを追加しました`, 'info');
          }
          renderModal();
        };
        Pages._addTplStepVisual = () => { window._tplV.steps.push({ name: '新規承認', roles: [], userIds: [], type: 'serial' }); renderModal(); };
        Pages._removeTplStepVisual = (i) => { if(window._tplV.steps.length > 1) { window._tplV.steps.splice(i, 1); renderModal(); } };
        Pages._removeNodeTarget = (sIdx, type, id) => {
          if (type === 'role') window._tplV.steps[sIdx].roles = window._tplV.steps[sIdx].roles.filter(r=>r!==id);
          else window._tplV.steps[sIdx].userIds = window._tplV.steps[sIdx].userIds.filter(u=>u!==id);
          renderModal();
        };
        Pages._showMemberPickerOnly = (sIdx) => {
          const step = window._tplV.steps[sIdx];
          let searchQuery = '';

          const initialContent = `
            <div class="modal-content" style="width: 840px; max-width: 95vw;">
              <div class="modal-header"><h3>メンバーの追加</h3></div>
              <div class="modal-body" style="padding: 24px; display: grid; grid-template-columns: 1fr 300px; gap: 24px;">
                <div class="picker-main">
                  <div class="picker-search-container" style="margin-bottom: 20px;">
                    <input type="text" class="picker-search-input" id="member-search-v" placeholder="名前または部署で検索..." style="width:100%; padding:12px; border:1px solid var(--border); border-radius:8px;">
                  </div>
                  <div id="picker-results-list" style="max-height:450px; overflow-y:auto; padding-right:8px;"></div>
                </div>
                <div class="picker-stats-panel" id="user-stats-panel" style="background:var(--bg-alt); padding:24px; border-radius:12px; border:1px solid var(--border-light); min-height:450px; position:sticky; top:0;">
                  <div style="text-align:center; color:var(--text-muted); padding-top:100px;">
                    <div style="font-size:32px; margin-bottom:16px; opacity:0.5;">👤</div>
                    リストのメンバーに<br>カーソルを合わせてください
                  </div>
                </div>
              </div>
              <div class="modal-footer" style="padding:16px 32px; border-top:1px solid var(--border); display:flex; justify-content:flex-end;">
                <button class="btn btn-ghost" onclick="Pages._tplV_render()">キャンセル</button>
              </div>
            </div>
          `;
          document.getElementById('modal-container').innerHTML = initialContent;

          const resultsList = document.getElementById('picker-results-list');
          const searchInput = document.getElementById('member-search-v');
          const statsPanel = document.getElementById('user-stats-panel');

          const updateResults = () => {
            const query = searchQuery.toLowerCase().trim();
            const filteredUsers = users.filter(u => 
              u.name.toLowerCase().includes(query) || 
              (u.department && u.department.toLowerCase().includes(query))
            );

            const suggested = filteredUsers.filter(u => step.roles.some(rid => u.roles.includes(rid)));
            const others = filteredUsers.filter(u => !suggested.includes(u));

            const renderItem = (u, isSuggested) => `
              <div class="picker-item ${isSuggested?'suggested-item':''}" 
                   onclick="Pages._addMemberFinal(${sIdx}, '${u.id}')" 
                   onmouseenter="Pages._showUserStatsInPanel('${u.id}')"
                   style="cursor:pointer; padding:12px; border:1px solid var(--border-light); border-radius:8px; display:flex; align-items:center; gap:12px; margin-bottom:8px; transition:all 0.2s; background:#fff;">
                ${C.avatar(u, 'sm')}
                <div style="flex:1;">
                  <div style="font-size:14px; font-weight:700;">${Utils.escapeHtml(u.name)}</div>
                  <div style="font-size:11px; color:var(--text-muted);">${u.department} / ${u.year}回生</div>
                </div>
                ${isSuggested ? '<span style="font-size:10px; color:var(--primary); font-weight:700; background:var(--primary-light); padding:2px 6px; border-radius:4px;">推奨</span>' : ''}
              </div>
            `;

            resultsList.innerHTML = `
              <div class="realtime-list-update">
                ${suggested.length > 0 ? `
                  <div class="filter-label" style="margin-bottom:12px;">推奨メンバー (ステップ対象ロール保持者)</div>
                  ${suggested.map(u => renderItem(u, true)).join('')}
                ` : ''}
                <div class="filter-label" style="margin-top:24px; margin-bottom:12px;">すべてのメンバー</div>
                ${others.map(u => renderItem(u, false)).join('')}
                ${filteredUsers.length === 0 ? '<div class="empty-state" style="padding: 40px;">該当するメンバーが見つかりません</div>' : ''}
              </div>
            `;
          };

          Pages._showUserStatsInPanel = (uid) => {
            const u = users.find(x => x.id === uid);
            if (!u) return;
            statsPanel.innerHTML = `
              <div class="fade-in">
                <div style="display:flex; flex-direction:column; align-items:center; gap:12px; margin-bottom:20px;">
                  ${C.avatar(u, 'lg')}
                  <div style="text-align:center;">
                    <div style="font-size:18px; font-weight:800;">${Utils.escapeHtml(u.name)}</div>
                    <div style="font-size:12px; color:var(--text-muted);">${u.department} / ${u.year}回生</div>
                  </div>
                </div>
                <div style="display:flex; flex-direction:column; gap:20px;">
                  <div>
                    <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px; text-transform:uppercase;">保有ロール</div>
                    <div style="display:flex; flex-wrap:wrap; gap:4px;">${u.roles.map(rid => Utils.roleBadge(rid, roleDefs)).join('')}</div>
                  </div>
                  <div style="background:#fff; border-radius:12px; padding:16px; border:1px solid var(--border-light); box-shadow:var(--shadow-sm);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:12px; font-weight:700;">審査遅延率</span>
                        <span style="font-size:16px; font-weight:800; color:${u.delayRate > 10 ? 'var(--danger)' : 'var(--success)'}">${u.delayRate}%</span>
                    </div>
                    <div class="progress-bar" style="height:8px; margin-top:10px;"><div class="progress-fill" style="width:${u.delayRate}%; background:${u.delayRate > 10 ? 'var(--danger)' : 'var(--success)'}"></div></div>
                  </div>
                  <div>
                    <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px; text-transform:uppercase;">最近の担当案件</div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                      ${(u.recentWorks || []).map(work => `<div style="background:#fff; border:1px solid var(--border-light); border-radius:8px; padding:10px; font-size:12px; box-shadow:0 1px 2px rgba(0,0,0,0.02); line-height:1.4;">${Utils.escapeHtml(work)}</div>`).join('') || '<div style="font-size:11px; color:var(--text-muted); font-style:italic;">実績なし</div>'}
                    </div>
                  </div>
                </div>
              </div>
            `;
          };

          searchInput.addEventListener('input', (e) => { searchQuery = e.target.value; updateResults(); });
          updateResults();
          searchInput.focus();

          Pages._addMemberFinal = (idx, uid) => {
            if (!window._tplV.steps[idx].userIds.includes(uid)) { window._tplV.steps[idx].userIds.push(uid); }
            Pages._tplV_render();
          };
        };

        Pages._saveTemplateFinalVisual = async () => {
          window._tplV.name = document.getElementById('tpl-name-v').value.trim();
          window._tplV.description = document.getElementById('tpl-desc-v').value.trim();
          if (!window._tplV.name) return alert('名称を入力してください');
          if (isNew) templates.push(window._tplV);
          else { const idx = templates.findIndex(t => t.id === tid); templates[idx] = window._tplV; }
          await API.updateWorkflowTemplates(templates);
          Utils.closeModal();
          render();
        };
        renderModal();
      };

      // 3-3. 仕様書プリセット・エディタの実装
      Pages._editPresetVisual = async (tid) => {
        const presets = await API.getTaskPresets();
        const isNew = !tid;
        const preset = isNew 
          ? { 
              id: Utils.generateId(), name: '', 
              specifications: { 
                projectInfo: { fields: [{ id: 'f1', label: '企画名', type: 'text', defaultValue: '' }] },
                designInfo: {
                  labels: { bg: '背景色', title: 'タイトル', text: '本文', main: '主要要素', glow: '強調', shadow: '影' },
                  cmyk: { bg: {c:0,m:0,y:0,k:0}, title: {c:0,m:0,y:0,k:100}, text: {c:0,m:0,y:0,k:80}, main: {c:100,m:0,y:0,k:0}, glow: {c:0,m:20,y:100,k:0}, shadow: {c:0,m:0,y:0,k:10} },
                  rgb: { bg: {r:255,g:255,b:255}, title: {r:0,g:0,b:0}, text: {r:50,g:50,b:50}, main: {r:0,g:174,b:239}, glow: {r:255,g:211,b:0}, shadow: {r:230,g:230,b:230} },
                  fonts: { main: {name:'Inter',link:''}, title: {name:'Inter',link:''}, text: {name:'Inter',link:''} }
                }
              }
            }
          : JSON.parse(JSON.stringify(presets.find(p => p.id === tid)));

        // 互換性対応: フィールド定義がない場合はデフォルト項目を追加
        if (!preset.specifications.projectInfo.fields) {
          preset.specifications.projectInfo.fields = [
            { id: 'name', label: '企画名', type: 'text', defaultValue: '' },
            { id: 'purpose', label: '開催目的', type: 'textarea', defaultValue: '' },
            { id: 'overview', label: '企画概要', type: 'textarea', defaultValue: '' },
            { id: 'date', label: '開催日時', type: 'text', defaultValue: '' },
            { id: 'location', label: '開催場所', type: 'text', defaultValue: '' },
            { id: 'todo', label: '作業依頼内容', type: 'textarea', defaultValue: '' }
          ];
        }
        // ラベルやCMYK/RGBが欠けている場合の補完
        if (!preset.specifications.designInfo.labels) {
          preset.specifications.designInfo.labels = { bg: '背景色', title: 'タイトル', text: '本文', main: '主要要素', glow: '強調', shadow: '影' };
        }
        if (!preset.specifications.designInfo.rgb) {
          preset.specifications.designInfo.rgb = { bg:{r:255,g:255,b:255}, title:{r:0,g:0,b:0}, text:{r:50,g:50,b:50}, main:{r:0,g:174,b:239}, glow:{r:255,g:211,b:0}, shadow:{r:230,g:230,b:230} };
        }
        if (!preset.specifications.designInfo.cmyk) {
          preset.specifications.designInfo.cmyk = { bg:{c:0,m:0,y:0,k:0}, title:{c:0,m:0,y:0,k:100}, text:{c:0,m:0,y:0,k:80}, main:{c:100,m:0,y:0,k:0}, glow:{c:0,m:20,y:100,k:0}, shadow:{c:0,m:0,y:0,k:10} };
        }

        window._presetV = preset;

        const renderModal = () => {
          const p = window._presetV;
          const content = `
            <div class="modal-header"><h3>仕様書セット・エディタ</h3></div>
            <div class="modal-body" style="max-height:85vh; overflow-y:auto; padding:32px;">
              <div class="settings-grid" style="grid-template-columns: 1fr 1fr; gap:32px; margin-bottom:32px;">
                <div class="form-group">
                  <label class="form-label">セット名称</label>
                  <input type="text" id="preset-name-v" class="form-input" value="${Utils.escapeHtml(p.name)}" placeholder="例: ポスター制作（高難度）">
                </div>
                <div class="form-group">
                  <label class="form-label">メディア種別</label>
                  <select id="preset-media-v" class="form-select">
                    <option value="print" ${p.specifications.projectInfo.mediaType==='print'?'selected':''}>印刷物</option>
                    <option value="web" ${p.specifications.projectInfo.mediaType==='web'?'selected':''}>ウェブ / SNS</option>
                  </select>
                </div>
              </div>

              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:32px;">
                <!-- 1. 項目定義 -->
                <div class="detail-card" style="margin:0;">
                  <h4 class="section-title">1. 入力項目（企画情報）の定義</h4>
                  <div class="preset-fields-list" style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
                    ${p.specifications.projectInfo.fields.map((f, i) => `
                      <div class="preset-field-item" style="display:flex; gap:8px; align-items:center; background:var(--bg-alt); padding:12px; border-radius:8px;">
                        <div style="flex:1;">
                          <input type="text" class="form-input form-input-sm" value="${Utils.escapeHtml(f.label)}" placeholder="項目名" onchange="window._presetV.specifications.projectInfo.fields[${i}].label = this.value">
                        </div>
                        <div style="width:120px;">
                          <select class="form-select form-select-sm" onchange="window._presetV.specifications.projectInfo.fields[${i}].type = this.value">
                            <option value="text" ${f.type==='text'?'selected':''}>テキスト</option>
                            <option value="textarea" ${f.type==='textarea'?'selected':''}>複数行</option>
                            <option value="url" ${f.type==='url'?'selected':''}>URL</option>
                            <option value="date" ${f.type==='date'?'selected':''}>日付</option>
                            <option value="datetime-local" ${f.type==='datetime-local'?'selected':''}>日時</option>
                            <option value="number" ${f.type==='number'?'selected':''}>数値</option>
                          </select>
                        </div>
                        <button class="btn btn-ghost btn-sm" style="color:var(--danger); padding:4px;" onclick="Pages._removePresetField(${i})">&times;</button>
                      </div>
                    `).join('')}
                  </div>
                  <button class="btn btn-outline btn-sm btn-block" onclick="Pages._addPresetField()">+ 項目を追加</button>
                </div>

                <!-- 2. ビジュアル初期値 -->
                <div class="detail-card" style="margin:0;">
                  <h4 class="section-title">2. デザイン・カラー初期値</h4>
                  <div style="display:flex; flex-direction:column; gap:12px;">
                    ${Object.keys(p.specifications.designInfo.labels).map(key => {
                      const label = p.specifications.designInfo.labels[key];
                      const rgb = p.specifications.designInfo.rgb[key];
                      const hex = Utils.colorRgbToHex(rgb.r, rgb.g, rgb.b);
                      return `
                        <div style="display:flex; align-items:center; gap:12px; padding:8px; border-bottom:1px solid var(--border-light);">
                          <div style="width:100px; font-size:12px; font-weight:700;">${Utils.escapeHtml(label)}</div>
                          <input type="color" value="${hex}" onchange="Pages._onPresetColorChange('${key}', this.value)" style="width:32px; height:32px; border:none; padding:0; background:none; cursor:pointer;">
                          <div style="font-size:11px; font-family:monospace; color:var(--text-muted); flex:1;">${hex.toUpperCase()}</div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                  <div style="margin-top:20px;">
                    <h5 style="font-size:12px; font-weight:700; color:var(--text-muted); margin-bottom:8px;">デフォルトフォント</h5>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                      <input type="text" class="form-input form-input-sm" value="${p.specifications.designInfo.fonts.title.name}" placeholder="タイトル用" onchange="window._presetV.specifications.designInfo.fonts.title.name = this.value">
                      <input type="text" class="form-input form-input-sm" value="${p.specifications.designInfo.fonts.main.name}" placeholder="本文用" onchange="window._presetV.specifications.designInfo.fonts.main.name = this.value">
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer" style="padding:16px 32px; border-top:1px solid var(--border); display:flex; justify-content:flex-end; gap:8px;">
               <button class="btn btn-ghost" onclick="Utils.closeModal()">キャンセル</button>
               <button class="btn btn-primary" onclick="Pages._savePresetFinal()">セットを保存</button>
            </div>
          `;
          Utils.showModal(content, { size: 'modal-xl' });
        };

        Pages._addPresetField = () => {
          const newId = 'field_' + Math.random().toString(36).substr(2, 5);
          window._presetV.specifications.projectInfo.fields.push({ id: newId, label: '新規項目', type: 'text', defaultValue: '' });
          renderModal();
        };
        Pages._removePresetField = (i) => {
          window._presetV.specifications.projectInfo.fields.splice(i, 1);
          renderModal();
        };
        Pages._onPresetColorChange = (key, hex) => {
          const rgb = Utils.colorHexToRgb(hex);
          const cmyk = Utils.colorRgbToCmyk(rgb.r, rgb.g, rgb.b);
          window._presetV.specifications.designInfo.rgb[key] = rgb;
          window._presetV.specifications.designInfo.cmyk[key] = cmyk;
          renderModal();
        };

        Pages._savePresetFinal = async () => {
          const p = window._presetV;
          p.name = document.getElementById('preset-name-v').value.trim();
          p.specifications.projectInfo.mediaType = document.getElementById('preset-media-v').value;
          if (!p.name) return alert('セット名称を入力してください');

          const allPresets = await API.getTaskPresets();
          if (isNew) allPresets.push(p);
          else {
            const idx = allPresets.findIndex(x => x.id === tid);
            allPresets[idx] = p;
          }
          await API.updateTaskPresets(allPresets);
          Utils.closeModal();
          Utils.showToast(`${p.name} を保存しました`, 'success');
          render();
        };

        renderModal();
      };

      Pages._deletePreset = async (tid) => {
        if (!confirm('この仕様書セットを削除しますか？')) return;
        const presets = await API.getTaskPresets();
        const filtered = presets.filter(p => p.id !== tid);
        await API.updateTaskPresets(filtered);
        render();
      };

      render();
    };

    Pages.settings = (container) => { 
      const user = Auth.getCurrentUser();
      container.innerHTML = `
        <div class="page-header"><div><h2 class="page-title">アカウント設定</h2><p class="page-subtitle">個人のプロファイルと通知設定</p></div></div>
        <div class="settings-grid">
          <div class="detail-card">
            <h3 class="section-title" style="margin-bottom:20px;">プロファイル</h3>
            <div class="form-group"><label class="form-label">名前</label><input type="text" class="form-input" value="${Utils.escapeHtml(user.name)}" readonly></div>
            <div class="form-group"><label class="form-label">メールアドレス</label><input type="email" class="form-input" value="${Utils.escapeHtml(user.email)}" readonly></div>
            <div class="form-group"><label class="form-label">所属部署</label><input type="text" class="form-input" value="${Utils.escapeHtml(user.department)}" readonly></div>
          </div>
          <div class="detail-card">
            <h3 class="section-title" style="margin-bottom:20px;">通知設定</h3>
            <div class="setting-item"><div><h4>メール通知</h4><p style="font-size:12px; color:var(--text-muted);">新しい案件が届いた際にメールで知らせる</p></div><label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label></div>
            <div class="setting-item"><div><h4>ブラウザプッシュ通知</h4><p style="font-size:12px; color:var(--text-muted);">承認待機中に通知を表示する</p></div><label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label></div>
            <div style="margin-top:24px;"><button class="btn btn-primary" onclick="Utils.showToast('設定を保存しました', 'success')">設定を保存</button></div>
          </div>
        </div>
      `;
    };

    return Pages;
  } catch (error) {
    console.error('Pages Init Error:', error);
    window.PAGES_INIT_ERROR = error;
    return Pages;
  }
})();
