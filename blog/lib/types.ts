export interface Post {
    id?: string;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    categories: string[];
    createdAt: number;
    updatedAt: number;
    authorId: string;
    status: 'draft' | 'published';
  }