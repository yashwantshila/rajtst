'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { updatePost } from '../../../../lib/posts';

export default function EditPost({ params }: { params: { id: string } }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const router = useRouter();

  useEffect(() => {
    getDoc(doc(db, 'posts', params.id)).then(d => {
      const data = d.data() as any;
      if (data) {
        setTitle(data.title);
        setContent(data.content);
      }
    });
  }, [params.id]);

  async function submit() {
    await updatePost(params.id, { title, content });
    router.push('/blog/admin');
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Edit Post</h1>
      <input value={title} onChange={e => setTitle(e.target.value)} className="border p-2 w-full mb-2" />
      <textarea value={content} onChange={e => setContent(e.target.value)} className="border p-2 w-full h-60" />
      <button onClick={submit} className="bg-blue-500 text-white px-4 py-2 mt-2">Save</button>
    </div>
  );
}