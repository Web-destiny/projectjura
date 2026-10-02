import { openDB } from 'idb';
import type { Draft, EditDraft, Template } from '../../domain/models';
const db = () =>
  openDB('dzhura', 1, {
    upgrade(db) {
      db.createObjectStore('templates', { keyPath: 'id' });
      db.createObjectStore('settings');
      db.createObjectStore('drafts');
    },
  });
export const repository = {
  async templates(): Promise<Template[]> {
    return (await (await db()).getAll('templates')).sort(
      (a: Template, b: Template) => b.updatedAt - a.updatedAt,
    );
  },
  async saveTemplate(t: Template) {
    await (await db()).put('templates', structuredClone(t));
  },
  async deleteTemplate(id: string) {
    await (await db()).delete('templates', id);
  },
  async saveDraft(d: Draft) {
    await (await db()).put('drafts', structuredClone(d), 'active');
  },
  async draft(): Promise<Draft | undefined> {
    const d: Draft | undefined = await (await db()).get('drafts', 'active');
    if (d && Date.now() - d.updatedAt > 30 * 86400000) {
      await this.clearDraft();
      return;
    }
    return d;
  },
  async clearDraft() {
    await (await db()).delete('drafts', 'active');
  },
  async saveEditDraft(d: EditDraft) {
    await (await db()).put('drafts', structuredClone(d), 'edit');
  },
  async editDraft(): Promise<EditDraft | undefined> {
    const d: EditDraft | undefined = await (await db()).get('drafts', 'edit');
    if (d && Date.now() - d.updatedAt > 30 * 86400000) {
      await this.clearEditDraft();
      return;
    }
    return d;
  },
  async clearEditDraft() {
    await (await db()).delete('drafts', 'edit');
  },
  async setting(key: string): Promise<string | undefined> {
    return (await db()).get('settings', key);
  },
  async setSetting(key: string, value: string) {
    await (await db()).put('settings', value, key);
  },
};
