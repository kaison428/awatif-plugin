import type { ReactNode } from 'react';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  icon?: ReactNode;
  pressed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}

export interface StatusBadgeProps {
  status?: 'ok' | 'warn' | 'fail' | 'info' | 'neutral';
  children: ReactNode;
}

export interface PanelProps {
  title: string;
  actions?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  flush?: boolean;
  children?: ReactNode;
}

export interface TreeNode {
  id: string;
  label: string;
  group?: boolean;
  icon?: ReactNode;
  meta?: string | number;
  children?: TreeNode[];
}
export interface TreeViewProps {
  nodes: TreeNode[];
  selectedId?: string;
  defaultExpanded?: string[];
  onSelect?: (id: string, node: TreeNode) => void;
}

export type SelectOption = string | { value: string; label: string } | { label: string; options: (string | { value: string; label: string })[] };

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  labelledBy?: string;
  onChange?: (value: string) => void;
}

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  labelledBy?: string;
  onChange?: (checked: boolean) => void;
  children?: ReactNode;
}

export interface TabsProps {
  tabs: { id: string; label: string; meta?: string | number }[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
}

export interface PropertyRow {
  label: string;
  /** A string, number or node. For `select`, the current option value; for `checkbox`, a boolean. */
  value: ReactNode;
  unit?: string;
  key?: string;
  numeric?: boolean;
  /** Shorthand for control: 'input'. */
  editable?: boolean;
  control?: 'input' | 'select' | 'checkbox';
  options?: SelectOption[];
}
export interface PropertyGridProps {
  groups: { title?: string; rows: PropertyRow[] }[];
  onChange?: (key: string, value: string) => void;
}

export interface DataColumn {
  key: string;
  label: string;
  unit?: string;
  width?: string;
  numeric?: boolean;
  mono?: boolean;
  render?: (value: any, row: any) => ReactNode;
}
export interface DataTableProps {
  columns: DataColumn[];
  rows: ({ id: string } & Record<string, any>)[];
  selectedId?: string;
  density?: 'default' | 'compact';
  onSelect?: (id: string, row: any) => void;
}

export interface ContourLegendProps {
  title: string;
  unit?: string;
  min?: number;
  max?: number;
  scale?: 'sequential' | 'diverging';
  ticks?: number;
  decimals?: number;
  height?: number;
  note?: string;
}

export interface AppShellProps {
  toolbar?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  bottom?: ReactNode;
  statusbar?: ReactNode;
  overlays?: { topLeft?: ReactNode; topRight?: ReactNode; bottomLeft?: ReactNode; bottomRight?: ReactNode };
  leftWidth?: string;
  rightWidth?: string;
  bottomHeight?: string;
  /** The model view: SVG, canvas or WebGL. Fills the viewport. */
  children?: ReactNode;
}
