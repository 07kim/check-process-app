/* ========================================
   Mock Data - テスト用モックデータ
   ======================================== */
window.MockData = (() => {
  // ─── 永続化ロジック ─────────────────
  const STORAGE_KEY = 'checkflow_mock_data_v2';

  // 日付のシリアライズ・デシリアライズ補助
  function reviver(key, value) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return new Date(value);
    }
    return value;
  }

  // ─── 定義データ ─────────────────
  let roleDefinitions = [
    { id: 'creator', name: '作成者', color: '#64748B', permissions: ['create_app'] },
    { id: 'responsible', name: '責任者', color: '#3B82F6', permissions: ['approve_app'] },
    { id: 'soumu_head', name: '総務部長', color: '#EF4444', permissions: ['approve_app'] },
    { id: 'kikaku_head', name: '企画部長', color: '#10B981', permissions: ['approve_app'] },
    { id: 'kouhou_head', name: '広報部長', color: '#F59E0B', permissions: ['approve_app'] },
    { id: 'taisai_chair', name: '大祭委員長', color: '#8B5CF6', permissions: ['approve_app', 'view_analytics'] },
    { id: 'vice_exec_1', name: '副執行①', color: '#EC4899', permissions: ['approve_app', 'view_analytics'] },
    { id: 'vice_exec_2', name: '副執行②', color: '#EC4899', permissions: ['approve_app', 'view_analytics'] },
    { id: 'chairman', name: '委員長', color: '#D946EF', permissions: ['approve_app', 'view_analytics', 'manage_system'] },
    { id: 'admin', name: 'システム管理者', color: '#1F2937', permissions: ['view_analytics', 'manage_users', 'manage_system', 'approve_app'] },
  ];

  let tagDefinitions = [
    { name: '大祭関連', color: '#8B5CF6' },
    { name: '予算関連', color: '#10B981' },
    { name: '広報物', color: '#3B82F6' },
    { name: '学外協力', color: '#F59E0B' },
    { name: '重要', color: '#EF4444' },
    { name: '急ぎ', color: '#EC4899' },
    { name: '春企画', color: '#10B981' },
    { name: '夏企画', color: '#F59E0B' }
  ];

  function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved, reviver);
    } catch (e) {
      console.error('Data load error:', e);
      return null;
    }
  }

  // ─── 初期データ定義 ─────────────────
  let users = [
    { id:'u1', name:'田中 太郎', email:'tanaka@example.com', roles:['creator'], department:'広報', year: 2 },
    { id:'u2', name:'佐藤 美咲', email:'sato@example.com', roles:['creator'], department:'企画', year: 3 },
    { id:'u3', name:'山田 健一', email:'yamada@example.com', roles:['responsible', 'kouhou_head'], department:'広報', year: 4 },
    { id:'u4', name:'鈴木 花子', email:'suzuki@example.com', roles:['soumu_head'], department:'総務', year: 3 },
    { id:'u5', name:'高橋 誠', email:'takahashi@example.com', roles:['kikaku_head'], department:'企画', year: 4 },
    { id:'u6', name:'伊藤 直樹', email:'ito@example.com', roles:['kouhou_head'], department:'広報', year: 1 },
    { id:'u7', name:'渡辺 大輔', email:'watanabe@example.com', roles:['taisai_chair'], department:'企画', year: 3 },
    { id:'u8', name:'中村 理恵', email:'nakamura@example.com', roles:['vice_exec_1'], department:'財務', year: 2 },
    { id:'u9', name:'小林 翔太', email:'kobayashi@example.com', roles:['vice_exec_2'], department:'渉外', year: 2 },
    { id:'u10', name:'加藤 雅人', email:'kato@example.com', roles:['chairman'], department:'厚生', year: 4 },
    { id:'u11', name:'吉田 管理', email:'yoshida@example.com', roles:['admin', 'responsible'], department:'福祉', year: 4 },
    { id:'u12', name:'佐々木 優', email:'sasaki@example.com', roles:['creator'], department:'広報', year: 2 },
    { id:'u13', name:'木村 健太', email:'kimura@example.com', roles:['creator'], department:'企画', year: 1 },
    { id:'u14', name:'清水 葵', email:'shimizu@example.com', roles:['responsible'], department:'総務', year: 3 },
    { id:'u15', name:'山口 達也', email:'yamaguchi@example.com', roles:['admin'], department:'企画', year: 4 }
  ];

  const now = new Date();
  const day = 864e5;

  let comments = [
    {
      id: 'c1',
      appId: 'app1',
      userId: 'u3',
      text: '全体の色調をもっと明るい夏らしい青と黄色に調整してください。',
      createdAt: new Date(now - 4*day),
      type: 'comment'
    },
    {
      id: 'c2',
      appId: 'app1',
      userId: 'u1',
      text: '了解しました。CMYK比率を調整し、黄色を強調したデザインに更新しました。',
      createdAt: new Date(now - 2*day),
      type: 'comment'
    },
    {
      id: 'c3',
      appId: 'app1',
      userId: 'u3',
      text: '確認しました。こちらで問題ありません。承認します。',
      createdAt: new Date(now - 1*day),
      type: 'approval'
    },
    {
      id: 'c4',
      appId: 'app2',
      userId: 'u11',
      text: '予算の割り当て項目が一部不明瞭です。詳細を記載してください。',
      createdAt: new Date(now - 6*day),
      type: 'comment'
    },
    {
      id: 'c5',
      appId: 'app7',
      userId: 'u3',
      text: 'フォントサイズが小さすぎて看板として目立ちません。タイトルの文字サイズを2倍にしてください。',
      createdAt: new Date(now - 9*day),
      type: 'rejection'
    }
  ];

  let notifications = [
    {
      id: 'n1',
      userId: 'u1',
      text: '山田 健一さんが「夏祭りポスターデザイン」を承認しました。次のステップへ進みます。',
      appId: 'app1',
      read: false,
      createdAt: new Date(now - 1*day)
    },
    {
      id: 'n2',
      userId: 'u1',
      text: '「新歓一会用立て看板」が差し戻されました。コメントを確認してください。',
      appId: 'app7',
      read: false,
      createdAt: new Date(now - 9*day)
    },
    {
      id: 'n3',
      userId: 'u2',
      text: '「予算状況報告書」が最終承認されました。',
      appId: 'app10',
      read: true,
      createdAt: new Date(now - 12*day)
    }
  ];

  let applications = [
    {
      id:'app1', title:'夏祭りポスターデザイン', category:'promotional',
      tags:['大祭関連', '広報物', '夏企画'], requesterId:null,
      isFestivalRelated:true, status:'in_review', creatorId:'u1',
      createdAt:new Date(now - 5*day), deadline:new Date(now + 3*day),
      currentStepIndex:1, description:'夏祭りの告知ポスター。A2サイズ、カラー印刷。駅構内とキャンパスに掲示予定。',
      files:[
        {id:'f1',name:'summer_poster_v2.ai',type:'edit',size:4500000,version:2,uploadedAt:new Date(now-2*day)},
      ],
      versions:[
        {version:1,uploadedAt:new Date(now-5*day),uploadedBy:'u1',note:'初稿提出'},
        {version:2,uploadedAt:new Date(now-2*day),uploadedBy:'u1',note:'責任者指摘'},
      ],
    },
    {
      id:'app2', title:'新入生歓迎企画書', category:'document',
      tags:['予算関連', '春企画'], requesterId:null,
      isFestivalRelated:false, status:'in_review', creatorId:'u2',
      createdAt:new Date(now - 7*day), deadline:new Date(now + 5*day),
      currentStepIndex:2, description:'新入生歓迎イベントの企画書。',
      files:[],
      versions:[],
    },
    {
      id:'app3', title:'活動報告書（4月度）', category:'document',
      tags:['重要', '春企画'], requesterId:null,
      isFestivalRelated:false, status:'completed', creatorId:'u2',
      createdAt:new Date(now - 14*day), deadline:new Date(now - 2*day),
      completedAt:new Date(now - 3*day), // 1日遅延
      currentStepIndex:4, description:'4月度の活動報告書。',
      files:[],
      versions:[],
    },
    {
      id:'app4', title:'春の大掃除告知', category:'promotional',
      tags:['春企画'], requesterId:null,
      isFestivalRelated:false, status:'completed', creatorId:'u1',
      createdAt:new Date(now - 30*day), deadline:new Date(now - 25*day),
      completedAt:new Date(now - 26*day), // 期限内
      currentStepIndex:4, description:'学内大掃除の告知。',
      files:[],
      versions:[],
    },
    {
      id:'app5', title:'夏合宿実施計画書', category:'document',
      tags:['予算関連', '夏企画', '重要'], requesterId:null,
      isFestivalRelated:false, status:'pending', creatorId:'u2',
      createdAt:new Date(now - 1*day), deadline:new Date(now + 10*day),
      currentStepIndex:0, description:'夏合宿の計画書及び予算書。',
      files:[],
      versions:[],
    },
    {
      id:'app6', title:'学園祭パンフレット表紙デザイン', category:'promotional',
      tags:['大祭関連', '広報物', '重要', '急ぎ'], requesterId:null,
      isFestivalRelated:true, status:'in_review', creatorId:'u1',
      createdAt:new Date(now - 3*day), deadline:new Date(now + 2*day),
      currentStepIndex:2, description:'学園祭公式パンフレットの表紙デザイン案。',
      files:[
        {id:'f2',name:'pamphlet_cover_v1.pdf',type:'edit',size:7500000,version:1,uploadedAt:new Date(now-3*day)},
      ],
      versions:[
        {version:1,uploadedAt:new Date(now-3*day),uploadedBy:'u1',note:'初稿提出'},
      ],
    },
    {
      id:'app7', title:'新入生歓迎会用立て看板', category:'promotional',
      tags:['春企画', '広報物'], requesterId:null,
      isFestivalRelated:false, status:'rejected', creatorId:'u1',
      createdAt:new Date(now - 10*day), deadline:new Date(now - 2*day),
      currentStepIndex:1, description:'新入生歓迎イベントの立て看板デザイン。',
      files:[
        {id:'f3',name:'welcome_board.ai',type:'edit',size:5200000,version:1,uploadedAt:new Date(now-10*day)},
      ],
      versions:[
        {version:1,uploadedAt:new Date(now-10*day),uploadedBy:'u1',note:'初稿提出'},
      ],
    },
    {
      id:'app8', title:'外部協力申請書', category:'document',
      tags:['学外協力', '重要'], requesterId:null,
      isFestivalRelated:false, status:'in_review', creatorId:'u2',
      createdAt:new Date(now - 8*day), deadline:new Date(now + 1*day),
      currentStepIndex:1, description:'地域連携イベントに関する協力申請。',
      files:[],
      versions:[],
    },
    {
      id:'app9', title:'大祭用案内マップ', category:'promotional',
      tags:['大祭関連', '広報物'], requesterId:null,
      isFestivalRelated:true, status:'pending', creatorId:'u1',
      createdAt:new Date(now - 2*day), deadline:new Date(now + 6*day),
      currentStepIndex:0, description:'大祭会場内の案内図。',
      files:[],
      versions:[],
    },
    {
      id:'app10', title:'予算状況報告書', category:'document',
      tags:['予算関連'], requesterId:null,
      isFestivalRelated:false, status:'completed', creatorId:'u2',
      createdAt:new Date(now - 20*day), deadline:new Date(now - 10*day),
      completedAt:new Date(now - 12*day), // 期限内
      currentStepIndex:4, description:'第1四半期の予算執行状況。',
      files:[],
      versions:[],
    }
  ];

  let tasks = [
    {
      id: 't1',
      title: '大祭パンフレットの表紙作成',
      category: 'promotional',
      status: 'requested',
      requesterId: 'u3',
      assigneeId: 'u1',
      createdAt: new Date(now - 2*day),
      deadline: '2026-07-15',
      tags: ['大祭関連', '広報物', '重要'],
      specifications: {
        projectInfo: {
          fields: [
            { id: 'p1', label: '企画名', type: 'text', defaultValue: '' },
            { id: 'p2', label: '開催目的', type: 'textarea', defaultValue: '' },
            { id: 'p3', label: '企画概要', type: 'textarea', defaultValue: '' }
          ],
          values: {
            p1: '秋の大祭2026',
            p2: '大学祭全体の広報・集客',
            p3: '大祭のプログラムや出店マップが記載された冊子。'
          },
          mediaType: 'print',
          size: 'A4',
          todo: '表紙として映える鮮やかなビジュアルをお願いします。ロゴは必ず中央上部に配置してください。'
        },
        designInfo: {
          cmyk: { bg: {c:0,m:0,y:0,k:3}, title: {c:0,m:12,y:50,k:2}, text: {c:75,m:47,y:0,k:68}, main: {c:240,m:179,y:28,k:0}, glow: {c:10,m:5,y:85,k:0}, shadow: {c:80,m:40,y:15,k:0} },
          rgb: { bg: {r:245,g:245,b:240}, title: {r:250,g:219,b:124}, text: {r:20,g:43,b:81}, main: {r:240,g:179,b:28}, glow: {r:239,g:227,b:49}, shadow: {r:31,g:127,b:178} },
          fonts: { 
            main: { name: 'しっぽり明朝', link: '' }, 
            text: { name: 'しっぽり明朝', link: '' }, 
            title: { name: '装甲明朝', link: '' } 
          },
          labels: { bg: '背景色', title: 'メインタイトル', text: '本文 / その他', main: '主要グラフィック', glow: 'アクセント', shadow: '影/ベース' }
        },
        references: []
      }
    }
  ];

  let taskPresets = [
    {
      id: 'poster',
      name: 'ポスター制作',
      specifications: {
        projectInfo: { 
          fields: [
            { id: 'p1', label: '企画名', type: 'text', defaultValue: '' },
            { id: 'p2', label: '開催目的', type: 'textarea', defaultValue: '' },
            { id: 'p3', label: '企画概要', type: 'textarea', defaultValue: '' },
            { id: 'p4', label: '開催日時', type: 'datetime-local', defaultValue: '' },
            { id: 'p5', label: '開催場所', type: 'text', defaultValue: '' },
            { id: 'p6', label: '参加対象', type: 'text', defaultValue: '' }
          ]
        },
        designInfo: {
          cmyk: { bg: {c:0,m:0,y:0,k:3}, title: {c:0,m:12,y:50,k:2}, text: {c:75,m:47,y:0,k:68}, main: {c:240,m:179,y:28,k:0}, glow: {c:10,m:5,y:85,k:0}, shadow: {c:80,m:40,y:15,k:0} },
          rgb: { bg: {r:245,g:245,b:240}, title: {r:250,g:219,b:124}, text: {r:20,g:43,b:81}, main: {r:240,g:179,b:28}, glow: {r:239,g:227,b:49}, shadow: {r:31,g:127,b:178} },
          fonts: { 
            main: { name: 'しっぽり明朝', link: '' }, 
            text: { name: 'しっぽり明朝', link: '' }, 
            title: { name: '装甲明朝', link: '' } 
          },
          labels: { bg: '背景色', title: 'メインタイトル', text: '本文 / その他', main: '主要グラフィック', glow: 'アクセント', shadow: '影/ベース' }
        }
      }
    },
    {
      id: 'flyer',
      name: 'ビラ制作',
      specifications: {
        projectInfo: { 
          fields: [
            { id: 'f1', label: '企画名', type: 'text', defaultValue: '' },
            { id: 'f2', label: '企画概要', type: 'textarea', defaultValue: '' },
            { id: 'f3', label: '配布場所', type: 'text', defaultValue: '' },
            { id: 'f4', label: '配布枚数', type: 'number', defaultValue: '100' }
          ]
        },
        designInfo: {
          cmyk: { bg: {c:0,m:0,y:0,k:0}, title: {c:80, m:60, y:45, k:30}, text: {c:75, m:55, y:40, k:25}, main: {c:70, m:25, y:0, k:0}, glow: {c:0, m:15, y:95, k:0}, shadow: {c:5, m:2, y:2, k:0} },
          rgb: { bg: {r:255,g:255,b:255}, title: {r:44, g:62, b:80}, text: {r:52, g:73, b:94}, main: {r:52, g:152, b:219}, glow: {r:241, g:196, b:15}, shadow: {r:236, g:240, b:241} },
          fonts: { 
            main: { name: 'Roboto', link: '' }, 
            text: { name: 'Arial', link: '' }, 
            title: { name: 'Inter', link: '' } 
          },
          labels: { bg: 'キャンバス背景', title: 'タイトル', text: '本文', main: '主要要素', glow: '強調色', shadow: 'ベース/影' }
        },
        references: []
      }
    }
  ];

  let workflowTemplates = [
    { 
      id: 'template_pub_normal', 
      name: '広報物チェック', 
      steps: [
        { id: 't1_s1', name: '一次チェック', roles: ['creator'], userIds: [], type: 'serial', status: 'pending', approvals: [] },
        { id: 't1_s2', name: '広報部長・企画部長', roles: ['kouhou_head', 'kikaku_head'], userIds: [], type: 'parallel', status: 'pending', approvals: [] },
        { id: 't1_s3', name: '副執行', roles: ['vice_exec_1', 'vice_exec_2'], userIds: [], type: 'parallel', status: 'pending', approvals: [] },
        { id: 't1_s4', name: '委員長（最終承認）', roles: ['chairman'], userIds: [], type: 'serial', status: 'pending', approvals: [] }
      ] 
    },
    { 
      id: 'template_doc_budget', 
      name: '書類・予算申請', 
      steps: [
        { id: 't2_s1', name: '責任者チェック', roles: ['responsible'], userIds: [], type: 'serial', status: 'pending', approvals: [] },
        { id: 't2_s2', name: '総務部長・企画部長', roles: ['soumu_head', 'kikaku_head'], userIds: [], type: 'parallel', status: 'pending', approvals: [] },
        { id: 't2_s3', name: '副執行', roles: ['vice_exec_1', 'vice_exec_2'], userIds: [], type: 'parallel', status: 'pending', approvals: [] },
        { id: 't2_s4', name: '委員長（最終承認）', roles: ['chairman'], userIds: [], type: 'serial', status: 'pending', approvals: [] }
      ] 
    }
  ];

  // ─── ロード・正規化ロジック ─────────────────
  const savedData = loadData();
  
  // IDベースのマスターマッピング（文字化け・不整合対策の最終防衛ライン）
  const USER_MASTER = {
    'u1': { year: 2, department: '広報', recentWorks: ['新歓ビラ', '学内新聞'], delayRate: 0 },
    'u2': { year: 3, department: '企画', recentWorks: ['企画書テンプレート', '合宿案内'], delayRate: 15 },
    'u3': { year: 4, department: '広報', recentWorks: ['大祭ポスター2023', '周年記念誌'], delayRate: 5 },
    'u4': { year: 3, department: '総務', recentWorks: ['規約改正案', '議事録テンプレート'], delayRate: 0 },
    'u5': { year: 4, department: '企画', recentWorks: ['春の音楽祭企画', '学園祭予算'], delayRate: 8 },
    'u6': { year: 1, department: '広報', recentWorks: ['SNSバナー', '小冊子デザイン'], delayRate: 0 },
    'u7': { year: 3, department: '企画', recentWorks: ['渉外資料一式', '協賛依頼書'], delayRate: 20 },
    'u8': { year: 2, department: '財務', recentWorks: ['決算報告書', '予算配分表'], delayRate: 0 },
    'u9': { year: 2, department: '渉外', recentWorks: ['外部提携資料', '挨拶状'], delayRate: 3 },
    'u10': { year: 4, department: '厚生', recentWorks: ['学内美化計画', '備品リスト'], delayRate: 0 },
    'u11': { year: 4, department: '福祉', recentWorks: ['交流イベント資料'], delayRate: 0 },
    'u12': { year: 2, department: '広報', recentWorks: ['団体紹介パンフレット'], delayRate: 0 },
    'u13': { year: 1, department: '企画', recentWorks: ['学内アンケート作成'], delayRate: 0 },
    'u14': { year: 3, department: '総務', recentWorks: ['備品管理規則改定'], delayRate: 0 },
    'u15': { year: 4, department: '企画', recentWorks: ['年間予算マスター'], delayRate: 0 }
  };

  if (savedData) {
    if (savedData.users) users = savedData.users;
    if (savedData.applications) applications = savedData.applications;
    if (savedData.comments) comments = savedData.comments;
    if (savedData.notifications) notifications = savedData.notifications;
    if (savedData.roleDefinitions) roleDefinitions = savedData.roleDefinitions;
    if (savedData.tagDefinitions) tagDefinitions = savedData.tagDefinitions;
    if (savedData.workflowTemplates) workflowTemplates = savedData.workflowTemplates;
    if (savedData.tasks) tasks = savedData.tasks;
    if (savedData.taskPresets) taskPresets = savedData.taskPresets;
  }

  // 常に正規化を適用
  users = users.map(u => {
    const master = USER_MASTER[u.id];
    if (master) {
      u.year = master.year;
      u.department = master.department.replace(/部$/, '');
      u.recentWorks = master.recentWorks || [];
      u.delayRate = master.delayRate || 0;
    }
    if (!u.roles) u.roles = [];
    return u;
  });

  saveData();

  function getUser(id){return users.find(u=>u.id===id);}
  function getApp(id){return applications.find(a=>a.id===id);}
  function getTask(id){return tasks.find(t=>t.id===id);}
  function getComments(appId){return comments.filter(c=>c.appId===appId).sort((a,b)=>a.createdAt-b.createdAt);}
  function getNotifications(userId){return notifications.filter(n=>n.userId===userId).sort((a,b)=>b.createdAt-a.createdAt);}
  function getUserApps(userId){return applications.filter(a=>a.creatorId===userId);}
  function resetData() { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }

  function createNotification(userId, text, appId=null) {
    notifications.push({
      id:'n'+Date.now()+'_'+Math.random().toString(36).slice(2,5),
      userId, text, appId, read:false, createdAt:new Date()
    });
    saveData();
  }

  function saveData() {
    const data = { users, applications, comments, notifications, roleDefinitions, tagDefinitions, workflowTemplates, tasks, taskPresets };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  return{users,applications,comments,notifications,roleDefinitions,tagDefinitions,workflowTemplates,tasks,taskPresets,getUser,getApp,getTask,getComments,getNotifications,getUserApps,saveData,resetData,createNotification};
})();
