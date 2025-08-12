# Prymo

Prymo is a modern Next.js application that enhances your prompts via the Groq API using the powerful `moonshotai/kimi-k2-instruct` model. It provides a clean, intuitive interface for prompt enhancement with real-time streaming and convenient Markdown export.

## Installation Guide

### Prerequisites
- Node.js (v16 or newer)
- npm, yarn, or pnpm package manager

### Step 1: Clone the Repository
```bash
git clone https://github.com/BigManDrewskii/prompt-enhancer.git
cd prompt-enhancer
```

### Step 2: Install Dependencies
```bash
npm install
# or with yarn
yarn
# or with pnpm
pnpm install
```

### Step 3: Set Up Environment Variables
```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file and add your Groq API key
# GROQ_API_KEY=your_api_key_here
```

### Step 4: Run the Development Server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Once running, open [http://localhost:3000](http://localhost:3000) in your browser to use Prymo.

## Features

- **Intuitive UI**: The interface follows a clear 4-state workflow: idle → editing → enhancing → complete
- **Real-time Streaming**: See results as they generate with token streaming from Groq API
- **Consistent Hover Effects**: All modal components feature uniform hover styles for improved UX
- **Secure**: Your Groq API key is stored locally and never sent to any external servers
- **Markdown Export**: Easily copy enhanced prompts as Markdown with a single click

## Requirements

- A valid Groq API key (obtainable from [groq.com](https://groq.com))
- Modern web browser
