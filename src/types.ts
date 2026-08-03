export type EntryType = 'movie' | 'show';

export type Importance = 'required' | 'recommended' | 'optional';

export type WatchStatus = 'watched' | 'watching';

export interface Dependency {
  id: string;
  importance: Importance;
  note?: string;
}

export interface Entry {
  id: string;
  title: string;
  type: EntryType;
  releaseDate: string;
  phase: number;
  dependencies: Dependency[];
  wikipediaUrl?: string;
  fandomUrl?: string;
  imdbUrl?: string;
  runtimeMinutes?: number;
  posterUrl?: string;
  disneyPlusUrl?: string;
}

export interface Phase {
  number: number;
  name: string;
  saga: string;
}

export interface McuData {
  schemaVersion: number;
  phases: Phase[];
  entries: Entry[];
}

export type StatusMap = Record<string, WatchStatus>;

export interface User {
  id: string;
  name: string;
  status: StatusMap;
}

export interface UsersState {
  currentUserId: string;
  users: User[];
}

export interface Dependent {
  id: string;
  importance: Importance;
}

export interface Filters {
  hideWatched: boolean;
  type: EntryType | 'all';
}

export type ViewMode = 'tree' | 'list';

export type Theme = 'dark' | 'light';
