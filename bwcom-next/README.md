# BWCom Next

A Next.js application using CloudScape components for managing Brent's personal website

## Features

- Main dashboard
- Training Log
- Race History
- Reading List
- Resume
- Authentication with NextAuth
- Footer displaying version and environment

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Create a `.env.local` file with:

```
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
CLIENT_SECRET=your-client-secret
```

## Docker

To build and run with Docker:

```bash
docker build -t bwcom-next .
docker run -p 3000:3000 bwcom-next
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [CloudScape Design System](https://cloudscape.design/)
