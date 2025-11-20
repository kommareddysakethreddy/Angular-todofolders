import { Folder } from '../models/todo.models';

export const MOCK_FOLDERS: Folder[] = [
  {
    id: 'fld-trips',
    name: 'Trips',
    sections: [
      {
        id: 'sec-japan',
        name: 'Japan 2025',
        link: 'https://example.com/trips/japan',
        type: 'trip',
        todos: [
          { id: 'todo-passport', title: 'Renew passport', status: 'pending', type: 'trip', due: '2025-04-01', details: { location: 'Tokyo', visited: false } },
          { id: 'todo-rail', title: 'Buy JR pass', status: 'pending', type: 'trip', due: '2025-04-10', details: { location: 'Tokyo', visited: false } },
        ],
      },
      {
        id: 'sec-gear',
        name: 'Gear',
        type: 'general',
        todos: [
          { id: 'todo-bag', title: 'Replace carry-on', status: 'pending', type: 'general' },
          { id: 'todo-cam', title: 'Camera batteries', status: 'done', type: 'general' },
        ],
      },
    ],
  },
  {
    id: 'fld-home',
    name: 'Home',
    sections: [
      {
        id: 'sec-kitchen',
        name: 'Kitchen',
        type: 'assignment',
        todos: [
          { id: 'todo-pans', title: 'New pan set', status: 'pending', type: 'general' },
          { id: 'todo-assignment', title: 'Write grocery budget', status: 'pending', type: 'assignment', due: '2025-02-01', details: { subject: 'Home Econ', percentComplete: 20 } },
        ],
      },
    ],
  },
];
