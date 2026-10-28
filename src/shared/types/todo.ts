export interface Todo {
  id: number;
  content: string;
  done: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TodoChange {
  content?: string;
  done?: boolean;
}
