import { Request, Response } from 'express';
import { db } from '../config/firebase.js';
import slugify from 'slugify';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const createBlogPost = async (req: Request, res: Response) => {
  try {
    const { title, pdfUrl } = req.body as { title?: string; pdfUrl?: string };
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const slug = slugify(title, { lower: true, strict: true });
    let content = '';

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = `Write a concise SEO friendly blog post titled "${title}". ${pdfUrl ? `Use relevant information from this PDF: ${pdfUrl}.` : ''}`;
      const result = await model.generateContent(prompt);
      // @ts-ignore
      content = result?.response?.text() || '';
    } catch (err) {
      console.error('Error generating blog content:', err);
      return res.status(500).json({ error: 'Failed to generate blog content' });
    }

    await db.collection('blogPosts').doc(slug).set({
      title,
      slug,
      pdfUrl: pdfUrl || null,
      content,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ slug });
  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).json({ error: 'Failed to create blog post' });
  }
};

export const getBlogPosts = async (_req: Request, res: Response) => {
  try {
    const snap = await db.collection('blogPosts').orderBy('createdAt', 'desc').get();
    const posts = snap.docs.map((d) => d.data());
    res.json(posts);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
};

export const getBlogPostBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const doc = await db.collection('blogPosts').doc(slug).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(doc.data());
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
};
