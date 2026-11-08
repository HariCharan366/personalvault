import type { Folder } from '@/types';

/**
 * Returns the breadcrumb ancestor chain for a given folder (from top ancestor down to current folder).
 */
export function getFolderAncestors(folderId: string, folders: Folder[]): Folder[] {
  const map = new Map(folders.map((f) => [f.id, f]));
  const ancestors: Folder[] = [];
  let curr = map.get(folderId);
  const visited = new Set<string>();

  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    ancestors.unshift(curr);
    curr = curr.parent_id ? map.get(curr.parent_id) : undefined;
  }
  return ancestors;
}

/**
 * Returns the human-readable path string for a folder (e.g. "Work / Projects / 2026").
 */
export function getFolderPath(folderId: string, folders: Folder[]): string {
  const ancestors = getFolderAncestors(folderId, folders);
  if (ancestors.length === 0) return '';
  return ancestors.map((a) => a.name).join(' / ');
}

/**
 * Returns all descendant folder IDs under a given folder (for cascading deletes or preventing cycles).
 */
export function getDescendantFolderIds(folderId: string, folders: Folder[]): string[] {
  const childrenMap = new Map<string, string[]>();
  for (const f of folders) {
    if (f.parent_id) {
      const list = childrenMap.get(f.parent_id) || [];
      list.push(f.id);
      childrenMap.set(f.parent_id, list);
    }
  }

  const descendants: string[] = [];
  const queue = [...(childrenMap.get(folderId) || [])];
  const visited = new Set<string>([folderId]);

  while (queue.length > 0) {
    const nextId = queue.shift()!;
    if (!visited.has(nextId)) {
      visited.add(nextId);
      descendants.push(nextId);
      const nextChildren = childrenMap.get(nextId);
      if (nextChildren) queue.push(...nextChildren);
    }
  }

  return descendants;
}

export interface FolderHierarchyItem {
  id: string;
  name: string;
  path: string;
  depth: number;
}

/**
 * Returns formatted hierarchical folders with visual indentation and path for selectors.
 */
export function getFolderHierarchy(
  folders: Folder[],
  excludeDescendantsOfId?: string
): FolderHierarchyItem[] {
  const excludedIds = excludeDescendantsOfId
    ? new Set([excludeDescendantsOfId, ...getDescendantFolderIds(excludeDescendantsOfId, folders)])
    : new Set<string>();

  const map = new Map(folders.map((f) => [f.id, f]));

  return folders
    .filter((f) => !excludedIds.has(f.id))
    .map((f) => {
      const ancestors = getFolderAncestors(f.id, folders);
      const path = ancestors.map((a) => a.name).join(' / ');
      const depth = ancestors.length - 1;
      return { id: f.id, name: f.name, path, depth };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}
