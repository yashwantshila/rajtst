import Head from 'next/head';
import { GetStaticPropsContext } from 'next';
import { getPostSlugs, getPostBySlug, Post } from '../lib/posts';
import { remark } from 'remark';
import html from 'remark-html';

export async function getStaticPaths() {
  const slugs = getPostSlugs();
  const paths = slugs.map((slug) => ({ params: { slug: slug.replace(/\.md$/, '') } }));
  return { paths, fallback: false };
}

export async function getStaticProps({ params }: GetStaticPropsContext) {
  const slug = params?.slug as string;
  const post = getPostBySlug(slug);
  const processedContent = await remark().use(html).process(post.content);
  const contentHtml = processedContent.toString();
  return { props: { post: { ...post, content: contentHtml } } };
}

type Props = {
  post: Post;
};

export default function PostPage({ post }: Props) {
  return (
    <>
      <Head>
        <title>{post.title} | RajTest Blog</title>
        <meta name="description" content={post.description} />
        <link rel="canonical" href={`https://rajtest.com/blog/${post.slug}`} />
      </Head>
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <h1>{post.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </main>
    </>
  );
}
