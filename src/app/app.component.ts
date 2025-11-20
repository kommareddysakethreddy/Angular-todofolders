import { ChangeDetectionStrategy, Component, HostListener, OnInit, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TodoStore } from './state/todo.store';
import { Folder, Section, SectionType, Todo, TodoDetails } from './models/todo.models';
import { AuthService } from './services/auth.service';
import { SyncService } from './services/sync.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly isBrowser = typeof window !== 'undefined' && !!window.localStorage;
  authMode: 'login' | 'signup' = 'login';
  authUsername = '';
  authPassword = '';
  showPassword = false;
  currentUserSig = signal<string | null>(null);
  currentEmailSig = signal<string | null>(null);
  dataReadySig = signal<boolean>(false);
  isNewUserSig = signal<boolean>(false);

  folderName = '';
  sectionName = '';
  sectionLink = '';
  sectionType: SectionType = 'general';
  todoTitle = '';
  todoDue = '';
  todoCourse = '';
  todoLocation = '';
  todoVisited = false;
  todoVisitedDate = '';
  editingTodoSig = signal<Todo | null>(null);
  collapsedFoldersSig = signal<Set<string>>(new Set());
  sortModeSig = signal<'manual' | 'due-asc' | 'due-desc' | 'name-asc' | 'name-desc' | 'course' | 'visited'>('manual');
  bucketCollapseSig = signal<Record<string, { visited?: boolean; notVisited?: boolean }>>({});
  showSectionControlsSig = signal<boolean>(true);
  showFoldersSig = signal<boolean>(true);

  constructor(public store: TodoStore, private auth: AuthService, private sync: SyncService) {}

  ngOnInit() {
    if (!this.isBrowser) return;
    this.auth.onAuth(async (user) => {
      this.dataReadySig.set(false);
      if (user?.uid) {
        this.currentUserSig.set(user.uid);
        this.currentEmailSig.set(user.email ?? user.uid);
        await this.sync.load(user.uid);
        this.dataReadySig.set(true);
      } else {
        this.currentUserSig.set(null);
        this.currentEmailSig.set(null);
        this.store.hydrate([]);
      }
    });
  }

  private persistEffect = effect(() => {
    if (!this.isBrowser) return;
    const user = this.currentUserSig();
    const _folders = this.store.folders(); // track changes
    if (!user || !this.dataReadySig()) return;
    this.sync.save(user);
  });

  readonly selectedFolderId = computed(() => this.store.selectedFolder()?.id ?? null);
  readonly openSection = computed<Section | null>(() => {
    const folder = this.store.selectedFolder();
    if (!folder) return null;
    const openId = this.store.getOpenSectionId(folder.id) ?? folder.sections[0]?.id ?? null;
    return folder.sections.find(s => s.id === openId) ?? null;
  });
  readonly isAuthenticated = computed(() => !!this.currentUserSig());

  trackById = (_: number, item: { id: string }) => item.id;

  private isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidPassword(password: string) {
    // At least 6 chars, 1 uppercase, 1 digit, 1 special
    return /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{6,}$/.test(password);
  }

  async sendReset() {
    if (!this.isBrowser) return;
    const email = this.authUsername.trim();
    if (!this.isValidEmail(email)) {
      window.alert('Enter a valid email to reset password.');
      return;
    }
    try {
      const methods = await this.auth.fetchMethods(email).toPromise();
      if (!methods || methods.length === 0) {
        window.alert('No account found for this email.');
        return;
      }
      await this.auth.resetPassword(email).toPromise();
      window.alert('Password reset email sent. Check your inbox/spam.');
    } catch (err: any) {
      window.alert(err?.message || 'Failed to send reset email.');
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeys(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    if (e.ctrlKey && key === 'f') {
      e.preventDefault();
      this.quickCreateFolder();
    }
    if (e.ctrlKey && e.shiftKey && key === 'f') {
      e.preventDefault();
      this.quickCreateTodo();
    }
  }

  ensureSectionOpen(folder: { id: string; sections: Section[] }) {
    const current = this.store.getOpenSectionId(folder.id);
    if (!current && folder.sections[0]) {
      this.store.openSection(folder.id, folder.sections[0].id);
    }
  }

  quickCreateFolder() {
    const name = `New Folder ${this.store.folders().length + 1}`;
    this.store.addFolder(name);
  }

  quickCreateTodo() {
    const folder = this.store.selectedFolder();
    if (!folder) return;
    const section = this.openSection();
    if (!section) return;
    const nextIndex = section.todos.length + 1;
    const type = section.type ?? 'general';
    this.store.addTodo(folder.id, section.id, { title: `New Todo ${nextIndex}`, type, details: {}, due: undefined });
  }

  toggleFolderCollapse(folderId: string) {
    const next = new Set(this.collapsedFoldersSig());
    next.has(folderId) ? next.delete(folderId) : next.add(folderId);
    this.collapsedFoldersSig.set(next);
  }
  isFolderCollapsed(folderId: string) {
    if (this.selectedFolderId() !== folderId) return true;
    return this.collapsedFoldersSig().has(folderId);
  }

  renameFolder(folderId: string, currentName: string) {
    const next = window.prompt('Rename folder', currentName);
    if (next && next.trim()) {
      this.store.renameFolder(folderId, next.trim());
    }
  }

  renameSection(folderId: string, sectionId: string, currentName: string, currentLink?: string) {
    const name = window.prompt('Rename section', currentName) ?? currentName;
    const link = window.prompt('Set link', currentLink ?? '') || undefined;
    this.store.renameSection(folderId, sectionId, name.trim() || currentName, link);
  }

  confirmDeleteFolder(folderId: string, name: string) {
    if (window.confirm(`Delete folder "${name}"? This will remove its subfolders and todos.`)) {
      this.store.deleteFolder(folderId);
    }
  }

  confirmDeleteSection(folderId: string, sectionId: string, name: string) {
    if (window.confirm(`Delete subfolder "${name}" and its todos?`)) {
      this.store.deleteSection(folderId, sectionId);
    }
  }

  addSection(folderId: string) {
    const name = this.sectionName.trim();
    if (!name) {
      window.alert('Please enter a subfolder name.');
      return;
    }
    this.store.addSection(folderId, name, this.sectionLink, this.sectionType);
    this.sectionName = '';
    this.sectionLink = '';
    this.sectionType = 'general';
  }

  async signup() {
    if (!this.isBrowser) return;
    const email = this.authUsername.trim();
    const password = this.authPassword;
    if (!email || !password || !this.isValidEmail(email) || !this.isValidPassword(password)) {
      window.alert('Enter a valid email and password (min 6 chars, 1 uppercase, 1 number, 1 special).');
      return;
    }
    try {
      const cred = await this.auth.signup(email, password).toPromise();
      this.currentUserSig.set(cred?.user?.uid ?? null);
      this.currentEmailSig.set(cred?.user?.email ?? cred?.user?.uid ?? null);
      this.authPassword = '';
    } catch (err: any) {
      window.alert(err?.message || 'Signup failed');
    }
  }

  async login() {
    if (!this.isBrowser) return;
    const email = this.authUsername.trim();
    const password = this.authPassword;
    if (!email || !password || !this.isValidEmail(email) || !this.isValidPassword(password)) {
      window.alert('Enter a valid email and password (min 6 chars, 1 uppercase, 1 number, 1 special).');
      return;
    }
    try {
      const cred = await this.auth.login(email, password).toPromise();
      this.currentUserSig.set(cred?.user?.uid ?? null);
      this.currentEmailSig.set(cred?.user?.email ?? cred?.user?.uid ?? null);
      this.authPassword = '';
    } catch (err: any) {
      window.alert(err?.message || 'Login failed');
    }
  }

  async logout() {
    if (!this.isBrowser) return;
    await this.auth.logout().toPromise();
    this.currentUserSig.set(null);
    this.currentEmailSig.set(null);
    this.dataReadySig.set(false);
    this.editingTodoSig.set(null);
    this.bucketCollapseSig.set({});
    this.collapsedFoldersSig.set(new Set());
    this.store.hydrate([]);
  }

  onFolderClick(folder: Folder) {
    if (this.selectedFolderId() === folder.id) {
      this.toggleFolderCollapse(folder.id);
    } else {
      this.store.selectFolder(folder.id);
      this.ensureSectionOpen(folder);
    }
  }

  startEdit(todo: Todo) {
    this.editingTodoSig.set(todo);
    this.todoTitle = todo.title;
    this.todoDue = todo.due ?? '';
    this.todoCourse = todo.details?.course ?? '';
    this.todoLocation = todo.details?.location ?? '';
    this.todoVisited = todo.details?.visited ?? false;
    this.todoVisitedDate = todo.details?.visitedDate ?? '';
  }

  submitTodo(folderId: string, sectionId: string) {
    const editing = this.editingTodoSig();
    const payload = this.buildTodoPayload();
    if (!payload) return;
    if (editing) {
      this.store.updateTodo(folderId, sectionId, editing.id, payload);
      this.editingTodoSig.set(null);
    } else {
      this.store.addTodo(folderId, sectionId, payload);
    }
    this.resetTodoForm();
  }

  deleteSelectedTodos(folderId: string, sectionId: string) {
    this.store.deleteTodos(folderId, sectionId, Array.from(this.store.selectedTodoIds()));
  }

  buildTodoPayload() {
    const section = this.openSection();
    const type: SectionType = section?.type ?? 'general';
    const details: TodoDetails = {};
    if (type === 'assignment') {
      if (!this.todoDue) {
        window.alert('Please add a deadline for assignments to sort correctly.');
        return null;
      }
      if (this.todoCourse) details.course = this.todoCourse;
    }
    if (type === 'trip') {
      if (this.todoLocation) details.location = this.todoLocation;
      details.visited = this.todoVisited || !!this.todoVisitedDate;
      if (details.visited && this.todoVisitedDate) {
        details.visitedDate = this.todoVisitedDate;
      }
    }
    return {
      title: this.todoTitle,
      type,
      due: this.todoDue || undefined,
      details,
    };
  }

  resetTodoForm() {
    this.todoTitle = '';
    this.todoDue = '';
    this.todoCourse = '';
    this.todoLocation = '';
    this.todoVisited = false;
    this.todoVisitedDate = '';
  }

  setSort(mode: 'manual' | 'due-asc' | 'due-desc' | 'name-asc' | 'name-desc' | 'course' | 'visited') {
    this.sortModeSig.set(mode);
  }

  sortedTodos(section: Section) {
    const mode = this.sortModeSig();
    const allowed =
      section.type === 'assignment'
        ? new Set(['manual', 'name-asc', 'name-desc', 'due-asc', 'due-desc', 'course'])
        : section.type === 'trip'
          ? new Set(['manual', 'visited'])
          : new Set(['manual', 'name-asc', 'name-desc']);
    if (!allowed.has(mode)) return section.todos;
    if (mode === 'manual') return section.todos;
    if (mode === 'name-asc' || mode === 'name-desc') {
      return [...section.todos].sort((a, b) => mode === 'name-asc'
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title));
    }
    if (mode === 'due-asc' || mode === 'due-desc') {
      return [...section.todos].sort((a, b) => {
        const dA = a.due ?? '';
        const dB = b.due ?? '';
        if (!dA && !dB) return 0;
        if (!dA) return 1;
        if (!dB) return -1;
        return mode === 'due-asc' ? dA.localeCompare(dB) : dB.localeCompare(dA);
      });
    }
    if (mode === 'course') {
      return [...section.todos].sort((a, b) => (a.details?.course ?? '').localeCompare(b.details?.course ?? ''));
    }
    if (mode === 'visited') {
      const visited = section.todos.filter(t => t.details?.visited || !!t.details?.visitedDate);
      const notVisited = section.todos.filter(t => !(t.details?.visited || !!t.details?.visitedDate));
      visited.sort((a, b) => (a.details?.visitedDate ?? '').localeCompare(b.details?.visitedDate ?? ''));
      return [...visited, ...notVisited];
    }
    return section.todos;
  }

  tripBuckets(section: Section) {
    if (section.type !== 'trip') return { visited: section.todos, notVisited: [] };
    const visited = section.todos.filter(t => t.details?.visited || !!t.details?.visitedDate);
    const notVisited = section.todos.filter(t => !(t.details?.visited || !!t.details?.visitedDate));
    visited.sort((a, b) => (a.details?.visitedDate ?? '').localeCompare(b.details?.visitedDate ?? ''));
    return { visited, notVisited };
  }

  toggleBucket(sectionId: string, key: 'visited' | 'notVisited') {
    const current = { ...this.bucketCollapseSig() };
    const entry = current[sectionId] ?? {};
    entry[key] = !entry[key];
    const otherKey = key === 'visited' ? 'notVisited' : 'visited';
    // when opening one, close the other
    if (entry[key] === false) entry[otherKey] = true;
    current[sectionId] = entry;
    this.bucketCollapseSig.set(current);
  }

  isBucketCollapsed(sectionId: string, key: 'visited' | 'notVisited') {
    return this.bucketCollapseSig()[sectionId]?.[key] ?? false;
  }

  openPicker(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input && 'showPicker' in input) {
      (input as any).showPicker();
    }
  }

  markVisited(folderId: string, sectionId: string, todo: Todo) {
    const defaultDate = todo.details?.visitedDate || new Date().toISOString().slice(0, 10);
    const date = window.prompt('Visited date (YYYY-MM-DD)', defaultDate);
    if (!date) return;
    const details = { ...(todo.details ?? {}), visited: true, visitedDate: date };
    this.store.updateTodo(folderId, sectionId, todo.id, { details });
  }
}


