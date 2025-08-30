
export type Ticket = {
  id: string;
  subject: string;
  status: 'Open' | 'In Progress' | 'Done';
  priority: 'High' | 'Medium' | 'Low';
};

export const tickets: Ticket[] = [];

export type KanbanTask = {
  sheetRowIndex: number;
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'todo' | 'inprogress' | 'review' | 'done';
  assignee: string;
  dueDate: string;
  type: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  tags: string[];
};


export const kanbanTasks: {
  todo: KanbanTask[];
  inprogress: KanbanTask[];
  review: KanbanTask[];
  done: KanbanTask[];
} = {
  todo: [],
  inprogress: [],
  review: [],
  done: []
};

export type FormQuestion = {
  id: string;
  questionText: string;
  questionType: 'Text' | 'Textarea' | 'Select' | 'Checkbox' | 'Date' | 'Url';
  options?: string[];
};

    