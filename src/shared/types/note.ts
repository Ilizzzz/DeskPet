export interface Note {
  id: number;
  content: string;
  color: 'yellow' | 'blue' | 'green' | 'pink';
  pinned: boolean;
  updatedAt: number;
}

export interface NoteChange {
  content?: string;
  color?: Note['color'];
  pinned?: boolean;
}
