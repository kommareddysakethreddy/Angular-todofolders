import { computed, Injectable, signal } from '@angular/core';
import { Folder, Section, SectionType, Todo } from '../models/todo.models';
import { MOCK_FOLDERS } from '../data/mock-data';

type Id = string;

@Injectable({ providedIn: 'root' })
export class TodoStore {
  private foldersSig = signal<Folder[]>(structuredClone(MOCK_FOLDERS));
  private selectedFolderIdSig = signal<Id | null>(MOCK_FOLDERS[0]?.id ?? null);
  private openSectionByFolderSig = signal<Record<Id, Id | null>>({});
  private selectedTodoIdsSig = signal<Set<Id>>(new Set());

  readonly folders = computed(() => this.foldersSig());
  readonly selectedFolder = computed(() =>
    this.foldersSig().find(f => f.id === this.selectedFolderIdSig()) ?? null
  );
  readonly selectedFolderSections = computed(() => this.selectedFolder()?.sections ?? []);
  readonly selectedTodoIds = computed(() => this.selectedTodoIdsSig());

  selectFolder(id: Id) {
    this.selectedFolderIdSig.set(id);
    this.selectedTodoIdsSig.set(new Set());
  }

  toggleSection(folderId: Id, sectionId: Id) {
    const map = { ...this.openSectionByFolderSig() };
    map[folderId] = map[folderId] === sectionId ? null : sectionId;
    this.openSectionByFolderSig.set(map);
  }
  openSection(folderId: Id, sectionId: Id) {
    this.openSectionByFolderSig.set({ ...this.openSectionByFolderSig(), [folderId]: sectionId });
  }
  isSectionOpen(folderId: Id, sectionId: Id) {
    return this.openSectionByFolderSig()[folderId] === sectionId;
  }
  getOpenSectionId(folderId: Id) {
    return this.openSectionByFolderSig()[folderId] ?? null;
  }

  toggleTodoSelect(todoId: Id) {
    const next = new Set(this.selectedTodoIdsSig());
    next.has(todoId) ? next.delete(todoId) : next.add(todoId);
    this.selectedTodoIdsSig.set(next);
  }
  clearTodoSelection() {
    this.selectedTodoIdsSig.set(new Set());
  }

  addFolder(name: string) {
    const next: Folder = { id: crypto.randomUUID(), name, sections: [] };
    this.foldersSig.update((folders: Folder[]) => [...folders, next]);
    this.selectFolder(next.id);
  }
  renameFolder(folderId: Id, name: string) {
    this.foldersSig.update((folders: Folder[]) =>
      folders.map(f => (f.id === folderId ? { ...f, name } : f))
    );
  }
  deleteFolder(folderId: Id) {
    this.foldersSig.update((folders: Folder[]) => folders.filter(f => f.id !== folderId));
    if (this.selectedFolderIdSig() === folderId) {
      this.selectedFolderIdSig.set(this.foldersSig()[0]?.id ?? null);
    }
  }

  addSection(folderId: Id, name: string, link?: string, type: SectionType = 'general') {
    this.foldersSig.update((folders: Folder[]) =>
      folders.map(f =>
        f.id !== folderId
          ? f
          : { ...f, sections: [...f.sections, { id: crypto.randomUUID(), name, link, type, todos: [] }] }
      )
    );
  }
  renameSection(folderId: Id, sectionId: Id, name: string, link?: string) {
    this.foldersSig.update((folders: Folder[]) =>
      folders.map(f =>
        f.id !== folderId
          ? f
          : {
              ...f,
              sections: f.sections.map(s =>
                s.id === sectionId ? { ...s, name, link } : s
              ),
            }
      )
    );
  }
  deleteSection(folderId: Id, sectionId: Id) {
    this.foldersSig.update((folders: Folder[]) =>
      folders.map(f =>
        f.id !== folderId
          ? f
          : { ...f, sections: f.sections.filter(s => s.id !== sectionId) }
      )
    );
  }

  addTodo(folderId: Id, sectionId: Id, todoInput: Pick<Todo, 'title' | 'type' | 'details' | 'due'>) {
    const todo: Todo = { id: crypto.randomUUID(), status: 'pending', ...todoInput };
    this.foldersSig.update((folders: Folder[]) =>
      folders.map(f =>
        f.id !== folderId
          ? f
          : {
              ...f,
              sections: f.sections.map(s =>
                s.id !== sectionId ? s : { ...s, todos: [...s.todos, todo] }
              ),
            }
      )
    );
  }
  updateTodo(folderId: Id, sectionId: Id, todoId: Id, patch: Partial<Todo>) {
    this.foldersSig.update((folders: Folder[]) =>
      folders.map(f =>
        f.id !== folderId
          ? f
          : {
              ...f,
              sections: f.sections.map(s =>
                s.id !== sectionId
                  ? s
                  : {
                      ...s,
                      todos: s.todos.map(t => (t.id === todoId ? { ...t, ...patch } : t)),
                    }
              ),
            }
      )
    );
  }
  deleteTodos(folderId: Id, sectionId: Id, todoIds: Id[]) {
    const remove = new Set(todoIds);
    this.foldersSig.update((folders: Folder[]) =>
      folders.map(f =>
        f.id !== folderId
          ? f
          : {
              ...f,
              sections: f.sections.map(s =>
                s.id !== sectionId
                  ? s
                  : { ...s, todos: s.todos.filter(t => !remove.has(t.id)) }
              ),
            }
      )
    );
    this.clearTodoSelection();
  }

  hydrate(folders: Folder[]) {
    this.foldersSig.set(structuredClone(folders));
    this.selectedFolderIdSig.set(folders[0]?.id ?? null);
    this.openSectionByFolderSig.set({});
    this.selectedTodoIdsSig.set(new Set());
  }

  snapshot(): Folder[] {
    return structuredClone(this.foldersSig());
  }
}
