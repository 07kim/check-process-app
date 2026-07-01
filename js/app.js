/* ========================================
   App - アプリケーションコア・ルーター
   ======================================== */
window.App = (() => {
  function init() {
    // モーダル閉じ
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target.id === 'modal-overlay') Utils.closeModal();
    });

    // ログインフォーム
    const loginForm = document.getElementById('login-form');
    const loginSelect = document.getElementById('login-user');

    // ユーザー選択肢
    MockData.users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = `${u.name}（${Utils.getRoleLabel(u.roles ? u.roles[0] : '')}）`;
      loginSelect.appendChild(opt);
    });

    // データリセット
    const resetLink = document.getElementById('reset-data-link');
    if (resetLink) {
      resetLink.addEventListener('click', () => {
        if (confirm('システムデータをリセットして初期状態に戻しますか？\n（すべての申請データや設定が消去されます）')) {
          MockData.resetData();
        }
      });
    }

    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const userId = loginSelect.value;
      if (Auth.login(userId)) {
        showApp();
        navigate('/dashboard');
      }
    });

    // ログアウト
    document.getElementById('logout-btn').addEventListener('click', () => {
      Auth.logout();
      showLogin();
    });

    // モバイルメニュー
    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('sidebar-open');
    });

    // グローバル検索
    const globalSearch = document.getElementById('global-search');
    globalSearch.addEventListener('input', (e) => {
      const q = e.target.value;
      if (window.location.hash !== '#/applications') {
        Pages._appInitialSearch = q;
        navigate('/applications');
      } else {
        // すでに申請一覧にいる場合は、一覧側の検索窓に同期させて入力を促す
        const pageSearch = document.getElementById('filter-search');
        if (pageSearch) {
          pageSearch.value = q;
          pageSearch.dispatchEvent(new Event('input'));
        }
      }
    });

    // セッション復元
    if (Auth.isLoggedIn()) {
      showApp();
      handleRoute();
    } else {
      showLogin();
    }

    // ハッシュルーティング
    window.addEventListener('hashchange', handleRoute);
  }

  function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('hidden');
  }

  function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    updateUserUI();
  }

  function updateUserUI() {
    const user = Auth.getCurrentUser();
    if (!user) return;
    document.getElementById('sidebar-user-name').textContent = user.name;
    const roles = user.roles || [];
    const roleLabel = roles.length > 0 ? Utils.getRoleLabel(roles[0]) + (roles.length > 1 ? ` (+${roles.length - 1})` : '') : 'ゲスト';
    document.getElementById('sidebar-user-role').textContent = roleLabel;
    const av = document.getElementById('sidebar-avatar');
    av.textContent = Utils.getInitials(user.name);
    av.style.background = Utils.getAvatarColor(user.name);

    // 管理者メニューの表示制御
    const adminNav = document.getElementById('nav-admin');
    if (adminNav) adminNav.style.display = Auth.isAdmin() ? '' : 'none';
    const usersNav = document.getElementById('nav-users');
    if (usersNav) usersNav.style.display = Auth.isAdmin() ? '' : 'none';
    const systemSettingsNav = document.getElementById('nav-system-settings');
    if (systemSettingsNav) systemSettingsNav.style.display = Auth.isAdmin() ? '' : 'none';

    // 通知バッジ更新
    API.getNotifications().then(notifs => {
      const unread = notifs.filter(n => !n.read).length;
      const dot = document.getElementById('notification-dot');
      if (unread > 0) { dot.classList.remove('hidden'); } else { dot.classList.add('hidden'); }
    });
  }

  function navigate(path) {
    window.location.hash = path;
  }

  async function handleRoute() {
    const hash = window.location.hash.slice(1) || '/dashboard';
    const container = document.getElementById('main-content');
    container.innerHTML = '<div class="page-loading"><div class="spinner"></div><p>読み込み中...</p></div>';

    try {
      // アクティブナビ更新
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('nav-active'));

      // パンくず更新
      const breadcrumb = document.getElementById('header-breadcrumb');

      // ルーティング
      if (hash === '/dashboard') {
        setActive('dashboard'); breadcrumb.innerHTML = 'ダッシュボード';
        await Pages.dashboard(container);
      } else if (hash === '/applications') {
        setActive('applications'); breadcrumb.innerHTML = '<a href="#/dashboard">ホーム</a> / 申請一覧';
        await Pages.applications(container);
      } else if (hash === '/applications/new') {
        setActive('application-new'); breadcrumb.innerHTML = '<a href="#/dashboard">ホーム</a> / <a href="#/applications">申請一覧</a> / 新規申請';
        Pages.applicationNew(container);
      } else if (hash.startsWith('/applications/')) {
        const id = hash.split('/')[2];
        setActive('applications'); breadcrumb.innerHTML = '<a href="#/dashboard">ホーム</a> / <a href="#/applications">申請一覧</a> / 詳細';
        await Pages.applicationDetail(container, id);
      } else if (hash === '/settings') {
        setActive('settings'); breadcrumb.innerHTML = '<a href="#/dashboard">ホーム</a> / 設定';
        Pages.settings(container);
      } else if (hash === '/admin') {
        setActive('admin'); breadcrumb.innerHTML = '<a href="#/dashboard">ホーム</a> / 分析ダッシュボード';
        await Pages.admin(container);
      } else if (hash === '/admin/users') {
        setActive('users'); breadcrumb.innerHTML = '<a href="#/dashboard">ホーム</a> / ユーザー管理';
        await Pages.systemSettings(container);
      } else if (hash === '/admin/settings') {
        setActive('system-settings'); breadcrumb.innerHTML = '<a href="#/dashboard">ホーム</a> / システム設定';
        await Pages.systemSettings(container);
      } else if (hash === '/tasks') {
        setActive('tasks'); breadcrumb.innerHTML = '<a href="#/dashboard">ホーム</a> / 依頼一覧';
        await Pages.tasks(container);
      } else if (hash === '/tasks/new') {
        setActive('tasks'); breadcrumb.innerHTML = '<a href="#/dashboard">ホーム</a> / <a href="#/tasks">依頼一覧</a> / 新規依頼';
        await Pages.taskNew(container);
      } else if (hash.startsWith('/tasks/') && hash.endsWith('/edit')) {
        const id = hash.split('/')[2];
        setActive('tasks'); breadcrumb.innerHTML = '<a href="#/dashboard">ホーム</a> / <a href="#/tasks">依頼一覧</a> / 依頼詳細 / 編集';
        await Pages.taskNew(container, id);
      } else if (hash.startsWith('/tasks/')) {
        const id = hash.split('/')[2];
        setActive('tasks'); breadcrumb.innerHTML = '<a href="#/dashboard">ホーム</a> / <a href="#/tasks">依頼一覧</a> / 依頼詳細';
        await Pages.taskDetail(container, id);
      } else {
        navigate('/dashboard');
      }

      // モバイル: サイドバーを閉じる
      document.getElementById('sidebar').classList.remove('sidebar-open');
      // スクロールトップ
      container.scrollTop = 0;
    } catch (error) {
      console.error('Routing Error:', error);
      let errorMsg = error.message;
      if (errorMsg.includes('Pages.dashboard is not a function') && window.PAGES_INIT_ERROR) {
        errorMsg = `Pages初期化エラー: ${window.PAGES_INIT_ERROR.message}\n${window.PAGES_INIT_ERROR.stack}`;
      }
      container.innerHTML = `
        <div class="empty-state" style="padding:48px 24px;">
          <div style="font-size:48px; margin-bottom:16px;">⚠️</div>
          <h2 style="margin-bottom:8px;">ページの読み込みに失敗しました</h2>
          <p style="color:#64748B; margin-bottom:24px; white-space:pre-wrap;">エラーの詳細: ${Utils.escapeHtml(errorMsg)}</p>
          <button class="btn btn-primary" onclick="location.reload()">再読み込み</button>
        </div>
      `;
    }
  }

  function setActive(page) {
    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.dataset.page === page) el.classList.add('nav-active');
    });
  }

  // DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { navigate, handleRoute };
})();
