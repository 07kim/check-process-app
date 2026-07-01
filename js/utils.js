/* ========================================
   Utils - ユーティリティ関数・SVGアイコン
   ======================================== */
window.Utils = (() => {
  function formatDate(date, format = 'short') {
    if (!date) return '-';
    const d = new Date(date);
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
    const h = String(d.getHours()).padStart(2,'0'), min = String(d.getMinutes()).padStart(2,'0');
    
    switch(format){
      case 'full': return `${y}/${m}/${day} ${h}:${min}`;
      case 'date': return `${y}/${m}/${day}`;
      case 'short': return `${m}/${day}`;
      case 'relative': return getRelativeTime(d);
      case 'smart': // 新しい表示：最近なら相対、古いなら絶対+時間
        const diff = Date.now() - d;
        if (diff < 864e5 * 2) return `${getRelativeTime(d)} (${h}:${min})`;
        return `${m}/${day} ${h}:${min}`;
      default: return `${y}/${m}/${day} ${h}:${min}`;
    }
  }
  function getRelativeTime(d){const diff=Date.now()-d;const s=Math.floor(diff/1000),m=Math.floor(s/60),h=Math.floor(m/60),dy=Math.floor(h/24);if(s<60)return'たった今';if(m<60)return`${m}分前`;if(h<24)return`${h}時間前`;if(dy<7)return`${dy}日前`;return formatDate(d,'date');}
  const ROLE_MAP={creator:'作成者',responsible:'責任者',soumu_head:'総務部長',kikaku_head:'企画部長',kouhou_head:'広報部長',taisai_chair:'大祭委員長',vice_exec_1:'副執行①',vice_exec_2:'副執行②',chairman:'委員長',admin:'システム管理者'};
  function getRoleLabel(roleId) {
    if (window.MockData && window.MockData.roleDefinitions) {
      const rd = window.MockData.roleDefinitions.find(r => r.id === roleId);
      if (rd) return rd.name;
    }
    return ROLE_MAP[roleId] || roleId;
  }
  function getDaysUntil(date){if(!date)return null;const n=new Date();n.setHours(0,0,0,0);const t=new Date(date);t.setHours(0,0,0,0);return Math.ceil((t-n)/(864e5));}
  function getDeadlineClass(date){const d=getDaysUntil(date);if(d===null)return'';if(d<0)return'deadline-overdue';if(d<=1)return'deadline-urgent';if(d<=3)return'deadline-warning';return'deadline-ok';}
  function getDeadlineLabel(date){const d=getDaysUntil(date);if(d===null)return'';if(d<0)return`${Math.abs(d)}日超過`;if(d===0)return'本日期限';if(d===1)return'明日期限';return`あと${d}日`;}
  const STATUS_MAP={draft:{label:'下書き',cls:'status-draft'},pending:{label:'審査待ち',cls:'status-pending'},in_review:{label:'審査中',cls:'status-review'},approved:{label:'承認済み',cls:'status-approved'},rejected:{label:'差し戻し',cls:'status-rejected'},completed:{label:'完了',cls:'status-completed'}};
  function getStatusInfo(s){return STATUS_MAP[s]||{label:s,cls:''};}
  const CATEGORY_MAP={document:{label:'書類',color:'#4F6AFF'},promotional:{label:'広報物',color:'#8B5CF6'}};
  function getCategoryInfo(c){return CATEGORY_MAP[c]||{label:c,color:'#64748B'};}

  // ─── ロール・タグ表示用 ─────────────────
  function roleBadge(roleId, roleDefinitions) {
    if (!roleId || roleId === 'undefined') {
      return `<span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; padding:2px 10px; border-radius:20px; font-size:10.5px; font-weight:700; margin-right:4px; display:inline-flex; align-items:center; gap:5px; white-space:nowrap; vertical-align:middle;">
        <span style="width:5px; height:5px; border-radius:50%; background:#64748b;"></span>
        未指定
      </span>`;
    }
    const role = roleDefinitions.find(r => r.id === roleId) || { name: roleId, color: '#64748B' };
    return `<span class="badge" style="background:${role.color}10; color:${role.color}; border:1px solid ${role.color}30; padding:2px 10px; border-radius:20px; font-size:10.5px; font-weight:700; margin-right:4px; display:inline-flex; align-items:center; gap:5px; white-space:nowrap; vertical-align:middle;">
      <span style="width:5px; height:5px; border-radius:50%; background:${role.color};"></span>
      ${role.name}
    </span>`;
  }

  function tagBadge(tagName) {
    let color = '#64748B';
    if (window.MockData && window.MockData.tagDefinitions) {
      const td = window.MockData.tagDefinitions.find(t => t.name === tagName);
      if (td) color = td.color;
    }
    return `<span class="badge" style="background:${color}15; color:${color}; border:1px solid ${color}40; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600; margin-right:4px; white-space:nowrap;">
      # ${escapeHtml(tagName)}
    </span>`;
  }

  const FILE_REQUIREMENTS={document:{edit:{label:'編集用データ',accept:['.docx']},confirm:{label:'確認用データ',accept:['.pdf']}},promotional:{edit:{label:'編集用データ',accept:['.ai','.pptx']},confirm:{label:'確認用データ',accept:['.pdf']},image:{label:'画像データ',accept:['.png','.jpg','.jpeg']}}};
  function getFileRequirements(c){return FILE_REQUIREMENTS[c]||{};}
  function validateFileExtension(fn,exts){const e='.'+fn.split('.').pop().toLowerCase();return exts.includes(e);}
  function generateId(){return'id_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);}
  function escapeHtml(s){if(!s)return'';const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
  function showToast(message,type='info',duration=4000){const c=document.getElementById('toast-container');const t=document.createElement('div');t.className=`toast toast-${type}`;t.innerHTML=`<span class="toast-message">${escapeHtml(message)}</span><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>`;c.appendChild(t);requestAnimationFrame(()=>t.classList.add('toast-show'));setTimeout(()=>{t.classList.remove('toast-show');t.classList.add('toast-hide');setTimeout(()=>t.remove(),300);},duration);}
  function showModal(content,options={}){const o=document.getElementById('modal-overlay'),c=document.getElementById('modal-container');c.className=`modal-container ${options.size||'modal-md'}`;c.innerHTML=content;o.classList.remove('hidden');requestAnimationFrame(()=>o.classList.add('modal-visible'));if(options.onClose)o._onClose=options.onClose;}
  function closeModal(){const o=document.getElementById('modal-overlay');o.classList.remove('modal-visible');setTimeout(()=>{o.classList.add('hidden');if(o._onClose){o._onClose();delete o._onClose;}},300);}
  function getAvatarColor(n){const colors=['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#6366F1'];let h=0;for(let i=0;i<n.length;i++)h=n.charCodeAt(i)+((h<<5)-h);return colors[Math.abs(h)%colors.length];}
  function getInitials(n){return n.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2);}
  function calcProgress(app){if(app.status==='completed')return 100;const wf=window.WorkflowEngine.buildWorkflowState(app);return Math.round((app.currentStepIndex/wf.length)*100);}
  // ─── 正規化・フォーマット ─────────────────
  function normalizeDept(dept) {
    if (!dept) return '-';
    // 「部」を取り除き、全角半角や空白の揺れを最小限に（ここでは単純化）
    return dept.replace(/部$/, '');
  }

  function formatYear(year) {
    if (year === undefined || year === null || year === '') return '1回生';
    return `${year}回生`;
  }

  const I={
    check:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    x:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    clock:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    plus:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    search:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    filter:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
    upload:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    download:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    send:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    comment:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
    arrowRight:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    arrowLeft:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    users:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
    alert:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    flag:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
    fileText:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    image:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    eye:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    edit:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    undo:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>',
    chart:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    login:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
    folder:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>',
    trash:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
    paperclip:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>',
    chevronDown:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
    target:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    trending:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    tag:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
    externalLink:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  };

  // ─── カラー変換ユーティリティ ─────────────────
  function colorHexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }
  function colorRgbToHex(r, g, b) {
    const toHex = (n) => {
      const h = Math.max(0, Math.min(255, n)).toString(16);
      return h.length === 1 ? '0' + h : h;
    };
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }
  function colorRgbToCmyk(r, g, b) {
    let rr = r / 255, gg = g / 255, bb = b / 255;
    let k = Math.min(1 - rr, 1 - gg, 1 - bb);
    if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
    let c = Math.round((1 - rr - k) / (1 - k) * 100);
    let m = Math.round((1 - gg - k) / (1 - k) * 100);
    let y = Math.round((1 - bb - k) / (1 - k) * 100);
    return { c, m, y, k: Math.round(k * 100) };
  }
  function colorCmykToRgb(c, m, y, k) {
    let cc = c / 100, mm = m / 100, yy = y / 100, kk = k / 100;
    let r = Math.round(255 * (1 - cc) * (1 - kk));
    let g = Math.round(255 * (1 - mm) * (1 - kk));
    let b = Math.round(255 * (1 - yy) * (1 - kk));
    return { r, g, b };
  }

  return {
    formatDate, getRelativeTime, getDaysUntil, getDeadlineClass, getDeadlineLabel,
    getStatusInfo, getCategoryInfo, getRoleLabel, roleBadge, tagBadge,
    getFileRequirements, validateFileExtension, generateId, escapeHtml,
    showToast, showModal, closeModal, getAvatarColor, getInitials,
    calcProgress, normalizeDept, formatYear,
    colorHexToRgb, colorRgbToHex, colorRgbToCmyk, colorCmykToRgb,
    Icons: I, ROLE_MAP
  };
})();
