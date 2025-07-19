import Link from 'next/link';
import { getAllPosts } from '../lib/posts';
import SEO from '../components/SEO';

export default async function HomePage() {
  const posts = await getAllPosts();
  return (
    <>
      <SEO title="Blog" description="Latest posts" />
      <h1 className="text-2xl font-bold mb-4">Latest Posts</h1>
      <ul className="space-y-4">
        {posts.map(p => (
          <li key={p.id}>
            <Link href={`/blog/post/${p.slug}`} className="text-blue-600">
              {p.title}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}