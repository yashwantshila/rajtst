import { notFound } from 'next/navigation';
import { getPostBySlug } from '../../../lib/posts';
import SEO from '../../../components/SEO';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  if (!post) return notFound();

  const window = new JSDOM('').window;
  const purify = DOMPurify(window as any);
  const html = purify.sanitize(post.content);

  return (
    <>
      <SEO title={post.title} description={post.excerpt} url={`/blog/post/${post.slug}`} />
      <article>
        <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </>
  );
}