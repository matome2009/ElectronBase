import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { signInWithCustomToken, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, ENV, FUNCTIONS_URL } from './firebase';
const suffix = ENV === 'prd' ? 'Prd' : 'Dev';
const api = (name) => `${FUNCTIONS_URL}/${name}${suffix}`;
async function apiFetch(url, token, body) {
    const res = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok)
        throw new Error((await res.json()).error || 'API error');
    return res.json();
}
export default function App() {
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [tab, setTab] = useState('versions');
    const [msg, setMsg] = useState('');
    const [saving, setSaving] = useState(false);
    // versions
    const [versions, setVersions] = useState([]);
    const [editingVer, setEditingVer] = useState(null);
    // maintenance
    const [maintenances, setMaintenances] = useState([]);
    const [editingMnt, setEditingMnt] = useState(null);
    // excludeUsers
    const [excludeUsers, setExcludeUsers] = useState([]);
    const [newWallet, setNewWallet] = useState('');
    // information
    const [informations, setInformations] = useState([]);
    const [editingInfo, setEditingInfo] = useState(null);
    useEffect(() => onAuthStateChanged(auth, setUser), []);
    useEffect(() => { if (user) {
        loadVersions();
        loadMaintenances();
        loadExcludeUsers();
        loadInformations();
    } }, [user]);
    async function loadVersions() {
        const res = await fetch(api('getVersions'));
        const data = await res.json();
        setVersions(data.versions ?? []);
    }
    async function loadMaintenances() {
        try {
            const token = await user.getIdToken();
            const d = await apiFetch(api('getMaintenanceAll'), token);
            setMaintenances(d.records ?? []);
        }
        catch {
            setMaintenances([]);
        }
    }
    async function loadExcludeUsers() {
        try {
            const token = await user.getIdToken();
            const data = await apiFetch(api('getExcludeUsers'), token);
            setExcludeUsers(data.users ?? []);
        }
        catch {
            setExcludeUsers([]);
        }
    }
    async function loadInformations() {
        try {
            const token = await user.getIdToken();
            const data = await apiFetch(api('getInformationAll'), token);
            setInformations(data.records ?? []);
        }
        catch {
            setInformations([]);
        }
    }
    async function handleLogin(e) {
        e.preventDefault();
        setLoginError('');
        try {
            const res = await fetch(api('adminLogin'), {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mail_address: email, password }),
            });
            if (!res.ok)
                throw new Error();
            const { customToken } = await res.json();
            await signInWithCustomToken(auth, customToken);
        }
        catch {
            setLoginError('メールアドレスまたはパスワードが違います');
        }
    }
    async function handleSaveVersion(e) {
        e.preventDefault();
        if (!editingVer)
            return;
        setSaving(true);
        setMsg('');
        try {
            const token = await user.getIdToken();
            await apiFetch(api('upsertVersion'), token, editingVer);
            setMsg('保存しました');
            setEditingVer(null);
            await loadVersions();
        }
        catch (e) {
            setMsg('エラー: ' + e.message);
        }
        finally {
            setSaving(false);
        }
    }
    async function handleDeleteVersion(platform) {
        if (!confirm(`${platform} を削除しますか？`))
            return;
        const token = await user.getIdToken();
        await apiFetch(api('deleteVersion'), token, { platform });
        setMsg('削除しました');
        await loadVersions();
    }
    async function handleSaveMaintenance(e) {
        e.preventDefault();
        if (!editingMnt)
            return;
        setSaving(true);
        setMsg('');
        try {
            const token = await user.getIdToken();
            await apiFetch(api('upsertMaintenance'), token, editingMnt);
            setMsg('保存しました');
            setEditingMnt(null);
            await loadMaintenances();
        }
        catch (e) {
            setMsg('エラー: ' + e.message);
        }
        finally {
            setSaving(false);
        }
    }
    async function handleSaveInformation(e) {
        e.preventDefault();
        if (!editingInfo)
            return;
        setSaving(true);
        setMsg('');
        try {
            const token = await user.getIdToken();
            await apiFetch(api('upsertInformation'), token, editingInfo);
            setMsg('保存しました');
            setEditingInfo(null);
            await loadInformations();
        }
        catch (e) {
            setMsg('エラー: ' + e.message);
        }
        finally {
            setSaving(false);
        }
    }
    async function handleDeleteInformation(id) {
        if (!confirm('削除しますか？'))
            return;
        const token = await user.getIdToken();
        await apiFetch(api('deleteInformation'), token, { id });
        setMsg('削除しました');
        await loadInformations();
    }
    async function handleAddExcludeUser() {
        if (!newWallet.trim())
            return;
        try {
            const token = await user.getIdToken();
            await apiFetch(api('addExcludeUser'), token, { wallet_address: newWallet.trim() });
            setMsg('追加しました');
            setNewWallet('');
            await loadExcludeUsers();
        }
        catch (e) {
            setMsg('エラー: ' + e.message);
        }
    }
    async function handleDeleteExcludeUser(id) {
        if (!confirm('削除しますか？'))
            return;
        const token = await user.getIdToken();
        await apiFetch(api('deleteExcludeUser'), token, { id });
        setMsg('削除しました');
        await loadExcludeUsers();
    }
    const STATUS_LABELS = {
        0: { label: 'なし', color: '#16a34a' },
        1: { label: 'メンテナンス中', color: '#dc2626' },
        2: { label: '除外ユーザーのみ除外', color: '#d97706' },
    };
    if (!user)
        return (_jsx("div", { style: s.center, children: _jsxs("div", { style: s.card, children: [_jsx("h1", { style: s.title, children: "Admin \u30ED\u30B0\u30A4\u30F3" }), _jsxs("p", { style: { color: '#666', marginBottom: 16 }, children: ["\u74B0\u5883: ", _jsx("b", { children: ENV.toUpperCase() })] }), _jsxs("form", { onSubmit: handleLogin, style: s.form, children: [_jsx("input", { style: s.input, type: "email", placeholder: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9", value: email, onChange: e => setEmail(e.target.value), required: true }), _jsx("input", { style: s.input, type: "password", placeholder: "\u30D1\u30B9\u30EF\u30FC\u30C9", value: password, onChange: e => setPassword(e.target.value), required: true }), loginError && _jsx("p", { style: s.error, children: loginError }), _jsx("button", { style: s.btnPrimary, type: "submit", children: "\u30ED\u30B0\u30A4\u30F3" })] })] }) }));
    return (_jsxs("div", { style: s.page, children: [_jsxs("div", { style: s.header, children: [_jsx("h1", { style: { fontSize: 20, fontWeight: 700 }, children: "\u7BA1\u7406\u753B\u9762" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("span", { style: s.envBadge, children: ENV.toUpperCase() }), _jsx("span", { style: { color: '#ccc', fontSize: 14 }, children: user.email }), _jsx("button", { style: s.btnSecondary, onClick: () => signOut(auth), children: "\u30ED\u30B0\u30A2\u30A6\u30C8" })] })] }), _jsx("div", { style: { background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 0 }, children: [['versions', 'バージョン管理'], ['maintenance', 'メンテナンス'], ['excludeUsers', '除外ユーザー'], ['information', 'お知らせ']].map(([key, label]) => (_jsx("button", { onClick: () => setTab(key), style: {
                        padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer',
                        fontWeight: tab === key ? 700 : 400,
                        borderBottom: tab === key ? '2px solid #2563eb' : '2px solid transparent',
                        color: tab === key ? '#2563eb' : '#6b7280', fontSize: 14,
                    }, children: label }, key))) }), _jsxs("div", { style: s.container, children: [msg && _jsx("div", { style: s.msgBox, children: msg }), tab === 'versions' && (_jsxs("div", { style: s.card, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, children: [_jsx("h2", { style: { fontSize: 16, fontWeight: 600 }, children: "\u30D0\u30FC\u30B8\u30E7\u30F3\u4E00\u89A7" }), _jsx("button", { style: s.btnPrimary, onClick: () => setEditingVer({ platform: 'WEB', version: '1.0.0' }), children: "+ \u8FFD\u52A0" })] }), _jsxs("table", { style: s.table, children: [_jsx("thead", { children: _jsx("tr", { style: { background: '#f0f4ff' }, children: ['プラットフォーム', 'バージョン', 'リリースノート', 'URL', '更新日時', '操作'].map(h => _jsx("th", { style: s.th, children: h }, h)) }) }), _jsxs("tbody", { children: [versions.length === 0 && _jsx("tr", { children: _jsx("td", { colSpan: 6, style: { textAlign: 'center', padding: 24, color: '#999' }, children: "\u30C7\u30FC\u30BF\u306A\u3057" }) }), versions.map(v => (_jsxs("tr", { style: { borderBottom: '1px solid #eee' }, children: [_jsx("td", { style: s.td, children: _jsx("span", { style: s.badge, children: v.platform }) }), _jsx("td", { style: { ...s.td, fontFamily: 'monospace', fontWeight: 600 }, children: v.version }), _jsx("td", { style: { ...s.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: v.release_notes || '-' }), _jsx("td", { style: s.td, children: v.download_url ? _jsx("a", { href: v.download_url, target: "_blank", rel: "noreferrer", style: { color: '#2563eb' }, children: "\u30EA\u30F3\u30AF" }) : '-' }), _jsx("td", { style: { ...s.td, fontSize: 12, color: '#666' }, children: v.updated_at ? new Date(v.updated_at).toLocaleString('ja-JP') : '-' }), _jsxs("td", { style: s.td, children: [_jsx("button", { style: { ...s.btnSecondary, marginRight: 6 }, onClick: () => setEditingVer({ ...v }), children: "\u7DE8\u96C6" }), _jsx("button", { style: s.btnDanger, onClick: () => handleDeleteVersion(v.platform), children: "\u524A\u9664" })] })] }, v.id)))] })] }), _jsxs("div", { style: { marginTop: 16, padding: 12, background: '#fffbeb', borderRadius: 8, border: '1px solid #fcd34d', fontSize: 13 }, children: [_jsx("b", { children: "\uD83D\uDCCB x.y.z \u30EB\u30FC\u30EB\uFF1A" }), "\u3000x\u2191 = \u5F37\u5236\u30A2\u30C3\u30D7\u30C7\u30FC\u30C8\u3000\uFF0F\u3000y\u2191 = \u30DD\u30C3\u30D7\u30A2\u30C3\u30D7\u901A\u77E5\u3000\uFF0F\u3000z\u2191 = \u901A\u77E5\u306A\u3057"] })] })), tab === 'maintenance' && (_jsxs("div", { style: s.card, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, children: [_jsx("h2", { style: { fontSize: 16, fontWeight: 600 }, children: "\u30E1\u30F3\u30C6\u30CA\u30F3\u30B9\u8A2D\u5B9A" }), _jsx("button", { style: s.btnPrimary, onClick: () => setEditingMnt({ status: 0, message_ja: '', message_en: '', message_ko: '', message_cn: '' }), children: "+ \u65B0\u898F\u8A2D\u5B9A" })] }), _jsxs("div", { style: { marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 13 }, children: [_jsx("b", { children: "\u30B9\u30C6\u30FC\u30BF\u30B9\u8AAC\u660E\uFF1A" }), _jsx("br", {}), _jsx("span", { style: { color: '#16a34a' }, children: "0 = \u306A\u3057\uFF08\u901A\u5E38\u7A3C\u50CD\uFF09" }), "\u3000\uFF0F", _jsx("span", { style: { color: '#dc2626' }, children: "1 = \u30E1\u30F3\u30C6\u30CA\u30F3\u30B9\u4E2D\uFF08\u5168\u54E1\u30D6\u30ED\u30C3\u30AF\uFF09" }), "\u3000\uFF0F", _jsx("span", { style: { color: '#d97706' }, children: "2 = \u9664\u5916\u30E6\u30FC\u30B6\u30FC\u306E\u307F\u901A\u904E\u53EF\u80FD" })] }), maintenances.length === 0
                                ? _jsx("p", { style: { color: '#999', textAlign: 'center', padding: 24 }, children: "\u8A2D\u5B9A\u306A\u3057\uFF08\u901A\u5E38\u7A3C\u50CD\u4E2D\uFF09" })
                                : maintenances.map(m => (_jsxs("div", { style: { border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 8 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { padding: '2px 12px', background: STATUS_LABELS[m.status]?.color + '20', color: STATUS_LABELS[m.status]?.color, borderRadius: 20, fontWeight: 700, fontSize: 13 }, children: STATUS_LABELS[m.status]?.label }), _jsx("button", { style: s.btnSecondary, onClick: () => setEditingMnt({ ...m }), children: "\u7DE8\u96C6" })] }), _jsxs("div", { style: { marginTop: 8, fontSize: 13, color: '#374151' }, children: [_jsxs("div", { children: ["\uD83C\uDDEF\uD83C\uDDF5 ", m.message_ja] }), _jsxs("div", { children: ["\uD83C\uDDFA\uD83C\uDDF8 ", m.message_en] }), m.message_ko && _jsxs("div", { children: ["\uD83C\uDDF0\uD83C\uDDF7 ", m.message_ko] }), m.message_cn && _jsxs("div", { children: ["\uD83C\uDDE8\uD83C\uDDF3 ", m.message_cn] })] })] }, m.id)))] })), tab === 'excludeUsers' && (_jsxs("div", { style: s.card, children: [_jsx("h2", { style: { fontSize: 16, fontWeight: 600, marginBottom: 16 }, children: "\u9664\u5916\u30E6\u30FC\u30B6\u30FC\u7BA1\u7406" }), _jsx("p", { style: { fontSize: 13, color: '#6b7280', marginBottom: 16 }, children: "\u30E1\u30F3\u30C6\u30CA\u30F3\u30B9\u30B9\u30C6\u30FC\u30BF\u30B9\u304C\u300C2\u300D\u306E\u5834\u5408\u3001\u3053\u306E\u30EA\u30B9\u30C8\u306E\u30A6\u30A9\u30EC\u30C3\u30C8\u30A2\u30C9\u30EC\u30B9\u306F\u30E1\u30F3\u30C6\u30CA\u30F3\u30B9\u753B\u9762\u3092\u30B9\u30AD\u30C3\u30D7\u3067\u304D\u307E\u3059\u3002" }), _jsxs("div", { style: { display: 'flex', gap: 8, marginBottom: 16 }, children: [_jsx("input", { style: { ...s.input, flex: 1 }, placeholder: "0x... \u30A6\u30A9\u30EC\u30C3\u30C8\u30A2\u30C9\u30EC\u30B9", value: newWallet, onChange: e => setNewWallet(e.target.value) }), _jsx("button", { style: s.btnPrimary, onClick: handleAddExcludeUser, children: "\u8FFD\u52A0" })] }), _jsxs("table", { style: s.table, children: [_jsx("thead", { children: _jsx("tr", { style: { background: '#f0f4ff' }, children: ['ウォレットアドレス', '登録日時', '操作'].map(h => _jsx("th", { style: s.th, children: h }, h)) }) }), _jsxs("tbody", { children: [excludeUsers.length === 0 && _jsx("tr", { children: _jsx("td", { colSpan: 3, style: { textAlign: 'center', padding: 24, color: '#999' }, children: "\u30C7\u30FC\u30BF\u306A\u3057" }) }), excludeUsers.map(u => (_jsxs("tr", { style: { borderBottom: '1px solid #eee' }, children: [_jsx("td", { style: { ...s.td, fontFamily: 'monospace', fontSize: 13 }, children: u.wallet_address }), _jsx("td", { style: { ...s.td, fontSize: 12, color: '#666' }, children: new Date(u.created_at).toLocaleString('ja-JP') }), _jsx("td", { style: s.td, children: _jsx("button", { style: s.btnDanger, onClick: () => handleDeleteExcludeUser(u.id), children: "\u524A\u9664" }) })] }, u.id)))] })] })] })), tab === 'information' && (_jsxs("div", { style: s.card, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, children: [_jsx("h2", { style: { fontSize: 16, fontWeight: 600 }, children: "\u304A\u77E5\u3089\u305B\u7BA1\u7406" }), _jsx("button", { style: s.btnPrimary, onClick: () => setEditingInfo({ title_ja: '', title_en: '', title_ko: '', title_cn: '', body_ja: '', body_en: '', body_ko: '', body_cn: '', display_start_at: '', display_end_at: '', priority: 0 }), children: "+ \u8FFD\u52A0" })] }), _jsxs("table", { style: s.table, children: [_jsx("thead", { children: _jsx("tr", { style: { background: '#f0f4ff' }, children: ['優先度', 'タイトル（JA）', '表示開始', '表示終了', '操作'].map(h => _jsx("th", { style: s.th, children: h }, h)) }) }), _jsxs("tbody", { children: [informations.length === 0 && _jsx("tr", { children: _jsx("td", { colSpan: 5, style: { textAlign: 'center', padding: 24, color: '#999' }, children: "\u30C7\u30FC\u30BF\u306A\u3057" }) }), informations.map(info => (_jsxs("tr", { style: { borderBottom: '1px solid #eee' }, children: [_jsx("td", { style: { ...s.td, textAlign: 'center', fontWeight: 700, color: '#2563eb' }, children: info.priority }), _jsx("td", { style: { ...s.td, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: info.title_ja }), _jsx("td", { style: { ...s.td, fontSize: 12, color: '#666' }, children: info.display_start_at ? new Date(info.display_start_at).toLocaleString('ja-JP') : '-' }), _jsx("td", { style: { ...s.td, fontSize: 12, color: '#666' }, children: info.display_end_at ? new Date(info.display_end_at).toLocaleString('ja-JP') : '無期限' }), _jsxs("td", { style: s.td, children: [_jsx("button", { style: { ...s.btnSecondary, marginRight: 6 }, onClick: () => setEditingInfo({ ...info, display_start_at: info.display_start_at?.slice(0, 16), display_end_at: info.display_end_at?.slice(0, 16) ?? '' }), children: "\u7DE8\u96C6" }), _jsx("button", { style: s.btnDanger, onClick: () => handleDeleteInformation(info.id), children: "\u524A\u9664" })] })] }, info.id)))] })] })] }))] }), editingVer && (_jsx("div", { style: s.overlay, children: _jsxs("div", { style: s.modal, children: [_jsx("h2", { style: { fontSize: 18, fontWeight: 700, marginBottom: 20 }, children: editingVer.id ? '編集' : '新規追加' }), _jsxs("form", { onSubmit: handleSaveVersion, style: s.form, children: [_jsx("label", { style: s.label, children: "\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0" }), _jsx("input", { style: s.input, value: editingVer.platform, onChange: e => setEditingVer({ ...editingVer, platform: e.target.value.toUpperCase() }), disabled: !!editingVer.id, placeholder: "\u4F8B: LINUX, WIN, MAC" }), _jsx("label", { style: s.label, children: "\u30D0\u30FC\u30B8\u30E7\u30F3\uFF08x.y.z\uFF09" }), _jsx("input", { style: s.input, type: "text", pattern: "\\d+\\.\\d+\\.\\d+", placeholder: "\u4F8B: 1.2.0", value: editingVer.version || '', onChange: e => setEditingVer({ ...editingVer, version: e.target.value }), required: true }), _jsx("label", { style: s.label, children: "\u30EA\u30EA\u30FC\u30B9\u30CE\u30FC\u30C8" }), _jsx("textarea", { style: { ...s.input, height: 80, resize: 'vertical' }, value: editingVer.release_notes || '', onChange: e => setEditingVer({ ...editingVer, release_notes: e.target.value }) }), _jsx("label", { style: s.label, children: "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9URL" }), _jsx("input", { style: s.input, type: "url", placeholder: "https://...", value: editingVer.download_url || '', onChange: e => setEditingVer({ ...editingVer, download_url: e.target.value }) }), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 8 }, children: [_jsx("button", { style: s.btnPrimary, type: "submit", disabled: saving, children: saving ? '保存中...' : '保存' }), _jsx("button", { style: s.btnSecondary, type: "button", onClick: () => setEditingVer(null), children: "\u30AD\u30E3\u30F3\u30BB\u30EB" })] })] })] }) })), editingInfo && (_jsx("div", { style: s.overlay, children: _jsxs("div", { style: { ...s.modal, width: 560 }, children: [_jsx("h2", { style: { fontSize: 18, fontWeight: 700, marginBottom: 20 }, children: editingInfo.id ? 'お知らせ編集' : 'お知らせ追加' }), _jsxs("form", { onSubmit: handleSaveInformation, style: s.form, children: [_jsx("label", { style: s.label, children: "\u30BF\u30A4\u30C8\u30EB \uD83C\uDDEF\uD83C\uDDF5 \u65E5\u672C\u8A9E" }), _jsx("input", { style: s.input, value: editingInfo.title_ja || '', onChange: e => setEditingInfo({ ...editingInfo, title_ja: e.target.value }), required: true }), _jsx("label", { style: s.label, children: "\u30BF\u30A4\u30C8\u30EB \uD83C\uDDFA\uD83C\uDDF8 \u82F1\u8A9E" }), _jsx("input", { style: s.input, value: editingInfo.title_en || '', onChange: e => setEditingInfo({ ...editingInfo, title_en: e.target.value }) }), _jsx("label", { style: s.label, children: "\u30BF\u30A4\u30C8\u30EB \uD83C\uDDF0\uD83C\uDDF7 \u97D3\u56FD\u8A9E" }), _jsx("input", { style: s.input, value: editingInfo.title_ko || '', onChange: e => setEditingInfo({ ...editingInfo, title_ko: e.target.value }) }), _jsx("label", { style: s.label, children: "\u30BF\u30A4\u30C8\u30EB \uD83C\uDDE8\uD83C\uDDF3 \u4E2D\u56FD\u8A9E" }), _jsx("input", { style: s.input, value: editingInfo.title_cn || '', onChange: e => setEditingInfo({ ...editingInfo, title_cn: e.target.value }) }), _jsx("label", { style: s.label, children: "\u672C\u6587 \uD83C\uDDEF\uD83C\uDDF5 \u65E5\u672C\u8A9E\uFF08HTML\u53EF\uFF09" }), _jsx("textarea", { style: { ...s.input, height: 100, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }, value: editingInfo.body_ja || '', onChange: e => setEditingInfo({ ...editingInfo, body_ja: e.target.value }) }), _jsx("label", { style: s.label, children: "\u672C\u6587 \uD83C\uDDFA\uD83C\uDDF8 \u82F1\u8A9E\uFF08HTML\u53EF\uFF09" }), _jsx("textarea", { style: { ...s.input, height: 100, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }, value: editingInfo.body_en || '', onChange: e => setEditingInfo({ ...editingInfo, body_en: e.target.value }) }), _jsx("label", { style: s.label, children: "\u672C\u6587 \uD83C\uDDF0\uD83C\uDDF7 \u97D3\u56FD\u8A9E\uFF08HTML\u53EF\uFF09" }), _jsx("textarea", { style: { ...s.input, height: 100, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }, value: editingInfo.body_ko || '', onChange: e => setEditingInfo({ ...editingInfo, body_ko: e.target.value }) }), _jsx("label", { style: s.label, children: "\u672C\u6587 \uD83C\uDDE8\uD83C\uDDF3 \u4E2D\u56FD\u8A9E\uFF08HTML\u53EF\uFF09" }), _jsx("textarea", { style: { ...s.input, height: 100, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }, value: editingInfo.body_cn || '', onChange: e => setEditingInfo({ ...editingInfo, body_cn: e.target.value }) }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }, children: [_jsxs("div", { children: [_jsx("label", { style: s.label, children: "\u8868\u793A\u958B\u59CB\u65E5\u6642" }), _jsx("input", { style: s.input, type: "datetime-local", value: editingInfo.display_start_at || '', onChange: e => setEditingInfo({ ...editingInfo, display_start_at: e.target.value }), required: true })] }), _jsxs("div", { children: [_jsx("label", { style: s.label, children: "\u8868\u793A\u7D42\u4E86\u65E5\u6642\uFF08\u7A7A\u6B04=\u7121\u671F\u9650\uFF09" }), _jsx("input", { style: s.input, type: "datetime-local", value: editingInfo.display_end_at || '', onChange: e => setEditingInfo({ ...editingInfo, display_end_at: e.target.value }) })] })] }), _jsx("label", { style: s.label, children: "\u8868\u793A\u512A\u5148\u5EA6\uFF08\u6570\u5024\u304C\u5927\u304D\u3044\u307B\u3069\u4E0A\u4F4D\uFF09" }), _jsx("input", { style: s.input, type: "number", value: editingInfo.priority ?? 0, onChange: e => setEditingInfo({ ...editingInfo, priority: Number(e.target.value) }) }), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 8 }, children: [_jsx("button", { style: s.btnPrimary, type: "submit", disabled: saving, children: saving ? '保存中...' : '保存' }), _jsx("button", { style: s.btnSecondary, type: "button", onClick: () => setEditingInfo(null), children: "\u30AD\u30E3\u30F3\u30BB\u30EB" })] })] })] }) })), editingMnt && (_jsx("div", { style: s.overlay, children: _jsxs("div", { style: s.modal, children: [_jsx("h2", { style: { fontSize: 18, fontWeight: 700, marginBottom: 20 }, children: "\u30E1\u30F3\u30C6\u30CA\u30F3\u30B9\u8A2D\u5B9A" }), _jsxs("form", { onSubmit: handleSaveMaintenance, style: s.form, children: [_jsx("label", { style: s.label, children: "\u30B9\u30C6\u30FC\u30BF\u30B9" }), _jsxs("select", { style: s.input, value: editingMnt.status, onChange: e => setEditingMnt({ ...editingMnt, status: Number(e.target.value) }), children: [_jsx("option", { value: 0, children: "0 - \u306A\u3057\uFF08\u901A\u5E38\u7A3C\u50CD\uFF09" }), _jsx("option", { value: 1, children: "1 - \u30E1\u30F3\u30C6\u30CA\u30F3\u30B9\u4E2D\uFF08\u5168\u54E1\u30D6\u30ED\u30C3\u30AF\uFF09" }), _jsx("option", { value: 2, children: "2 - \u9664\u5916\u30E6\u30FC\u30B6\u30FC\u306E\u307F\u901A\u904E\u53EF\u80FD" })] }), _jsx("label", { style: s.label, children: "\u30E1\u30C3\u30BB\u30FC\u30B8 \uD83C\uDDEF\uD83C\uDDF5 \u65E5\u672C\u8A9E" }), _jsx("input", { style: s.input, type: "text", value: editingMnt.message_ja || '', onChange: e => setEditingMnt({ ...editingMnt, message_ja: e.target.value }), required: true }), _jsx("label", { style: s.label, children: "\u30E1\u30C3\u30BB\u30FC\u30B8 \uD83C\uDDFA\uD83C\uDDF8 \u82F1\u8A9E" }), _jsx("input", { style: s.input, type: "text", value: editingMnt.message_en || '', onChange: e => setEditingMnt({ ...editingMnt, message_en: e.target.value }), required: true }), _jsx("label", { style: s.label, children: "\u30E1\u30C3\u30BB\u30FC\u30B8 \uD83C\uDDF0\uD83C\uDDF7 \u97D3\u56FD\u8A9E" }), _jsx("input", { style: s.input, type: "text", value: editingMnt.message_ko || '', onChange: e => setEditingMnt({ ...editingMnt, message_ko: e.target.value }) }), _jsx("label", { style: s.label, children: "\u30E1\u30C3\u30BB\u30FC\u30B8 \uD83C\uDDE8\uD83C\uDDF3 \u4E2D\u56FD\u8A9E" }), _jsx("input", { style: s.input, type: "text", value: editingMnt.message_cn || '', onChange: e => setEditingMnt({ ...editingMnt, message_cn: e.target.value }) }), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 8 }, children: [_jsx("button", { style: s.btnPrimary, type: "submit", disabled: saving, children: saving ? '保存中...' : '保存' }), _jsx("button", { style: s.btnSecondary, type: "button", onClick: () => setEditingMnt(null), children: "\u30AD\u30E3\u30F3\u30BB\u30EB" })] })] })] }) }))] }));
}
const s = {
    page: { minHeight: '100vh', background: '#f5f5f5' },
    header: { background: '#1e293b', color: '#fff', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    container: { maxWidth: 1100, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 },
    center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' },
    card: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
    title: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
    form: { display: 'flex', flexDirection: 'column', gap: 12 },
    label: { fontSize: 13, fontWeight: 600, color: '#374151' },
    input: { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, width: '100%' },
    btnPrimary: { padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    btnSecondary: { padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
    btnDanger: { padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '10px 12px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151' },
    td: { padding: '10px 12px', fontSize: 14 },
    badge: { padding: '2px 10px', background: '#dbeafe', color: '#1d4ed8', borderRadius: 20, fontSize: 13, fontWeight: 600 },
    envBadge: { padding: '2px 10px', background: ENV === 'prd' ? '#fee2e2' : '#dcfce7', color: ENV === 'prd' ? '#dc2626' : '#16a34a', borderRadius: 20, fontSize: 13, fontWeight: 700 },
    msgBox: { padding: '10px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, color: '#15803d', fontSize: 14 },
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    modal: { background: '#fff', borderRadius: 12, padding: 28, width: 480, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' },
    error: { color: '#dc2626', fontSize: 13 },
};
