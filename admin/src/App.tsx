import { useState, useEffect } from 'react';
import { signInWithCustomToken, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, ENV, FUNCTIONS_URL } from './firebase';


type Tab = 'versions' | 'maintenance' | 'excludeUsers' | 'information';

interface PlatformVersion {
  id: number; platform: string; version: string;
  release_notes: string | null; download_url: string | null; updated_at: string;
}
interface Maintenance {
  id: number; status: number;
  message_ja: string; message_en: string; message_ko: string; message_cn: string;
  updated_at: string;
}
interface ExcludeUser {
  id: number; wallet_address: string; created_at: string;
}
interface Information {
  id: number;
  title_ja: string; title_en: string; title_ko: string; title_cn: string;
  body_ja: string; body_en: string; body_ko: string; body_cn: string;
  display_start_at: string; display_end_at: string | null;
  priority: number; created_at: string; updated_at: string;
}

const suffix = ENV === 'prd' ? 'Prd' : 'Dev';
const api = (name: string) => `${FUNCTIONS_URL}/${name}${suffix}`;

async function apiFetch(url: string, token: string, body?: object) {
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json()).error || 'API error');
  return res.json();
}

export default function App() {
  const [user, setUser]         = useState<User | null>(null);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab]           = useState<Tab>('versions');
  const [msg, setMsg]           = useState('');
  const [saving, setSaving]     = useState(false);

  // versions
  const [versions, setVersions]   = useState<PlatformVersion[]>([]);
  const [editingVer, setEditingVer] = useState<Partial<PlatformVersion> | null>(null);

  // maintenance
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [editingMnt, setEditingMnt]     = useState<Partial<Maintenance> | null>(null);

  // excludeUsers
  const [excludeUsers, setExcludeUsers] = useState<ExcludeUser[]>([]);
  const [newWallet, setNewWallet]       = useState('');

  // information
  const [informations, setInformations]   = useState<Information[]>([]);
  const [editingInfo, setEditingInfo]     = useState<Partial<Information> | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => { if (user) { loadVersions(); loadMaintenances(); loadExcludeUsers(); loadInformations(); } }, [user]);

  async function loadVersions() {
    const res = await fetch(api('getVersions'));
    const data = await res.json();
    setVersions(data.versions ?? []);
  }
  async function loadMaintenances() {
    try {
      const token = await user!.getIdToken();
      const d = await apiFetch(api('getMaintenanceAll'), token);
      setMaintenances(d.records ?? []);
    } catch { setMaintenances([]); }
  }
  async function loadExcludeUsers() {
    try {
      const token = await user!.getIdToken();
      const data = await apiFetch(api('getExcludeUsers'), token);
      setExcludeUsers(data.users ?? []);
    } catch { setExcludeUsers([]); }
  }
  async function loadInformations() {
    try {
      const token = await user!.getIdToken();
      const data = await apiFetch(api('getInformationAll'), token);
      setInformations(data.records ?? []);
    } catch { setInformations([]); }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoginError('');
    try {
      const res = await fetch(api('adminLogin'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mail_address: email, password }),
      });
      if (!res.ok) throw new Error();
      const { customToken } = await res.json();
      await signInWithCustomToken(auth, customToken);
    } catch { setLoginError('メールアドレスまたはパスワードが違います'); }
  }

  async function handleSaveVersion(e: React.FormEvent) {
    e.preventDefault(); if (!editingVer) return;
    setSaving(true); setMsg('');
    try {
      const token = await user!.getIdToken();
      await apiFetch(api('upsertVersion'), token, editingVer);
      setMsg('保存しました'); setEditingVer(null); await loadVersions();
    } catch (e: any) { setMsg('エラー: ' + e.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteVersion(platform: string) {
    if (!confirm(`${platform} を削除しますか？`)) return;
    const token = await user!.getIdToken();
    await apiFetch(api('deleteVersion'), token, { platform });
    setMsg('削除しました'); await loadVersions();
  }

  async function handleSaveMaintenance(e: React.FormEvent) {
    e.preventDefault(); if (!editingMnt) return;
    setSaving(true); setMsg('');
    try {
      const token = await user!.getIdToken();
      await apiFetch(api('upsertMaintenance'), token, editingMnt);
      setMsg('保存しました'); setEditingMnt(null); await loadMaintenances();
    } catch (e: any) { setMsg('エラー: ' + e.message); }
    finally { setSaving(false); }
  }

  async function handleSaveInformation(e: React.FormEvent) {
    e.preventDefault(); if (!editingInfo) return;
    setSaving(true); setMsg('');
    try {
      const token = await user!.getIdToken();
      await apiFetch(api('upsertInformation'), token, editingInfo);
      setMsg('保存しました'); setEditingInfo(null); await loadInformations();
    } catch (e: any) { setMsg('エラー: ' + e.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteInformation(id: number) {
    if (!confirm('削除しますか？')) return;
    const token = await user!.getIdToken();
    await apiFetch(api('deleteInformation'), token, { id });
    setMsg('削除しました'); await loadInformations();
  }

  async function handleAddExcludeUser() {
    if (!newWallet.trim()) return;
    try {
      const token = await user!.getIdToken();
      await apiFetch(api('addExcludeUser'), token, { wallet_address: newWallet.trim() });
      setMsg('追加しました'); setNewWallet(''); await loadExcludeUsers();
    } catch (e: any) { setMsg('エラー: ' + e.message); }
  }

  async function handleDeleteExcludeUser(id: number) {
    if (!confirm('削除しますか？')) return;
    const token = await user!.getIdToken();
    await apiFetch(api('deleteExcludeUser'), token, { id });
    setMsg('削除しました'); await loadExcludeUsers();
  }

  const STATUS_LABELS: Record<number, { label: string; color: string }> = {
    0: { label: 'なし',                   color: '#16a34a' },
    1: { label: 'メンテナンス中',          color: '#dc2626' },
    2: { label: '除外ユーザーのみ除外',    color: '#d97706' },
  };

  if (!user) return (
    <div style={s.center}>
      <div style={s.card}>
        <h1 style={s.title}>Admin ログイン</h1>
        <p style={{ color: '#666', marginBottom: 16 }}>環境: <b>{ENV.toUpperCase()}</b></p>
        <form onSubmit={handleLogin} style={s.form}>
          <input style={s.input} type="email" placeholder="メールアドレス" value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={s.input} type="password" placeholder="パスワード" value={password} onChange={e => setPassword(e.target.value)} required />
          {loginError && <p style={s.error}>{loginError}</p>}
          <button style={s.btnPrimary} type="submit">ログイン</button>
        </form>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>管理画面</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={s.envBadge}>{ENV.toUpperCase()}</span>
          <span style={{ color: '#ccc', fontSize: 14 }}>{user.email}</span>
          <button style={s.btnSecondary} onClick={() => signOut(auth)}>ログアウト</button>
        </div>
      </div>

      {/* タブ */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 0 }}>
        {([['versions', 'バージョン管理'], ['maintenance', 'メンテナンス'], ['excludeUsers', '除外ユーザー'], ['information', 'お知らせ']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: tab === key ? 700 : 400,
            borderBottom: tab === key ? '2px solid #2563eb' : '2px solid transparent',
            color: tab === key ? '#2563eb' : '#6b7280', fontSize: 14,
          }}>{label}</button>
        ))}
      </div>

      <div style={s.container}>
        {msg && <div style={s.msgBox}>{msg}</div>}

        {/* ===== バージョン管理 ===== */}
        {tab === 'versions' && (
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>バージョン一覧</h2>
              <button style={s.btnPrimary} onClick={() => setEditingVer({ platform: 'WEB', version: '1.0.0' })}>+ 追加</button>
            </div>
            <table style={s.table}>
              <thead><tr style={{ background: '#f0f4ff' }}>
                {['プラットフォーム', 'バージョン', 'リリースノート', 'URL', '更新日時', '操作'].map(h => <th key={h} style={s.th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {versions.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#999' }}>データなし</td></tr>}
                {versions.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={s.td}><span style={s.badge}>{v.platform}</span></td>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: 600 }}>{v.version}</td>
                    <td style={{ ...s.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.release_notes || '-'}</td>
                    <td style={s.td}>{v.download_url ? <a href={v.download_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>リンク</a> : '-'}</td>
                    <td style={{ ...s.td, fontSize: 12, color: '#666' }}>{v.updated_at ? new Date(v.updated_at).toLocaleString('ja-JP') : '-'}</td>
                    <td style={s.td}>
                      <button style={{ ...s.btnSecondary, marginRight: 6 }} onClick={() => setEditingVer({ ...v })}>編集</button>
                      <button style={s.btnDanger} onClick={() => handleDeleteVersion(v.platform)}>削除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* バージョンルール */}
            <div style={{ marginTop: 16, padding: 12, background: '#fffbeb', borderRadius: 8, border: '1px solid #fcd34d', fontSize: 13 }}>
              <b>📋 x.y.z ルール：</b>　x↑ = 強制アップデート　／　y↑ = ポップアップ通知　／　z↑ = 通知なし
            </div>
          </div>
        )}

        {/* ===== メンテナンス ===== */}
        {tab === 'maintenance' && (
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>メンテナンス設定</h2>
              <button style={s.btnPrimary} onClick={() => setEditingMnt({ status: 0, message_ja: '', message_en: '', message_ko: '', message_cn: '' })}>+ 新規設定</button>
            </div>
            <div style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 13 }}>
              <b>ステータス説明：</b><br />
              <span style={{ color: '#16a34a' }}>0 = なし（通常稼働）</span>　／　
              <span style={{ color: '#dc2626' }}>1 = メンテナンス中（全員ブロック）</span>　／　
              <span style={{ color: '#d97706' }}>2 = 除外ユーザーのみ通過可能</span>
            </div>
            {maintenances.length === 0
              ? <p style={{ color: '#999', textAlign: 'center', padding: 24 }}>設定なし（通常稼働中）</p>
              : maintenances.map(m => (
                <div key={m.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ padding: '2px 12px', background: STATUS_LABELS[m.status]?.color + '20', color: STATUS_LABELS[m.status]?.color, borderRadius: 20, fontWeight: 700, fontSize: 13 }}>
                      {STATUS_LABELS[m.status]?.label}
                    </span>
                    <button style={s.btnSecondary} onClick={() => setEditingMnt({ ...m })}>編集</button>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, color: '#374151' }}>
                    <div>🇯🇵 {m.message_ja}</div>
                    <div>🇺🇸 {m.message_en}</div>
                    {m.message_ko && <div>🇰🇷 {m.message_ko}</div>}
                    {m.message_cn && <div>🇨🇳 {m.message_cn}</div>}
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ===== 除外ユーザー ===== */}
        {tab === 'excludeUsers' && (
          <div style={s.card}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>除外ユーザー管理</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              メンテナンスステータスが「2」の場合、このリストのウォレットアドレスはメンテナンス画面をスキップできます。
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input style={{ ...s.input, flex: 1 }} placeholder="0x... ウォレットアドレス" value={newWallet} onChange={e => setNewWallet(e.target.value)} />
              <button style={s.btnPrimary} onClick={handleAddExcludeUser}>追加</button>
            </div>
            <table style={s.table}>
              <thead><tr style={{ background: '#f0f4ff' }}>
                {['ウォレットアドレス', '登録日時', '操作'].map(h => <th key={h} style={s.th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {excludeUsers.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24, color: '#999' }}>データなし</td></tr>}
                {excludeUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 13 }}>{u.wallet_address}</td>
                    <td style={{ ...s.td, fontSize: 12, color: '#666' }}>{new Date(u.created_at).toLocaleString('ja-JP')}</td>
                    <td style={s.td}><button style={s.btnDanger} onClick={() => handleDeleteExcludeUser(u.id)}>削除</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* ===== お知らせ管理 ===== */}
        {tab === 'information' && (
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>お知らせ管理</h2>
              <button style={s.btnPrimary} onClick={() => setEditingInfo({ title_ja: '', title_en: '', title_ko: '', title_cn: '', body_ja: '', body_en: '', body_ko: '', body_cn: '', display_start_at: '', display_end_at: '', priority: 0 })}>+ 追加</button>
            </div>
            <table style={s.table}>
              <thead><tr style={{ background: '#f0f4ff' }}>
                {['優先度', 'タイトル（JA）', '表示開始', '表示終了', '操作'].map(h => <th key={h} style={s.th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {informations.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#999' }}>データなし</td></tr>}
                {informations.map(info => (
                  <tr key={info.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ ...s.td, textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>{info.priority}</td>
                    <td style={{ ...s.td, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{info.title_ja}</td>
                    <td style={{ ...s.td, fontSize: 12, color: '#666' }}>{info.display_start_at ? new Date(info.display_start_at).toLocaleString('ja-JP') : '-'}</td>
                    <td style={{ ...s.td, fontSize: 12, color: '#666' }}>{info.display_end_at ? new Date(info.display_end_at).toLocaleString('ja-JP') : '無期限'}</td>
                    <td style={s.td}>
                      <button style={{ ...s.btnSecondary, marginRight: 6 }} onClick={() => setEditingInfo({ ...info, display_start_at: info.display_start_at?.slice(0, 16), display_end_at: info.display_end_at?.slice(0, 16) ?? '' })}>編集</button>
                      <button style={s.btnDanger} onClick={() => handleDeleteInformation(info.id)}>削除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* バージョン編集モーダル */}
      {editingVer && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{editingVer.id ? '編集' : '新規追加'}</h2>
            <form onSubmit={handleSaveVersion} style={s.form}>
              <label style={s.label}>プラットフォーム</label>
              <input style={s.input} value={editingVer.platform} onChange={e => setEditingVer({ ...editingVer, platform: e.target.value.toUpperCase() })} disabled={!!editingVer.id} placeholder="例: LINUX, WIN, MAC" />
              <label style={s.label}>バージョン（x.y.z）</label>
              <input style={s.input} type="text" pattern="\d+\.\d+\.\d+" placeholder="例: 1.2.0" value={editingVer.version || ''} onChange={e => setEditingVer({ ...editingVer, version: e.target.value })} required />
              <label style={s.label}>リリースノート</label>
              <textarea style={{ ...s.input, height: 80, resize: 'vertical' }} value={editingVer.release_notes || ''} onChange={e => setEditingVer({ ...editingVer, release_notes: e.target.value })} />
              <label style={s.label}>ダウンロードURL</label>
              <input style={s.input} type="url" placeholder="https://..." value={editingVer.download_url || ''} onChange={e => setEditingVer({ ...editingVer, download_url: e.target.value })} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button style={s.btnPrimary} type="submit" disabled={saving}>{saving ? '保存中...' : '保存'}</button>
                <button style={s.btnSecondary} type="button" onClick={() => setEditingVer(null)}>キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* お知らせ編集モーダル */}
      {editingInfo && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, width: 560 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{editingInfo.id ? 'お知らせ編集' : 'お知らせ追加'}</h2>
            <form onSubmit={handleSaveInformation} style={s.form}>
              <label style={s.label}>タイトル 🇯🇵 日本語</label>
              <input style={s.input} value={editingInfo.title_ja || ''} onChange={e => setEditingInfo({ ...editingInfo, title_ja: e.target.value })} required />
              <label style={s.label}>タイトル 🇺🇸 英語</label>
              <input style={s.input} value={editingInfo.title_en || ''} onChange={e => setEditingInfo({ ...editingInfo, title_en: e.target.value })} />
              <label style={s.label}>タイトル 🇰🇷 韓国語</label>
              <input style={s.input} value={editingInfo.title_ko || ''} onChange={e => setEditingInfo({ ...editingInfo, title_ko: e.target.value })} />
              <label style={s.label}>タイトル 🇨🇳 中国語</label>
              <input style={s.input} value={editingInfo.title_cn || ''} onChange={e => setEditingInfo({ ...editingInfo, title_cn: e.target.value })} />
              <label style={s.label}>本文 🇯🇵 日本語（HTML可）</label>
              <textarea style={{ ...s.input, height: 100, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }} value={editingInfo.body_ja || ''} onChange={e => setEditingInfo({ ...editingInfo, body_ja: e.target.value })} />
              <label style={s.label}>本文 🇺🇸 英語（HTML可）</label>
              <textarea style={{ ...s.input, height: 100, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }} value={editingInfo.body_en || ''} onChange={e => setEditingInfo({ ...editingInfo, body_en: e.target.value })} />
              <label style={s.label}>本文 🇰🇷 韓国語（HTML可）</label>
              <textarea style={{ ...s.input, height: 100, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }} value={editingInfo.body_ko || ''} onChange={e => setEditingInfo({ ...editingInfo, body_ko: e.target.value })} />
              <label style={s.label}>本文 🇨🇳 中国語（HTML可）</label>
              <textarea style={{ ...s.input, height: 100, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }} value={editingInfo.body_cn || ''} onChange={e => setEditingInfo({ ...editingInfo, body_cn: e.target.value })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={s.label}>表示開始日時</label>
                  <input style={s.input} type="datetime-local" value={editingInfo.display_start_at || ''} onChange={e => setEditingInfo({ ...editingInfo, display_start_at: e.target.value })} required />
                </div>
                <div>
                  <label style={s.label}>表示終了日時（空欄=無期限）</label>
                  <input style={s.input} type="datetime-local" value={editingInfo.display_end_at || ''} onChange={e => setEditingInfo({ ...editingInfo, display_end_at: e.target.value })} />
                </div>
              </div>
              <label style={s.label}>表示優先度（数値が大きいほど上位）</label>
              <input style={s.input} type="number" value={editingInfo.priority ?? 0} onChange={e => setEditingInfo({ ...editingInfo, priority: Number(e.target.value) })} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button style={s.btnPrimary} type="submit" disabled={saving}>{saving ? '保存中...' : '保存'}</button>
                <button style={s.btnSecondary} type="button" onClick={() => setEditingInfo(null)}>キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* メンテナンス編集モーダル */}
      {editingMnt && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>メンテナンス設定</h2>
            <form onSubmit={handleSaveMaintenance} style={s.form}>
              <label style={s.label}>ステータス</label>
              <select style={s.input} value={editingMnt.status} onChange={e => setEditingMnt({ ...editingMnt, status: Number(e.target.value) })}>
                <option value={0}>0 - なし（通常稼働）</option>
                <option value={1}>1 - メンテナンス中（全員ブロック）</option>
                <option value={2}>2 - 除外ユーザーのみ通過可能</option>
              </select>
              <label style={s.label}>メッセージ 🇯🇵 日本語</label>
              <input style={s.input} type="text" value={editingMnt.message_ja || ''} onChange={e => setEditingMnt({ ...editingMnt, message_ja: e.target.value })} required />
              <label style={s.label}>メッセージ 🇺🇸 英語</label>
              <input style={s.input} type="text" value={editingMnt.message_en || ''} onChange={e => setEditingMnt({ ...editingMnt, message_en: e.target.value })} required />
              <label style={s.label}>メッセージ 🇰🇷 韓国語</label>
              <input style={s.input} type="text" value={editingMnt.message_ko || ''} onChange={e => setEditingMnt({ ...editingMnt, message_ko: e.target.value })} />
              <label style={s.label}>メッセージ 🇨🇳 中国語</label>
              <input style={s.input} type="text" value={editingMnt.message_cn || ''} onChange={e => setEditingMnt({ ...editingMnt, message_cn: e.target.value })} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button style={s.btnPrimary} type="submit" disabled={saving}>{saving ? '保存中...' : '保存'}</button>
                <button style={s.btnSecondary} type="button" onClick={() => setEditingMnt(null)}>キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:         { minHeight: '100vh', background: '#f5f5f5' },
  header:       { background: '#1e293b', color: '#fff', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  container:    { maxWidth: 1100, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 },
  center:       { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' },
  card:         { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  title:        { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  form:         { display: 'flex', flexDirection: 'column', gap: 12 },
  label:        { fontSize: 13, fontWeight: 600, color: '#374151' },
  input:        { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, width: '100%' },
  btnPrimary:   { padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  btnSecondary: { padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  btnDanger:    { padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  table:        { width: '100%', borderCollapse: 'collapse' },
  th:           { padding: '10px 12px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151' },
  td:           { padding: '10px 12px', fontSize: 14 },
  badge:        { padding: '2px 10px', background: '#dbeafe', color: '#1d4ed8', borderRadius: 20, fontSize: 13, fontWeight: 600 },
  envBadge:     { padding: '2px 10px', background: ENV === 'prd' ? '#fee2e2' : '#dcfce7', color: ENV === 'prd' ? '#dc2626' : '#16a34a', borderRadius: 20, fontSize: 13, fontWeight: 700 },
  msgBox:       { padding: '10px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, color: '#15803d', fontSize: 14 },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal:        { background: '#fff', borderRadius: 12, padding: 28, width: 480, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' },
  error:        { color: '#dc2626', fontSize: 13 },
};
