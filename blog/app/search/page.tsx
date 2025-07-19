'use client';
import { useState } from 'react';
import Link from 'next/link';
import { getAllPosts } from '../../lib/posts';
import { Post } from '../../lib/types';

export default function SearchPage() {
  const [results, setResults] = useState<Post[]>([]);
  const [q, setQ] = useState('');

  async function search() {
    const posts = await getAllPosts();
    setResults(posts.filter(p => p.title.toLowerCase().includes(q.toLowerCase()) || p.content.toLowerCase().includes(q.toLowerCase())));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Search</h1>
      <input value={q} onChange={e => setQ(e.target.value)} className="border p-2 w-full mb-2" placeholder="Search posts" />
      <button onClick={search} className="bg-blue-500 text-white px-4 py-2 mb-4">Search</button>
      <ul className="space-y-2">
        {results.map(p => (
          <li key={p.id}>
            <Link href={`/blog/post/${p.slug}`} className="text-blue-600">{p.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}