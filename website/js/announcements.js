// お知らせ表示機能
import { firebaseConfig } from './firebaseConfig.js';

(function() {
  'use strict';

  // Firebase初期化
  let db = null;
  
  function initFirebase() {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      
      // 名前付きデータベースを使用
      const app = firebase.app();
      db = app.firestore('dev-firebase-store');
      
      console.log('[Informations] Firebase initialized with database: dev-firebase-store');
    } catch (error) {
      console.error('[Informations] Firebase initialization error:', error);
      
      // フォールバック: デフォルトデータベースを使用
      try {
        db = firebase.firestore();
        console.log('[Informations] Using default Firestore database');
      } catch (fallbackError) {
        console.error('[Informations] Fallback initialization failed:', fallbackError);
      }
    }
  }

  // お知らせを読み込む
  async function loadInformations() {
    if (!db) {
      console.error('[Informations] Firestore not initialized');
      return [];
    }

    try {
      console.log('[Informations] Loading informations...');
      
      // activeフィルターなしで全件取得してJavaScriptでフィルタリング
      const querySnapshot = await db.collection('informations').get();

      const informations = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // activeがtrueのもののみ追加
        if (data.active === true) {
          informations.push({
            id: doc.id,
            ...data
          });
        }
      });

      // 日付でソート（降順）して最新5件
      informations.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA;
      });

      const limitedInformations = informations.slice(0, 5);

      console.log('[Informations] Loaded informations:', limitedInformations.length);
      return limitedInformations;
    } catch (error) {
      console.error('[Informations] Error loading informations:', error);
      return [];
    }
  }

  // お知らせを表示
  function displayInformations(informations) {
    const container = document.getElementById('announcements-container');
    if (!container) {
      console.warn('[Informations] Container not found');
      return;
    }

    if (informations.length === 0) {
      container.style.display = 'none';
      return;
    }

    const lang = getCurrentLanguage();
    const html = informations.map(information => {
      const title = information[`title_${lang}`] || information.title_ja || '';
      const content = information[`content_${lang}`] || information.content_ja || '';
      const date = formatDate(information.date, lang);

      return `
        <div class="announcement-item">
          <div class="announcement-date">${date}</div>
          <h3 class="announcement-title">${escapeHtml(title)}</h3>
          <p class="announcement-content">${escapeHtml(content)}</p>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
    container.style.display = 'block';
  }

  // 日付をフォーマット
  function formatDate(dateString, lang) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    
    const locales = {
      ja: 'ja-JP',
      en: 'en-US',
      ko: 'ko-KR',
      zh: 'zh-CN'
    };

    return date.toLocaleDateString(locales[lang] || 'ja-JP', options);
  }

  // HTMLエスケープ
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 現在の言語を取得
  function getCurrentLanguage() {
    return localStorage.getItem('preferredLanguage') || 'ja';
  }

  // 初期化
  async function init() {
    initFirebase();
    const informations = await loadInformations();
    displayInformations(informations);
  }

  // 言語変更時に再表示
  window.addEventListener('languageChanged', async () => {
    const informations = await loadInformations();
    displayInformations(informations);
  });

  // ページ読み込み時に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
