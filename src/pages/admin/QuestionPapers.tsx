import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getQuestionPapersByCategory, getQuestionPaperCategories, uploadQuestionPaper, deleteQuestionPaper } from '../../services/firebase/questionPapers';
import type { QuestionPaper, QuestionPaperCategory } from '../../services/firebase/questionPapers';
import { Search } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

export default function AdminQuestionPapers() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [category, setCategory] = useState<QuestionPaperCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [newPaper, setNewPaper] = useState({
    title: '',
    description: '',
    year: new Date().getFullYear(),
    file: null as File | null
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [categoryId]);

  const fetchData = async () => {
    if (!categoryId) return;

    try {
      const [papersData, categoriesData] = await Promise.all([
        getQuestionPapersByCategory(categoryId),
        getQuestionPaperCategories()
      ]);

      setPapers(papersData);
      const currentCategory = categoriesData.find(cat => cat.id === categoryId);
      setCategory(currentCategory || null);
    } catch (err) {
      setError('Failed to load question papers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewPaper({ ...newPaper, file: e.target.files[0] });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !newPaper.file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      await uploadQuestionPaper(
        categoryId,
        newPaper.title,
        newPaper.description,
        newPaper.year,
        newPaper.file
      );

      setNewPaper({
        title: '',
        description: '',
        year: new Date().getFullYear(),
        file: null
      });
      fetchData();
      setShowUploadForm(false);
    } catch (err) {
      setError('Failed to upload question paper');
      console.error(err);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (paperId: string) => {
    if (!window.confirm('Are you sure you want to delete this question paper?')) {
      return;
    }

    try {
      await deleteQuestionPaper(paperId);
      fetchData();
    } catch (err) {
      setError('Failed to delete question paper');
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

  if (!category) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Category not found</div>
      </div>
    );
  }

  const years = Array.from(new Set(papers.map(p => p.year))).sort((a, b) => b - a);
  const filteredPapers = papers.filter(
    p =>
      (yearFilter === 'all' || p.year === Number(yearFilter)) &&
      (p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link to="/admin/question-paper-categories" className="text-blue-500 hover:text-blue-700">
          ← Back to Categories
        </Link>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{category.title}</h1>
          <p className="text-gray-600 mt-2">{category.description}</p>
        </div>
        <button
          onClick={() => setShowUploadForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Upload Paper
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showUploadForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Upload New Question Paper</h2>
          <form onSubmit={handleUpload}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={newPaper.title}
                onChange={(e) => setNewPaper({ ...newPaper, title: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Description</label>
              <textarea
                value={newPaper.description}
                onChange={(e) => setNewPaper({ ...newPaper, description: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Year</label>
              <input
                type="number"
                value={newPaper.year}
                onChange={(e) => setNewPaper({ ...newPaper, year: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Question Paper File (PDF)</label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            {uploadProgress > 0 && (
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-1">{uploadProgress}% uploaded</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                disabled={isUploading}
              >
                Upload
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="Search papers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPapers.map((paper) => (
          <div key={paper.id} className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-2">{paper.title}</h2>
            <p className="text-gray-600 mb-4">{paper.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Year: {paper.year}</span>
              <div className="flex gap-2">
                <a
                  href={paper.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700"
                >
                  View
                </a>
                <button
                  onClick={() => handleDelete(paper.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPapers.length === 0 && !showUploadForm && (
        <div className="text-center text-gray-500 mt-8">
          No question papers available in this category yet.
        </div>
      )}
    </div>
  );
} 