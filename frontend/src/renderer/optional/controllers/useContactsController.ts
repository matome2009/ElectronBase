import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ContactService } from '../services/ContactService';
import { LoggingService } from '../../services/LoggingService';
import { Contact } from '../../models/index';

export function useContactsController() {
  const { t, i18n } = useTranslation();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Contact | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<{ success: number; errors: string[] } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const list = await ContactService.getContacts();
      setContacts(list);
    } catch (err) {
      LoggingService.error('ContactsController loadContacts error', { err });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const handleSaved = (contact: Contact) => {
    setContacts((prev) => {
      const without = prev.filter((c) => c.id !== contact.id);
      return [...without, contact].sort((a, b) => a.label.localeCompare(b.label, 'ja'));
    });
    setShowAddForm(false);
    setEditingContact(null);
  };

  const handleDelete = async (contact: Contact) => {
    setDeleteLoading(true);
    try {
      await ContactService.deleteContact(contact.id);
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      setDeleteConfirm(null);
    } catch (err) {
      LoggingService.error('ContactsController handleDelete error', { err });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExportCsv = () => {
    const language = i18n.resolvedLanguage ?? i18n.language ?? 'en';
    const locale = language.startsWith('ja')
      ? 'ja-JP'
      : language.startsWith('ko')
        ? 'ko-KR'
        : language.startsWith('zh')
          ? 'zh-CN'
          : 'en-US';
    const escapeCsv = (value: string) => (
      value.includes(',') || value.includes('"') || value.includes('\n')
        ? `"${value.replace(/"/g, '""')}"`
        : value
    );

    const header = [
      t('contacts.csvAddress'),
      t('contacts.csvLabel'),
      t('contacts.csvDescription'),
      t('contacts.csvRegisteredAt'),
    ].join(',');
    const rows = contacts.map((c) => {
      const registeredAt = new Date(c.createdAt).toLocaleString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      return [
        c.address,
        escapeCsv(c.label),
        escapeCsv(c.description ?? ''),
        escapeCsv(registeredAt),
      ].join(',');
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet_contacts_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = () => {
    const csv = 'address,label,description\n0x0000000000000000000000000000000000000001,加藤,田中工務店 / 080-xxxx-xxxx\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wallet_contacts_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return;
    const dataLines = lines[0].toLowerCase().startsWith('address') ? lines.slice(1) : lines;
    setCsvImporting(true);
    setCsvResult(null);
    let success = 0;
    const errors: string[] = [];
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;
      const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g)?.map((c) => c.replace(/^"|"$/g, '').trim()) ?? line.split(',').map((c) => c.trim());
      const [address, label, description] = cols;
      const rowNum = i + (lines[0].toLowerCase().startsWith('address') ? 2 : 1);
      if (!address || !label) {
        errors.push(t('contacts.csvRowRequired', { row: rowNum }));
        continue;
      }
      if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
        errors.push(t('contacts.csvRowInvalidAddress', { row: rowNum, address }));
        continue;
      }
      try {
        const created = await ContactService.addContact(address.toLowerCase(), label, description || undefined);
        setContacts((prev) => {
          const without = prev.filter((c) => c.id !== created.id);
          return [...without, created].sort((a, b) => a.label.localeCompare(b.label, 'ja'));
        });
        success++;
      } catch (err) {
        errors.push(`${label}: ${err instanceof Error ? err.message : t('contacts.registerFailed')}`);
      }
    }
    setCsvImporting(false);
    setCsvResult({ success, errors });
  };

  // フィルタリング
  const filtered = contacts.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.label.toLowerCase().includes(q) ||
      c.address.includes(q) ||
      (c.description?.toLowerCase().includes(q) ?? false)
    );
  });

  return {
    // State
    contacts,
    loading,
    showAddForm,
    editingContact,
    deleteConfirm,
    deleteLoading,
    searchQuery,
    csvImporting,
    csvResult,
    csvInputRef,
    // Setters
    setShowAddForm,
    setEditingContact,
    setDeleteConfirm,
    setSearchQuery,
    setCsvResult,
    // Computed
    filtered,
    // Handlers
    handleSaved,
    handleDelete,
    handleExportCsv,
    handleDownloadTemplate,
    handleCsvImport,
  };
}
