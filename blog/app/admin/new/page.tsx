'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPost } from '../../../lib/posts';
import { Post } from '../../../lib/types';

export default function NewPost() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const router = useRouter();

  async function submit() {
    const slug = title.toLowerCase().replace(/\s+/g, '-');
    const post: Post = { title, slug, content, excerpt: content.slice(0, 140), categories: [], createdAt: Date.now(), updatedAt: Date.now(), authorId: 'admin', status: 'draft' };
    await createPost(post);
    router.push('/blog/admin');
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">New Post</h1>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="border p-2 w-full mb-2" />
      <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Content" className="border p-2 w-full h-60" />
      <button onClick={submit} className="bg-blue-500 text-white px-4 py-2 mt-2">Save</button>
    </div>
  );
}