import { collection, addDoc, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Post } from './types';

const postsRef = collection(db, 'posts');

export async function getAllPosts() {
  const q = query(postsRef, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Post) }));
}

export async function getPostBySlug(slug: string) {
  const q = query(postsRef, orderBy('slug'));
  const snap = await getDocs(q);
  const docSnap = snap.docs.find(d => d.data().slug === slug);
  if (docSnap) return { id: docSnap.id, ...(docSnap.data() as Post) };
  return null;
}

export async function createPost(post: Post) {
  const data = { ...post, createdAt: Date.now(), updatedAt: Date.now() };
  await addDoc(postsRef, data);
}

export async function updatePost(id: string, post: Partial<Post>) {
  const ref = doc(postsRef, id);
  await updateDoc(ref, { ...post, updatedAt: Date.now() });
}

export async function deletePost(id: string) {
  const ref = doc(postsRef, id);
  await deleteDoc(ref);
}