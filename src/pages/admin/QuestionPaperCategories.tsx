import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getQuestionPaperCategories, createQuestionPaperCategory, updateQuestionPaperCategory, deleteQuestionPaperCategory } from '../../services/firebase/questionPapers';
import type { QuestionPaperCategory } from '../../services/firebase/questionPapers';

export default function QuestionPaperCategories() {
  const [categories, setCategories] = useState<QuestionPaperCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCategory, setNewCategory] = useState({ title: '', description: '' });
  const [editingCategory, setEditingCategory] = useState<QuestionPaperCategory | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await getQuestionPaperCategories();
      setCategories(data);
    } catch (err) {
      setError('Failed to load categories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createQuestionPaperCategory(newCategory.title, newCategory.description);
      setNewCategory({ title: '', description: '' });
      setIsCreating(false);
      fetchCategories();
    } catch (err) {
      setError('Failed to create category');
      console.error(err);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    try {
      await updateQuestionPaperCategory(editingCategory.id, {
        title: editingCategory.title,
        description: editingCategory.description
      });
      setEditingCategory(null);
      fetchCategories();
    } catch (err) {
      setError('Failed to update category');
      console.error(err);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this category? This will also delete all question papers in this category.')) {
      return;
    }

    try {
      await deleteQuestionPaperCategory(categoryId);
      fetchCategories();
    } catch (err) {
      setError('Failed to delete category');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/admin" className="text-blue-500 hover:text-blue-700 flex items-center gap-1">
          <span className="text-lg">←</span> Back to Admin Dashboard
        </Link>
      </div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Question Paper Categories</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Add Category
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isCreating && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New Category</h2>
          <form onSubmit={handleCreateCategory}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={newCategory.title}
                onChange={(e) => setNewCategory({ ...newCategory, title: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Description</label>
              <textarea
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <div key={category.id} className="bg-white rounded-lg shadow-md p-6">
            {editingCategory?.id === category.id ? (
              <form onSubmit={handleUpdateCategory}>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={editingCategory.title}
                    onChange={(e) => setEditingCategory({ ...editingCategory, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Description</label>
                  <textarea
                    value={editingCategory.description}
                    onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-2">{category.title}</h2>
                <p className="text-gray-600 mb-4">{category.description}</p>
                <div className="flex justify-between items-center">
                  <Link
                    to={`/admin/question-papers/${category.id}`}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    Manage Papers
                  </Link>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingCategory(category)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {categories.length === 0 && !isCreating && (
        <div className="text-center text-gray-500 mt-8">
          No categories available. Create one to get started.
        </div>
      )}
    </div>
  );
} 