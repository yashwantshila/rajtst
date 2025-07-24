#!/usr/bin/env python3
# wordpress_automator.py
# Main script to automate blog creation, MCQ generation, and publishing based on Firestore triggers.
# Version 5.0 - Daily Challenges Update

import os
import google.generativeai as genai
from wordpress_xmlrpc import Client, WordPressPost
from wordpress_xmlrpc.methods.posts import NewPost, GetPost
from wordpress_xmlrpc.methods.users import GetUserInfo
import firebase_admin
from firebase_admin import credentials, firestore
import time
import re
import json
from dotenv import load_dotenv

# --- CONFIGURATION ---
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
WORDPRESS_URL = os.getenv("WORDPRESS_URL")
WORDPRESS_USER = os.getenv("WORDPRESS_USER")
WORDPRESS_APP_PASSWORD = os.getenv("WORDPRESS_APP_PASSWORD")
FIREBASE_SERVICE_ACCOUNT_KEY_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_PATH")

required_vars = {
    "GEMINI_API_KEY": GEMINI_API_KEY,
    "WORDPRESS_URL": WORDPRESS_URL,
    "WORDPRESS_USER": WORDPRESS_USER,
    "WORDPRESS_APP_PASSWORD": WORDPRESS_APP_PASSWORD,
    "FIREBASE_SERVICE_ACCOUNT_KEY_PATH": FIREBASE_SERVICE_ACCOUNT_KEY_PATH
}

missing_vars = [key for key, value in required_vars.items() if not value]
if missing_vars:
    print(f"Missing required environment variables: {', '.join(missing_vars)}")
    exit(1)


def configure_gemini():
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        return True
    except Exception as e:
        print(f"Error configuring Gemini API: {e}")
        return False


def get_wordpress_client():
    try:
        client = Client(WORDPRESS_URL, WORDPRESS_USER, WORDPRESS_APP_PASSWORD)
        client.call(GetUserInfo())
        return client
    except Exception as e:
        print(f"Error connecting to WordPress: {e}")
        return None


def initialize_firestore():
    if not firebase_admin._apps:
        try:
            cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_KEY_PATH)
            firebase_admin.initialize_app(cred)
            return firestore.client()
        except Exception as e:
            print(f"Error initializing Firestore: {e}")
            return None
    else:
        return firestore.client()


def parse_generated_response(response_text):
    try:
        primary_match = re.search(r"TITLE:(.*?)\nCONTENT:(.*)", response_text, re.DOTALL)
        if primary_match:
            title = primary_match.group(1).strip()
            content = primary_match.group(2).strip()
            if content.startswith("```html"):
                content = content.replace("```html", "", 1).strip()
            if content.endswith("```"):
                content = content[:-3].strip()
            body_match = re.search(r"<body.*?>(.*?)</body>", content, re.DOTALL)
            if body_match:
                content = body_match.group(1).strip()
            if title and content:
                return title, content
        return None, None
    except Exception as e:
        print(f"Error parsing response: {e}")
        return None, None


def generate_blog_content(topic, post_type):
    model = genai.GenerativeModel('gemini-2.5-flash-preview-05-20')
    prompt_templates = {
        "Beginner": f"You are an expert blogger creating study guides. Your task is to generate a complete, SEO-friendly, and high-quality blog post of approximately 500 words for absolute beginners studying for a test on '{topic}'. The output MUST follow the exact format below, with no extra text or explanations. Do not include `<html>` or `<body>` tags. \n\nTITLE: A single, catchy, SEO-friendly title like 'A Beginner's Study Guide to {topic}'\nCONTENT: Start with a short, encouraging paragraph like '<p><strong>Preparing for your upcoming test on {topic}? You're in the right place! This guide is designed to help you master the basics and build a strong foundation for a great score.</strong></p>'. Then, write the full HTML content for the WordPress editor, using <h2>, <h3>, <p>, and <strong> tags for readability.",
        "Deep Dive": f"You are a technical writer creating study guides. Your task is to generate a complete, SEO-friendly, and insightful blog post of approximately 500 words for advanced students studying for a test on '{topic}'. The output MUST follow the exact format below, with no extra text or explanations. Do not include `<html>` or `<body>` tags. \n\nTITLE: A single, insightful, SEO-friendly title like 'A Deep Dive into {topic} for Exam Success'\nCONTENT: Start with a short, motivating paragraph like '<p><strong>Aiming for top marks on your {topic} test? This deep dive will give you the edge. We will explore the advanced concepts you need to know to tackle the toughest questions.</strong></p>'. Then, write the full HTML content for the WordPress editor, using <h2>, <h3>, <p>, and <ul>/<li> tags for structure.",
        "Practical": f"You are a practical strategist creating study guides. Your task is to generate a complete, SEO-friendly, and compelling blog post of approximately 500 words about the practical, real-world applications of '{topic}' for a test. The output MUST follow the exact format below, with no extra text or explanations. Do not include `<html>` or `<body>` tags. \n\nTITLE: A single, action-oriented, SEO-friendly title like 'Practical {topic} Examples for Your Test'\nCONTENT: Start with a short, engaging paragraph like '<p><strong>Want to ace the application-based questions on your {topic} exam? This guide connects theory to the real world, giving you the practical examples you need to solve problems with confidence.</strong></p>'. Then, write the full HTML content for the WordPress editor, using <h2>, <h3>, <p>, and bullet points for clarity."
    }
    prompt_text = prompt_templates.get(post_type)
    try:
        response = model.generate_content(prompt_text)
        return parse_generated_response(response.text)
    except Exception as e:
        print(f"Error generating content with Gemini: {e}")
        return None, None


def generate_mcqs(combined_content):
    model = genai.GenerativeModel('gemini-2.5-flash-preview-05-20')
    prompt = f"""
    You are an expert test creator. Your task is to create exactly 20 multiple-choice questions (MCQs) based ONLY on the provided text content.

    You MUST return the output as a single, valid JSON array. Do not include any text, explanations, or markdown formatting like ```json before or after the JSON array. Each object in the array must represent one question and follow this exact structure:
    {{
        "question_text": "The full text of the question?",
        "options": [
          {{"option_text": "Text for option A"}},
          {{"option_text": "Text for option B"}},
          {{"option_text": "Text for option C"}},
          {{"option_text": "Text for option D"}}
        ],
        "correct_answer": "The exact text of the correct option"
    }}

    Ensure there are exactly 4 options for each question. The `correct_answer` value must exactly match one of the `option_text` values.

    Here is the content to base the questions on:
    ---
    {combined_content}
    ---
    """
    try:
        response = model.generate_content(prompt)
        cleaned_response = response.text.strip().replace("```json", "").replace("```", "")
        questions = json.loads(cleaned_response)
        return questions
    except Exception as e:
        print(f"Error generating MCQs: {e}")
        return None


def generate_summary_post(topic, published_links):
    model = genai.GenerativeModel('gemini-2.5-flash-preview-05-20')
    links_html = "<ul>\n"
    for title, url in published_links.items():
        links_html += f'    <li><a href="{url}" target="_blank" rel="noopener noreferrer">{title}</a></li>\n'
    links_html += "</ul>"
    prompt = f"""
    You are a helpful blog editor creating a central study hub. Your task is to write a short, welcoming blog post (around 250 words) in simple language. The post will introduce the topic of '{topic}' as a study subject and link to a series of more detailed guides. The output MUST follow the exact format below, with no extra text or explanations. Do not include `<html>` or `<body>` tags.

    TITLE: A single, welcoming, SEO-friendly title like 'Your Ultimate Study Hub for the {topic} Test'
    CONTENT: Start with a friendly introduction like '<p><strong>Gearing up for your test on {topic}? We have created a complete study package to help you succeed! This post is your central hub, linking to all our guides—from beginner concepts to advanced applications—to help you prepare effectively.</strong></p>'. Then, include a section like '<h2>Explore Our In-Depth Study Guides</h2>' followed by this exact HTML list of links: {links_html}
    """
    try:
        response = model.generate_content(prompt)
        return parse_generated_response(response.text)
    except Exception as e:
        print(f"Error generating summary post: {e}")
        return None, None


def publish_to_wordpress(client, title, content):
    if not title or not content:
        return None, None
    post = WordPressPost()
    post.title = title
    post.content = content
    post.post_status = 'publish'
    post.terms_names = {'category': ['Tests']}
    try:
        post_id = client.call(NewPost(post))
        new_post = client.call(GetPost(post_id))
        post_url = new_post.link
        return title, post_url
    except Exception as e:
        print(f"Error publishing to WordPress: {e}")
        return None, None


def store_questions_in_firestore(db, doc_id, questions):
    if not questions:
        return
    questions_ref = db.collection('daily-challenges').document(doc_id).collection('questions')
    for q_data in questions:
        try:
            if 'options' not in q_data or not isinstance(q_data['options'], list) or len(q_data['options']) != 4:
                continue
            options_list = [opt['option_text'] for opt in q_data['options']]
            correct_answer_text = q_data.get('correct_answer')
            correct_answer_id = ''
            if correct_answer_text in options_list:
                correct_index = options_list.index(correct_answer_text)
                correct_answer_id = ['a', 'b', 'c', 'd'][correct_index]
            else:
                continue
            question_doc = {
                'text': q_data['question_text'],
                'options': options_list,
                'correctAnswer': correct_answer_id
            }
            questions_ref.add(question_doc)
        except Exception:
            continue


def update_firestore_practice_url(db, doc_id, url):
    try:
        challenge_ref = db.collection('daily-challenges').document(doc_id)
        challenge_ref.update({'practiceUrl': url})
    except Exception as e:
        print(f"Error updating Firestore document {doc_id}: {e}")


def process_document(db, wp_client, doc):
    doc_id = doc.id
    doc_data = doc.to_dict()
    topic = doc_data.get('keyword')
    if not topic:
        return
    post_types = ["Beginner", "Deep Dive", "Practical"]
    published_links = {}
    all_blog_content = ""
    for post_type in post_types:
        title, content = generate_blog_content(topic, post_type)
        if title and content:
            all_blog_content += f"<h2>{title}</h2>\n{content}\n\n"
            time.sleep(2)
            pub_title, pub_url = publish_to_wordpress(wp_client, title, content)
            if pub_title and pub_url:
                published_links[pub_title] = pub_url
    if all_blog_content:
        mcqs = generate_mcqs(all_blog_content)
        if mcqs:
            store_questions_in_firestore(db, doc_id, mcqs)
    if len(published_links) < len(post_types):
        return
    summary_title, summary_content = generate_summary_post(topic, published_links)
    if summary_title and summary_content:
        time.sleep(2)
        _, summary_url = publish_to_wordpress(wp_client, summary_title, summary_content)
        if summary_url:
            update_firestore_practice_url(db, doc_id, summary_url)


def main():
    if not configure_gemini():
        return
    wp_client = get_wordpress_client()
    if not wp_client:
        return
    db = initialize_firestore()
    if not db:
        return
    try:
        docs_ref = db.collection('daily-challenges')
        all_docs = list(docs_ref.stream())
        if not all_docs:
            print("No documents found")
            return
    except Exception as e:
        print(f"Error fetching documents: {e}")
        return
    for doc in all_docs:
        process_document(db, wp_client, doc)


if __name__ == "__main__":
    main()
