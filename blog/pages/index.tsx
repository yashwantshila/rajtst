import Head from 'next/head';
import Link from 'next/link';
import { getAllPosts, Post } from '../lib/posts';

export async function getStaticProps() {
  const posts = getAllPosts();
  return { props: { posts } };
}

type Props = {
  posts: Post[];
};

export default function BlogIndex({ posts }: Props) {
  return (
    <>
      <Head>
        <title>Blog | RajTest</title>
        <meta name="description" content="Latest updates and articles from RajTest" />
        <link rel="canonical" href="https://rajtest.com/blog" />
      </Head>
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <h1>Blog</h1>
        <ul>
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
