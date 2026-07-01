/* ========================================
   Components - UIコンポーネント
   ======================================== */
window.Components = (() => {
  const {Icons,escapeHtml,formatDate,getStatusInfo,getCategoryInfo,getRoleLabel,getDeadlineClass,getDeadlineLabel,getAvatarColor,getInitials,calcProgress} = Utils;

  // ─── アバター ─────────────────
  function avatar(user, size='md') {
    if (!user) return '<div class="avatar avatar-'+size+'">?</div>';
    const color = getAvatarColor(user.name);
    const initials = getInitials(user.name);
    return `<div class="avatar avatar-${size}" style="background:${color}" title="${escapeHtml(user.name)}">${initials}</div>`;
  }

  // ─── ステータスバッジ ─────────────────
  function statusBadge(status) {
    const info = getStatusInfo(status);
    return `<span class="badge ${info.cls}">${info.label}</span>`;
  }

  // ─── カテゴリバッジ ─────────────────
  function categoryBadge(category) {
    const info = getCategoryInfo(category);
    return `<span class="badge badge-category" style="--cat-color:${info.color}">${info.label}</span>`;
  }

  // ─── 期限バッジ ─────────────────
  function deadlineBadge(date) {
    const cls = getDeadlineClass(date);
    const label = getDeadlineLabel(date);
    if (!label) return '';
    return `<span class="badge ${cls}">${Icons.clock} ${label}</span>`;
  }

  // ─── 統計カード ─────────────────
  function statsCard(icon, label, value, color, trend='', onclick='') {
    return `<div class="stats-card" style="--stats-color:${color}; cursor:${onclick?'pointer':''}" ${onclick ? `onclick="${onclick}"` : ''}>
      <div class="stats-icon">${icon}</div>
      <div class="stats-body">
        <span class="stats-value">${value}</span>
        <span class="stats-label">${label}</span>
      </div>
      ${trend ? `<span class="stats-trend">${trend}</span>` : ''}
    </div>`;
  }

  // ─── 案件カード ─────────────────
  function applicationCard(app) {
    const isTask = !!app.assigneeId; 
    const isProduction = !!app.requesterId; // 制作依頼かどうかのより正確な判定
    const isCheck = !isProduction && app.currentStepIndex !== undefined; // 承認フローのチェックか

    const navigagePath = isTask ? `/tasks/${app.id}` : `/applications/${app.id}`;
    
    const creatorId = isProduction ? app.requesterId : app.creatorId;
    const creator = MockData.getUser(creatorId);
    
    const wf = isTask ? [{ name: '制作中', status: 'pending' }] : WorkflowEngine.buildWorkflowState(app);
    const progress = isTask ? (app.status === 'completed' ? 100 : 0) : calcProgress(app);
    const catInfo = getCategoryInfo(app.category);

    const tagsHtml = (app.tags || []).map(t => Utils.tagBadge(t)).join('');

    // 種別バッジ
    let typeBadge = '';
    if (isProduction) {
      typeBadge = `<span class="badge" style="background:var(--primary-light); color:var(--primary); font-weight:800; border:1px solid var(--primary-light); border-radius:4px; font-size:10px; padding:2px 6px;">制作</span>`;
    } else if (isCheck) {
      typeBadge = `<span class="badge" style="background:#FFF3E0; color:#E65100; font-weight:800; border:1px solid #FFE0B2; border-radius:4px; font-size:10px; padding:2px 6px;">チェック</span>`;
    }

    return `<div class="app-card" data-id="${app.id}" onclick="App.navigate('${navigagePath}')">
      <div class="app-card-header">
        <div style="display:flex; align-items:center; gap:6px;">
          <div class="app-card-cat" style="background:${catInfo.color}20;color:${catInfo.color}">${catInfo.label}</div>
          ${typeBadge}
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          ${app.isFestivalRelated ? '<div class="app-card-flag" title="大祭関係">🏮</div>' : ''}
          ${statusBadge(app.status)}
        </div>
      </div>
      <h3 class="app-card-title">${escapeHtml(app.title)}</h3>
      ${tagsHtml ? `<div class="app-card-tags" style="margin-bottom:8px; display:flex; flex-wrap:wrap; gap:4px;">${tagsHtml}</div>` : ''}
      <p class="app-card-desc">${escapeHtml(app.description || '').substring(0,60)}${(app.description || '').length>60?'...':''}</p>
      <div class="app-card-progress">
        <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
        <span class="progress-label">${progress}%</span>
      </div>
      <div class="app-card-meta">
        <div class="app-card-creator" title="${isProduction?'依頼主':'申請者'}">${avatar(creator,'xs')} <span>${creator?creator.name:'不明'}</span></div>
        ${deadlineBadge(app.deadline)}
      </div>
      <div class="app-card-flow">${miniFlow(wf, isTask ? 0 : app.currentStepIndex)}</div>
    </div>`;
  }

  // ─── ミニフロー図 ─────────────────
  function miniFlow(workflow, currentIdx) {
    return `<div class="mini-flow">${workflow.map((step, i) => {
      let cls = 'mini-step';
      if (step.status === 'approved') cls += ' step-done';
      else if (i === currentIdx) cls += ' step-current';
      else if (step.status === 'rejected') cls += ' step-rejected';
      const shortName = step.name.length > 6 ? step.name.substring(0,6)+'…' : step.name;
      return `<div class="${cls}" title="${step.name}">
        <div class="mini-dot">${step.status==='approved'?'✓':step.status==='rejected'?'✕':(i+1)}</div>
        <span class="mini-label">${shortName}</span>
      </div>${i < workflow.length-1 ? '<div class="mini-line'+(step.status==='approved'?' line-done':'')+'"></div>' : ''}`;
    }).join('')}</div>`;
  }

  // ─── 詳細フロー図（大きい版） ─────────────────
  function workflowDiagram(workflow, currentIdx) {
    return `<div class="workflow-diagram">${workflow.map((step, i) => {
      let cls = 'wf-step';
      if (step.status === 'approved') cls += ' wf-done';
      else if (i === currentIdx && step.status === 'rejected') cls += ' wf-rejected';
      else if (i === currentIdx) cls += ' wf-current';
      else cls += ' wf-future';

      const assigneeAvatars = (step.assignees||[]).map(a => {
        const isApproved = step.approvals.find(ap => ap.userId === a.id && ap.approved);
        const isRejected = step.approvals.find(ap => ap.userId === a.id && !ap.approved);
        let badge = '';
        if (isApproved) badge = '<span class="wf-user-badge wf-user-ok">✓</span>';
        else if (isRejected) badge = '<span class="wf-user-badge wf-user-ng">✕</span>';
        return `<div class="wf-user">${avatar(a,'sm')}${badge}<span class="wf-user-name">${a.name}</span></div>`;
      }).join('');

      const typeLabel = step.type === 'parallel' ? '（並列チェック）' : step.type === 'conditional' ? '（条件付き）' : '';

      return `<div class="${cls}">
        <div class="wf-step-header">
          <span class="wf-step-num">${i+1}</span>
          <span class="wf-step-name">${step.name}</span>
          <span class="wf-step-type">${typeLabel}</span>
        </div>
        <div class="wf-step-users">${assigneeAvatars}</div>
        ${step.deadline?`<div class="wf-step-deadline ${getDeadlineClass(step.deadline)}">期限: ${formatDate(step.deadline,'date')}</div>`:''}
      </div>${i<workflow.length-1?'<div class="wf-connector'+(step.status==='approved'?' wf-connector-done':'')+'"><div class="wf-connector-line"></div><div class="wf-connector-arrow">→</div></div>':''}`;
    }).join('')}</div>`;
  }

  // ─── アクティビティタイムライン（コメント＋履歴） ─────────────────
  function commentThread(app, comments) {
    const events = [
      ...comments.map(c => ({ ...c, eventType: 'comment' })),
      ...app.versions.map(v => ({
        id: 'v' + v.version, appId: app.id, userId: v.uploadedBy, 
        text: v.note, createdAt: v.uploadedAt, eventType: 'upload', version: v.version
      }))
    ];
    events.sort((a,b) => a.createdAt - b.createdAt);

    if (!events.length) return '<div class="empty-state"><p>履歴はまだありません</p></div>';

    const roleDefs = MockData.roleDefinitions;

    return `<div class="comment-list">${events.map(e => {
      const user = MockData.getUser(e.userId);
      let typeClass = 'comment-item';
      let typeIcon = '';
      
      if (e.eventType === 'upload') {
        typeClass += ' comment-system';
        typeIcon = `<span class="comment-type-badge badge-system">第${e.version}稿アップロード</span>`;
      } else if (e.type === 'approval') {
        typeClass += ' comment-approval';
        typeIcon = '<span class="comment-type-badge badge-approve">承認</span>';
      } else if (e.type === 'rejection') {
        typeClass += ' comment-rejection';
        typeIcon = '<span class="comment-type-badge badge-reject">差し戻し</span>';
      } else if (e.type === 'feedback') {
        typeClass += ' comment-feedback';
        typeIcon = '<span class="comment-type-badge badge-feedback">指摘</span>';
      }

      const roleBadges = user && user.roles ? user.roles.map(r => Utils.roleBadge(r, roleDefs)).join('') : '';

      return `<div class="${typeClass}">
        <div class="comment-avatar">${avatar(user,'sm')}</div>
        <div class="comment-body">
          <div class="comment-header">
            <span class="comment-author">${user?user.name:'不明'}</span>
            <div class="comment-roles" style="display:inline-flex; align-items:center; margin-left:8px;">${roleBadges}</div>
            ${typeIcon}
            <span class="comment-time" title="${formatDate(e.createdAt,'full')}">${formatDate(e.createdAt,'smart')}</span>
          </div>
          <p class="comment-text">${escapeHtml(e.text)}</p>
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  // ─── バージョン履歴 ─────────────────
  function versionHistory(versions) {
    return `<div class="version-list">${versions.map((v,i) => {
      const user = MockData.getUser(v.uploadedBy);
      const isCurrent = i === versions.length - 1;
      return `<div class="version-item ${isCurrent?'version-current':''}">
        <div class="version-marker">${isCurrent?'●':'○'}</div>
        <div class="version-info">
          <span class="version-num">第${v.version}稿${isCurrent?' (最新)':''}</span>
          <span class="version-note">${escapeHtml(v.note)}</span>
          <span class="version-meta">${user?user.name:''} · ${formatDate(v.uploadedAt,'full')}</span>
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  // ─── ファイルリスト ─────────────────
  function fileList(files) {
    return `<div class="file-list">${files.map(f => {
      const ext = f.name.split('.').pop().toUpperCase();
      const size = f.size > 1e6 ? (f.size/1e6).toFixed(1)+'MB' : (f.size/1e3).toFixed(0)+'KB';
      const iconMap = {pdf:Icons.fileText,docx:Icons.fileText,ai:Icons.image,pptx:Icons.fileText,png:Icons.image,jpg:Icons.image,jpeg:Icons.image};
      return `<div class="file-item">
        <div class="file-icon">${iconMap[f.name.split('.').pop()]||Icons.file}</div>
        <div class="file-info">
          <span class="file-name">${escapeHtml(f.name)}</span>
          <span class="file-meta">${ext} · ${size}</span>
        </div>
        <div class="file-actions">
          <button class="btn btn-sm btn-outline" title="プレビュー" onclick='Preview.open(${JSON.stringify(f)})'>${Icons.eye}</button>
          <button class="btn btn-sm btn-outline" title="ダウンロード">${Icons.download}</button>
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  // ─── コメント入力フォーム ─────────────────
  function commentForm(appId) {
    return `<div class="comment-form">
      <textarea id="comment-input" class="form-textarea" placeholder="コメントを入力..." rows="3"></textarea>
      <div class="comment-form-actions">
        <button class="btn btn-primary" onclick="Components.submitComment('${appId}')">
          ${Icons.send} コメント送信
        </button>
      </div>
    </div>`;
  }

  async function submitComment(appId) {
    const input = document.getElementById('comment-input');
    const text = input.value.trim();
    if (!text) return;
    await API.addComment(appId, text);
    input.value = '';
    Utils.showToast('コメントを送信しました', 'success');
    // ページをリロード
    App.navigate('/applications/' + appId);
  }

  // ─── 空の状態 ─────────────────
  function emptyState(icon, title, desc) {
    return `<div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <h3>${title}</h3>
      <p>${desc}</p>
    </div>`;
  }

  // ─── タブ ─────────────────
  function tabs(items, activeId, onChange) {
    const tabsId = 'tabs_' + Utils.generateId();
    window['__tabChange_'+tabsId] = onChange;
    return `<div class="tabs" id="${tabsId}">${items.map(item =>
      `<button class="tab ${item.id===activeId?'tab-active':''}" onclick="window['__tabChange_${tabsId}']('${item.id}')">${item.label}</button>`
    ).join('')}</div>`;
  }

  return { avatar, statusBadge, categoryBadge, deadlineBadge, statsCard, applicationCard, miniFlow, workflowDiagram, commentThread, versionHistory, fileList, commentForm, submitComment, emptyState, tabs };
})();
