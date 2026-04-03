import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ContactService } from '../services/ContactService';
import { LoggingService } from '../../services/LoggingService';
import { Contact } from '../../models/index';
import { useContactsController } from '../controllers/useContactsController';

// ============================================================
// ユーティリティ
// ============================================================

function shortenAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ============================================================
// コンタクト追加・編集フォーム
// ============================================================

interface ContactFormProps {
  initial?: Contact;
  onSave: (contact: Contact) => void;
  onCancel: () => void;
}

const ContactForm: React.FC<ContactFormProps> = ({ initial, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [address, setAddress] = useState(initial?.address ?? '');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!address.trim() || !label.trim()) {
      setError(t('contacts.addressAndNameRequired'));
      return;
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(address.trim())) {
      setError(t('contacts.addressInvalid'));
      return;
    }

    setLoading(true);
    try {
      if (initial) {
        await ContactService.updateContact(initial.id, label.trim(), description.trim() || null);
        onSave({ ...initial, label: label.trim(), description: description.trim() || null });
      } else {
        const created = await ContactService.addContact(
          address.trim().toLowerCase(),
          label.trim(),
          description.trim() || undefined,
        );
        onSave(created);
      }
    } catch (err) {
      LoggingService.error('ContactForm submit error', { err });
      setError(err instanceof Error ? err.message : t('contacts.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {t('contacts.walletAddress')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="0x..."
          disabled={!!initial}
          className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {t('contacts.name')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t('contacts.namePlaceholder')}
          maxLength={100}
          autoFocus
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {t('contacts.memo')} <span className="text-gray-400 font-normal">{t('contacts.optional')}</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('contacts.descPlaceholder')}
          maxLength={500}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? t('contacts.saving') : initial ? t('common.update') : t('common.add')}
        </button>
      </div>
    </form>
  );
};

// ============================================================
// ContactsView（メイン）
// ============================================================

const ContactsView: React.FC = () => {
  const { t } = useTranslation();
  const {
    contacts, loading, showAddForm, editingContact, deleteConfirm, deleteLoading,
    searchQuery, csvImporting, csvResult, csvInputRef,
    setShowAddForm, setEditingContact, setDeleteConfirm, setSearchQuery, setCsvResult,
    filtered,
    handleSaved, handleDelete, handleExportCsv, handleDownloadTemplate, handleCsvImport,
  } = useContactsController();

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('contacts.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('contacts.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {contacts.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              title={t('contacts.csvExportTitle')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t('contacts.csvExport')}
            </button>
          )}
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
            title={t('contacts.csvTemplateTitle')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('contacts.template')}
          </button>
          <button
            onClick={() => csvInputRef.current?.click()}
            disabled={csvImporting}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            title={t('contacts.csvImportTitle')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {csvImporting ? t('contacts.importing') : t('contacts.csvInput')}
          </button>
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          <button
            onClick={() => { setShowAddForm(true); setEditingContact(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('common.add')}
          </button>
        </div>
      </div>

      {/* CSV インポート結果 */}
      {csvResult && (
        <div className={`rounded-xl p-4 text-sm ${csvResult.errors.length === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`font-semibold ${csvResult.errors.length === 0 ? 'text-green-800' : 'text-yellow-800'}`}>
              {t('contacts.importComplete', { count: csvResult.success })}
              {csvResult.errors.length > 0 && t('contacts.importSkipped', { count: csvResult.errors.length })}
            </p>
            <button onClick={() => setCsvResult(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>
          {csvResult.errors.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {csvResult.errors.map((e, i) => (
                <li key={i} className="text-yellow-700 text-xs">{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 追加フォーム */}
      {showAddForm && !editingContact && (
        <div className="border border-blue-200 bg-blue-50 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-800 mb-3">{t('contacts.newContact')}</p>
          <ContactForm
            onSave={handleSaved}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* 検索 */}
      {contacts.length > 0 && (
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('contacts.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* コンタクトリスト */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm text-gray-400 mb-2">{t('contacts.noContacts')}</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {t('contacts.addFirst')}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">{t('contacts.noResults', { query: searchQuery })}</p>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
          {filtered.map((contact) => (
            <div key={contact.id}>
              {editingContact?.id === contact.id ? (
                <div className="p-4 bg-blue-50">
                  <p className="text-sm font-semibold text-blue-800 mb-3">{t('common.edit')}</p>
                  <ContactForm
                    initial={contact}
                    onSave={handleSaved}
                    onCancel={() => setEditingContact(null)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  {/* アバター */}
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-blue-700">
                    {contact.label.charAt(0).toUpperCase()}
                  </div>
                  {/* 情報 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{contact.label}</p>
                    <p className="text-xs font-mono text-gray-400 truncate">{shortenAddress(contact.address)}</p>
                    {contact.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{contact.description}</p>
                    )}
                  </div>
                  {/* アクション */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setEditingContact(contact); setShowAddForm(false); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title={t('common.edit')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(contact)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"
                      title={t('common.delete')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">{t('contacts.deleteTitle')}</h2>
            <p className="text-sm text-gray-600 mb-4">
              {t('contacts.deleteConfirm', { label: deleteConfirm.label, address: shortenAddress(deleteConfirm.address) })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? t('contacts.deleting') : t('contacts.deleteButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsView;
