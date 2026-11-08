import React, { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Files,
  Shield,
  GraduationCap,
  Landmark,
  HeartPulse,
  Briefcase,
  UserCheck,
  FileBadge,
  FolderArchive,
  Folder,
} from 'lucide-react';
import type { Category, DocumentItem } from '@/types';

interface ContextType {
  categories: Category[];
  documents: DocumentItem[];
  refreshData: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  GraduationCap,
  Landmark,
  HeartPulse,
  Briefcase,
  UserCheck,
  FileBadge,
  FolderArchive,
  Folder,
};

export const Categories: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { categories, documents, refreshData } = useOutletContext<ContextType>();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [icon, setIcon] = useState('Folder');
  const [isLoading, setIsLoading] = useState(false);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setColor('#6366f1');
    setIcon('Folder');
    setModalOpen(true);
  };

  const openEditModal = (cat: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory(cat);
    setName(cat.name);
    setColor(cat.color || '#6366f1');
    setIcon(cat.icon || 'Folder');
    setModalOpen(true);
  };

  const handleDelete = async (cat: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (cat.is_default) {
      showToast('warning', 'Default Category', 'Default categories cannot be deleted.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      await api.deleteCategory(cat.id);
      await api.logActivity({
        user_id: user.id,
        action: 'category_deleted',
        entity_type: 'category',
        entity_id: cat.id,
        entity_name: cat.name,
      });
      refreshData();
      showToast('info', 'Category Deleted', `"${cat.name}" removed.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name) return;

    setIsLoading(true);
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, { name, slug, color, icon });
        await api.logActivity({
          user_id: user.id,
          action: 'category_updated',
          entity_type: 'category',
          entity_id: editingCategory.id,
          entity_name: name,
        });
        showToast('success', 'Category Updated', `"${name}" updated successfully.`);
      } else {
        await api.createCategory({
          user_id: user.id,
          name,
          slug,
          icon,
          color,
          is_default: false,
        });
        await api.logActivity({
          user_id: user.id,
          action: 'category_created',
          entity_type: 'category',
          entity_name: name,
        });
        showToast('success', 'Category Created', `"${name}" created.`);
      }
      refreshData();
      setModalOpen(false);
    } catch (err: any) {
      showToast('error', 'Error', err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-indigo-500" />
            <span>Document Categories</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organize documents into dedicated encrypted lockers
          </p>
        </div>

        <Button variant="primary" onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
          New Category
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((cat) => {
          const catDocs = documents.filter((d) => d.category_id === cat.id);
          const totalBytes = catDocs.reduce((sum, d) => sum + (d.file_size || 0), 0);
          const IconComp = ICON_MAP[cat.icon] || Folder;

          return (
            <Link key={cat.id} to={`/documents?category=${cat.id}`} className="block group">
              <Card className="p-5 h-full flex flex-col justify-between hover:border-indigo-500/50 hover:shadow-glow-sm transition-all">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div
                      className="p-3 rounded-2xl flex items-center justify-center text-white"
                      style={{ backgroundColor: cat.color }}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => openEditModal(cat, e)}
                        className="p-1.5 text-slate-400 hover:text-slate-200"
                        title="Edit Category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!cat.is_default && (
                        <button
                          onClick={(e) => handleDelete(cat, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-400"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-400 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {catDocs.length} {catDocs.length === 1 ? 'file' : 'files'}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-vault-800 flex items-center justify-between text-[11px]">
                  <span className="font-mono text-slate-500">{(totalBytes / 1024).toFixed(1)} KB</span>
                  {cat.is_default ? (
                    <Badge variant="outline" size="sm">
                      Default
                    </Badge>
                  ) : (
                    <Badge variant="purple" size="sm">
                      Custom
                    </Badge>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Create / Edit Category Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create New Category'}
        description="Categories group your encrypted documents logically."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Category Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Tax & Financials"
            required
            autoFocus
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Accent Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
              />
              <span className="text-xs font-mono text-slate-400">{color}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Category Icon
            </label>
            <div className="grid grid-cols-5 gap-2">
              {Object.keys(ICON_MAP).map((iconKey) => {
                const Comp = ICON_MAP[iconKey];
                const isSelected = icon === iconKey;
                return (
                  <button
                    key={iconKey}
                    type="button"
                    onClick={() => setIcon(iconKey)}
                    className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400'
                        : 'border-slate-200 dark:border-vault-700 hover:bg-slate-100 dark:hover:bg-vault-800 text-slate-400'
                    }`}
                  >
                    <Comp className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
