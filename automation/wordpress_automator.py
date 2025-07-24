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

# --- CONFIGURATION ---
# Please create a config.py file with the following variables:
# GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"
# WORDPRESS_URL = "https://your-wordpress-site.com/xmlrpc.php"
# WORDPRESS_USER = "your_wordpress_username"
# WORDPRESS_APP_PASSWORD = "your_wordpress_application_password"
# FIREBASE_SERVICE_ACCOUNT_KEY_PATH = "path/to/your/firebase-service-account-key.json"

try:
    from config import GEMINI_API_KEY, WORDPRESS_URL, WORDPRESS_USER, WORDPRESS_APP_PASSWORD, FIREBASE_SERVICE_ACCOUNT_KEY_PATH
except ImportError:
    print("❌ Error: config.py not found or missing required variables.")
    print("Please create it with GEMINI_API_KEY, WORDPRESS_URL, WORDPRESS_USER, WORDPRESS_APP_PASSWORD, and FIREBASE_SERVICE_ACCOUNT_KEY_PATH.")
    exit()

# --- INITIALIZATION FUNCTIONS ---

def configure_gemini():
    """Configures the Gemini API with the provided key."""
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        print("✅ Gemini API configured successfully.")
        return True
    except Exception as e:
        print(f"❌ Error configuring Gemini API: {e}")
        return False

def get_wordpress_client():
    """Initializes and returns the WordPress XML-RPC client."""
    try:
        client = Client(WORDPRESS_URL, WORDPRESS_USER, WORDPRESS_APP_PASSWORD)
        client.call(GetUserInfo())
        print("✅ WordPress connection successful.")
        return client
    except Exception as e:
        print(f"❌ Error connecting to WordPress: {e}")
        return None

def initialize_firestore():
    """Initializes the Firebase Admin SDK and returns a Firestore client."""
    if not firebase_admin._apps:
        try:
            cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_KEY_PATH)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            print("✅ Firestore connection successful.")
            return db
        except Exception as e:
            print(f"❌ Error initializing Firestore: {e}")
            print("Please ensure your FIREBASE_SERVICE_ACCOUNT_KEY_PATH in config.py is correct.")
            return None
    else:
        return firestore.client()

# --- CONTENT & MCQ GENERATION ---

def parse_generated_response(response_text):
    """Parses the blog post response from the Gemini API."""
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
                print("   - Successfully parsed AI response for blog post.")
                return title, content
        print("   - ❌ Error: Could not parse the AI blog post response.")
        return None, None
    except Exception as e:
        print(f"   - ❌ An exception occurred during blog post parsing: {e}")
        return None, None

def generate_blog_content(topic, post_type):
    """Generates a blog post using a structured prompt."""
    model = genai.GenerativeModel('gemini-1.5-flash')
    prompt_templates = {
        "Beginner": f"You are an expert blogger creating study guides. Your task is to generate a complete, SEO-friendly, and high-quality blog post of approximately 500 words for absolute beginners studying for a test on '{topic}'. The output MUST follow the exact format below, with no extra text or explanations. Do not include `<html>` or `<body>` tags. \n\nTITLE: A single, catchy, SEO-friendly title like 'A Beginner's Study Guide to {topic}'\nCONTENT: Start with a short, encouraging paragraph like '<p><strong>Preparing for your upcoming test on {topic}? You're in the right place! This guide is designed to help you master the basics and build a strong foundation for a great score.</strong></p>'. Then, write the full HTML content for the WordPress editor, using <h2>, <h3>, <p>, and <strong> tags for readability.",
        "Deep Dive": f"You are a technical writer creating study guides. Your task is to generate a complete, SEO-friendly, and insightful blog post of approximately 500 words for advanced students studying for a test on '{topic}'. The output MUST follow the exact format below, with no extra text or explanations. Do not include `<html>` or `<body>` tags. \n\nTITLE: A single, insightful, SEO-friendly title like 'A Deep Dive into {topic} for Exam Success'\nCONTENT: Start with a short, motivating paragraph like '<p><strong>Aiming for top marks on your {topic} test? This deep dive will give you the edge. We will explore the advanced concepts you need to know to tackle the toughest questions.</strong></p>'. Then, write the full HTML content for the WordPress editor, using <h2>, <h3>, <p>, and <ul>/<li> tags for structure.",
        "Practical": f"You are a practical strategist creating study guides. Your task is to generate a complete, SEO-friendly, and compelling blog post of approximately 500 words about the practical, real-world applications of '{topic}' for a test. The output MUST follow the exact format below, with no extra text or explanations. Do not include `<html>` or `<body>` tags. \n\nTITLE: A single, action-oriented, SEO-friendly title like 'Practical {topic} Examples for Your Test'\nCONTENT: Start with a short, engaging paragraph like '<p><strong>Want to ace the application-based questions on your {topic} exam? This guide connects theory to the real world, giving you the practical examples you need to solve problems with confidence.</strong></p>'. Then, write the full HTML content for the WordPress editor, using <h2>, <h3>, <p>, and bullet points for clarity."
    }
    prompt_text = prompt_templates.get(post_type)
    print(f"   - Generating '{post_type}' post for topic: '{topic}'...")
    try:
        response = model.generate_content(prompt_text)
        return parse_generated_response(response.text)
    except Exception as e:
        print(f"   - ❌ An error occurred while generating content with Gemini: {e}")
        return None, None

def generate_mcqs(combined_content):
    """Generates 20 MCQs based on the combined text of the blog posts."""
    model = genai.GenerativeModel('gemini-1.5-flash')
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
    print("   - Generating 20 MCQs from blog content...")
    try:
        response = model.generate_content(prompt)
        cleaned_response = response.text.strip().replace("```json", "").replace("```", "")
        questions = json.loads(cleaned_response)
        print(f"   - ✅ Successfully generated and parsed {len(questions)} MCQs.")
        return questions
    except json.JSONDecodeError as e:
        print(f"   - ❌ Failed to decode JSON from AI response: {e}")
        print(f"   - Raw response was: {response.text}")
        return None
    except Exception as e:
        print(f"   - ❌ An error occurred while generating MCQs: {e}")
        return None

def generate_summary_post(topic, published_links):
    """Generates the summary post content."""
    model = genai.GenerativeModel('gemini-1.5-flash')
    links_html = "<ul>\n"
    for title, url in published_links.items():
        links_html += f'    <li><a href="{url}" target="_blank" rel="noopener noreferrer">{title}</a></li>\n'
    links_html += "</ul>"
    prompt = f"""
    You are a helpful blog editor creating a central study hub. Your task is to write a short, welcoming blog post (around 250 words) in simple language. The post will introduce the topic of '{topic}' as a study subject and link to a series of more detailed guides. The output MUST follow the exact format below, with no extra text or explanations. Do not include `<html>` or `<body>` tags.

    TITLE: A single, welcoming, SEO-friendly title like 'Your Ultimate Study Hub for the {topic} Test'
    CONTENT: Start with a friendly introduction like '<p><strong>Gearing up for your test on {topic}? We have created a complete study package to help you succeed! This post is your central hub, linking to all our guides—from beginner concepts to advanced applications—to help you prepare effectively.</strong></p>'. Then, include a section like '<h2>Explore Our In-Depth Study Guides</h2>' followed by this exact HTML list of links: {links_html}
    """
    print("   - Generating summary post...")
    try:
        response = model.generate_content(prompt)
        return parse_generated_response(response.text)
    except Exception as e:
        print(f"   - ❌ An error occurred while generating the summary post: {e}")
        return None, None

# --- WORDPRESS & FIRESTORE OPERATIONS ---

def publish_to_wordpress(client, title, content):
    """Publishes a post to WordPress and returns its title and URL."""
    if not title or not content:
        print("   - ❌ Publishing failed: Title or content is missing.")
        return None, None
    print(f"   - Publishing post: '{title}'...")
    post = WordPressPost()
    post.title = title
    post.content = content
    post.post_status = 'publish'
    post.terms_names = {'category': ['Tests']}
    try:
        post_id = client.call(NewPost(post))
        new_post = client.call(GetPost(post_id))
        post_url = new_post.link
        print(f"   - ✅ Successfully published! URL: {post_url}")
        return title, post_url
    except Exception as e:
        print(f"   - ❌ Error publishing to WordPress: {e}")
        return None, None

def store_questions_in_firestore(db, doc_id, questions):
    """Stores the generated MCQs in a Firestore subcollection with the new structure."""
    if not questions:
        print("   - ⚠️ No questions to store.")
        return
    print(f"   - Storing {len(questions)} questions in Firestore for doc '{doc_id}'...")
    # Target the 'daily-challenges' collection
    questions_ref = db.collection('daily-challenges').document(doc_id).collection('questions')
    
    for q_data in questions:
        try:
            # Ensure there are options to process
            if 'options' not in q_data or not isinstance(q_data['options'], list) or len(q_data['options']) != 4:
                print(f"   - ⚠️ Skipping question due to invalid options: {q_data.get('question_text')}")
                continue

            # Create a simple list of strings for the options
            options_list = [opt['option_text'] for opt in q_data['options']]
            
            correct_answer_text = q_data.get('correct_answer')
            correct_answer_id = ''
            
            # Find the index of the correct answer to determine its ID ('a', 'b', 'c', 'd')
            if correct_answer_text in options_list:
                correct_index = options_list.index(correct_answer_text)
                correct_answer_id = ['a', 'b', 'c', 'd'][correct_index]
            else:
                print(f"   - ⚠️ Could not find correct answer text in options for question: {q_data['question_text']}")
                continue

            # Create the document with the new simplified structure
            question_doc = {
                'text': q_data['question_text'],
                'options': options_list,
                'correctAnswer': correct_answer_id
            }
            questions_ref.add(question_doc)
        except Exception as e:
            print(f"   - ❌ Error processing and storing a question: {e}")
            print(f"   - Faulty question data: {q_data}")
    print("   - ✅ Finished storing questions.")

def update_firestore_practice_url(db, doc_id, url):
    """Updates the practiceUrl field in a daily-challenges document."""
    try:
        # Target the 'daily-challenges' collection
        challenge_ref = db.collection('daily-challenges').document(doc_id)
        challenge_ref.update({'practiceUrl': url})
        print(f"   - ✅ Successfully updated Firestore doc '{doc_id}' with practice URL.")
    except Exception as e:
        print(f"   - ❌ Error updating Firestore document {doc_id}: {e}")

# --- MAIN WORKFLOW ---

def process_document(db, wp_client, doc):
    """Processes a single document from the daily-challenges collection."""
    doc_id = doc.id
    doc_data = doc.to_dict()
    topic = doc_data.get('keyword')

    if not topic:
        print(f"   - ⚠️ Skipping doc '{doc_id}': 'keyword' field is missing or empty.")
        return

    print(f"▶️ Processing Daily Challenge '{doc_id}' with keyword: '{topic}'")

    post_types = ["Beginner", "Deep Dive", "Practical"]
    published_links = {}
    all_blog_content = ""

    # 1. Generate and publish the 3 main articles
    for post_type in post_types:
        title, content = generate_blog_content(topic, post_type)
        if title and content:
            all_blog_content += f"<h2>{title}</h2>\n{content}\n\n"
            time.sleep(2)
            pub_title, pub_url = publish_to_wordpress(wp_client, title, content)
            if pub_title and pub_url:
                published_links[pub_title] = pub_url
        else:
            print(f"   - ⚠️ Skipping publishing for '{post_type}' due to content generation failure.")

    # 2. Generate and store MCQs if we have content
    if all_blog_content:
        mcqs = generate_mcqs(all_blog_content)
        if mcqs:
            store_questions_in_firestore(db, doc_id, mcqs)
    else:
        print(f"   - ⚠️ Skipping MCQ generation for '{doc_id}' because no blog content was created.")

    # 3. Check if we have enough articles to create a summary
    if len(published_links) < len(post_types):
        print(f"   - ❌ Aborting summary post for '{doc_id}'. Could not generate all required articles.")
        return

    # 4. Generate and publish the summary post
    print("   - All articles created, now creating summary post...")
    summary_title, summary_content = generate_summary_post(topic, published_links)
    
    if summary_title and summary_content:
        time.sleep(2)
        _, summary_url = publish_to_wordpress(wp_client, summary_title, summary_content)
        
        # 5. If summary post was successful, update Firestore
        if summary_url:
            update_firestore_practice_url(db, doc_id, summary_url)
        else:
            print(f"   - ❌ Failed to publish the summary post for '{doc_id}'. Firestore not updated.")
    else:
        print(f"   - ❌ Failed to generate the summary post content for '{doc_id}'.")

def main():
    """Main function to run the automation workflow."""
    print("--- WordPress & Firestore Automator (v5.0) ---")
    
    if not configure_gemini(): return
    wp_client = get_wordpress_client()
    if not wp_client: return
    db = initialize_firestore()
    if not db: return

    try:
        # Target the 'daily-challenges' collection
        collection_name = 'daily-challenges'
        print(f"\nFetching documents from '{collection_name}' collection...")
        docs_ref = db.collection(collection_name)
        all_docs = list(docs_ref.stream())
        if not all_docs:
            print(f"No documents found in '{collection_name}' collection. Exiting.")
            return
        print(f"Found {len(all_docs)} documents to process.")
    except Exception as e:
        print(f"❌ Could not fetch documents from Firestore: {e}")
        return

    for i, doc in enumerate(all_docs, 1):
        print(f"\n--- Starting Job {i}/{len(all_docs)} ---")
        process_document(db, wp_client, doc)
        
    print("\n--- All Jobs Complete ---")

if __name__ == "__main__":
    main()
