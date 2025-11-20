import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { Folder } from '../models/todo.models';
import { TodoStore } from '../state/todo.store';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private db = inject(Firestore);
  private store = inject(TodoStore);

  async load(userId: string) {
    try {
      const ref = doc(this.db, 'users', userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data()['folders'] as Folder[];
        this.store.hydrate(data ?? []);
      } else {
        this.store.hydrate([]);
      }
    } catch (err) {
      console.error('Firestore load failed:', err);
      this.store.hydrate([]);
    }
  }

  async save(userId: string) {
    try {
      const ref = doc(this.db, 'users', userId);
      await setDoc(ref, { folders: this.store.snapshot() }, { merge: true });
    } catch (err) {
      console.error('Firestore save failed:', err);
    }
  }
}
