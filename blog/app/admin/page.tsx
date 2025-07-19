'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAllPosts, deletePost } from '../../lib/posts';
import { Post } from '../../lib/types';

export default function AdminPage() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    getAllPosts().then(setPosts);
  }, []);

  async function remove(id: string) {
    await deletePost(id);
    setPosts(posts.filter(p => p.id !== id));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Manage Posts</h1>
      <Link href="/blog/admin/new" className="text-blue-600">New Post</Link>
      <ul className="mt-4 space-y-2">
        {posts.map(p => (
          <li key={p.id} className="flex justify-between">
            <Link href={`/blog/admin/edit/${p.id}`}>{p.title}</Link>
            <button onClick={() => remove(p.id!)} className="text-red-500">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}