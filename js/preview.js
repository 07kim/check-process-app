/* ========================================
   Preview - ファイルプレビューエンジン
   ======================================== */
window.Preview = (() => {
  const { Icons, escapeHtml, showModal, closeModal } = Utils;

  /**
   * プレビューを開く
   * @param {Object} file - ファイルオブジェクト {name, type, ...}
   */
  function open(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const title = `プレビュー: ${escapeHtml(file.name)}`;
    
    let content = '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      content = renderImagePreview(file);
    } else if (ext === 'pdf' || ext === 'ai') {
      content = renderPDFPreview(file, ext === 'ai');
    } else if (['docx', 'xlsx', 'pptx'].includes(ext)) {
      content = renderOfficePreview(file);
    } else {
      content = renderFallback(file);
    }

    showModal(`
      <div class="preview-modal">
        <div class="preview-header">
          <h2 class="preview-title">${title}</h2>
          <div class="preview-actions">
            <button class="btn btn-outline btn-sm" onclick="Utils.closeModal()">${Icons.x} 閉じる</button>
          </div>
        </div>
        <div class="preview-body" id="preview-body">
          ${content}
        </div>
        <div class="preview-footer">
          <p class="preview-hint">※ プレビューは確認用です。正確な内容はダウンロードしてご確認ください。</p>
          <a href="#" class="btn btn-primary btn-sm" onclick="return false;">${Icons.download} ダウンロード</a>
        </div>
      </div>
    `, { size: 'modal-lg' });
  }

  function renderImagePreview(file) {
    // 実際にはアップロードされたURLが必要だが、モックではダミーを表示
    return `<div class="preview-image-container">
      <img src="https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=1200&q=80" alt="${escapeHtml(file.name)}">
    </div>`;
  }

  function renderPDFPreview(file, isAi = false) {
    return `<div class="preview-pdf-container">
      <div class="preview-loading">
        <div class="spinner"></div>
        <p>${isAi ? 'AIファイルのPDF互換領域を解析中...' : 'PDFを読み込み中...'}</p>
        <p class="form-hint">容量が大きいファイルは時間がかかる場合があります</p>
      </div>
      <iframe src="https://mozilla.github.io/pdf.js/web/viewer.html" class="preview-iframe" title="PDF Preview"></iframe>
    </div>`;
  }

  function renderOfficePreview(file) {
    return `<div class="preview-placeholder">
      <div class="placeholder-icon">${Icons.fileText}</div>
      <h3>Officeファイルのプレビュー</h3>
      <p>${escapeHtml(file.name)} は現在直接表示できません。</p>
      <p class="form-hint">Word/Excelファイルのブラウザ表示は将来のアップデートで対応予定です。</p>
      <div style="margin-top:20px">
        <button class="btn btn-primary">${Icons.download} ダウンロードして確認</button>
      </div>
    </div>`;
  }

  function renderFallback(file) {
    return `<div class="preview-placeholder">
      <div class="placeholder-icon">${Icons.alert}</div>
      <h3>プレビュー非対応</h3>
      <p>このファイル形式のプレビューには対応していません。</p>
      <div style="margin-top:20px">
        <button class="btn btn-primary">${Icons.download} ダウンロード</button>
      </div>
    </div>`;
  }

  return { open };
})();
