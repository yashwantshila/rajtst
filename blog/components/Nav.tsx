import Link from 'next/link';

export default function Nav() {
  return (
    <nav className="p-4 shadow-md flex gap-4">
      <Link href="/blog">Home</Link>
      <Link href="/blog/admin">Admin</Link>
    </nav>
  );
}