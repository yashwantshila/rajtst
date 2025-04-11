# Backend Server

This is the backend server for the application, built with Express.js and TypeScript.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration:
- Set the `PORT` if you want to use a different port (default: 5000)
- Add your Firebase Admin SDK credentials in the `FIREBASE_ADMIN_CREDENTIALS` variable

## Development

Run the development server:
```bash
npm run dev
```

The server will start with hot-reload enabled.

## Production

Build the project:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Project Structure

```
backend/
├── src/              # Source files
│   ├── index.ts     # Main application file
│   ├── routes/      # Route handlers
│   ├── controllers/ # Business logic
│   ├── models/      # Data models
│   └── middleware/  # Custom middleware
├── dist/            # Compiled files
├── .env             # Environment variables
└── package.json     # Project dependencies
```

## API Endpoints

- `GET /health` - Health check endpoint

More endpoints will be added as needed. 