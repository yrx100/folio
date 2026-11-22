export type ServiceId = 'deepseek' | 'custom';

export interface ServiceProfile {
  url: string;
  model: string;
  hasKey: boolean;
}

export interface ModelProfiles {
  active: ServiceId;
  ready: boolean;
  profiles: Record<ServiceId, ServiceProfile>;
}

export interface BootPayload {
  quick: boolean;
  dir: boolean;
  root: string;
  settings: ModelProfiles;
}

export interface EntryItem {
  name: string;
  path: string;
  dir: boolean;
  link: boolean;
  size?: number;
  modified?: number;
}

export type NotesMap = Record<string, string | null>;

export type FilterMode = 'all' | 'noted' | 'pending';
export type SortMode = 'default' | 'pending' | 'name' | 'modified';
export type ViewMode = 'list' | 'cards';
export type ThemeMode = 'system' | 'light' | 'dark';
export type AccentTone = 'blue' | 'ink' | 'vermilion' | 'terracotta' | 'crimson';
export type DensityMode = 'comfortable' | 'compact';
export type SettingsPage = 'models' | 'explorer' | 'appearance';
export type ExplorerMenu = 'off' | 'classic' | 'modern';

export interface UiPreferences {
  theme: ThemeMode;
  accent: AccentTone;
  density: DensityMode;
  view: ViewMode;
  inspectorOpen: boolean;
  recentRoots: string[];
}

export interface UndoRecord {
  item: EntryItem;
  previous: string;
  saved: string;
}

export interface AiProposal {
  path: string;
  text: string;
  generated: string;
}
