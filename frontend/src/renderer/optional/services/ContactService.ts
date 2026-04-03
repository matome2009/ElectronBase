import { getFirebaseAuth, getApiUrl } from '../../services/FirebaseService';
import { IndexedDBService } from './IndexedDBService';
import { LoggingService } from '../../services/LoggingService';
import { Contact } from '../../models/index';

async function getIdToken(): Promise<string> {
  const auth = getFirebaseAuth();
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('認証されていません。ログインしてください。');
  return token;
}

async function callApi<T>(apiName: string, body: unknown): Promise<T> {
  const idToken = await getIdToken();
  const url = getApiUrl(apiName);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API ${apiName} failed: ${response.status} ${errorBody}`);
  }
  return response.json() as Promise<T>;
}

export class ContactService {
  static async getContacts(): Promise<Contact[]> {
    const auth = getFirebaseAuth();
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('認証されていません');

    const cached = await IndexedDBService.getContacts(userId);
    if (cached.length > 0) {
      this.refreshCache().catch((err) =>
        LoggingService.error('ContactService refreshCache failed', { err }),
      );
      return cached;
    }
    return this.refreshCache();
  }

  private static async refreshCache(): Promise<Contact[]> {
    const result = await callApi<{ contacts: Contact[] }>('getContacts', {});
    try {
      await IndexedDBService.saveContacts(result.contacts);
    } catch (error) {
      LoggingService.error('IndexedDB saveContacts failed', { error });
    }
    return result.contacts;
  }

  static async addContact(address: string, label: string, description?: string): Promise<Contact> {
    LoggingService.info('ContactService.addContact', { address, label });

    const result = await callApi<{ success: boolean; contact: Contact }>('addContact', {
      address, label, description: description ?? null,
    });

    try {
      const auth = getFirebaseAuth();
      const userId = auth.currentUser?.uid;
      if (userId) {
        const cached = await IndexedDBService.getContacts(userId);
        const without = cached.filter((c) => c.id !== result.contact.id);
        await IndexedDBService.saveContacts([...without, result.contact]);
      }
    } catch (error) {
      LoggingService.error('IndexedDB addContact cache failed', { error });
    }

    return result.contact;
  }

  static async updateContact(id: number, label: string, description?: string | null): Promise<void> {
    LoggingService.info('ContactService.updateContact', { id, label });

    await callApi<{ success: boolean }>('updateContact', { id, label, description: description ?? null });

    try {
      const auth = getFirebaseAuth();
      const userId = auth.currentUser?.uid;
      if (userId) {
        const cached = await IndexedDBService.getContacts(userId);
        const updated = cached.map((c) =>
          c.id === id ? { ...c, label, description: description ?? null } : c
        );
        await IndexedDBService.saveContacts(updated);
      }
    } catch (error) {
      LoggingService.error('IndexedDB updateContact cache failed', { error });
    }
  }

  static async deleteContact(id: number): Promise<void> {
    LoggingService.info('ContactService.deleteContact', { id });

    await callApi<{ success: boolean }>('deleteContact', { id });

    try {
      await IndexedDBService.deleteContact(id);
    } catch (error) {
      LoggingService.error('IndexedDB deleteContact cache failed', { error });
    }
  }
}
