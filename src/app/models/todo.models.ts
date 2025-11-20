export type TodoStatus = 'pending' | 'done';
export type TodoType = 'general' | 'assignment' | 'trip';
export type SectionType = 'general' | 'assignment' | 'trip';

export interface AssignmentDetails {
  subject?: string;
  course?: string;
  percentComplete?: number;
}

export interface TripDetails {
  location?: string;
  notes?: string;
  visited?: boolean;
  visitedDate?: string; // ISO date (no time)
}

export type TodoDetails = Partial<AssignmentDetails & TripDetails>;

export interface Todo {
  id: string;
  title: string;
  status: TodoStatus;
  due?: string; // ISO date string
  type: TodoType;
  details?: TodoDetails;
}

export interface Section {
  id: string;
  name: string;
  link?: string; // optional external nav
  type?: SectionType;
  todos: Todo[];
}

export interface Folder {
  id: string;
  name: string;
  sections: Section[];
}
