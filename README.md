# sign2voice work

**Breaking barriers in workplace communication for the deaf and hard-of-hearing community.**

## Why This Project?

Millions of deaf and hard-of-hearing individuals who communicate using American Sign Language (ASL) face significant barriers in the workplace. Many struggle to find employment or advance in their careers simply because traditional communication methods don't accommodate sign language.

**sign2voice work** bridges this gap by providing real-time ASL-to-voice translation, enabling seamless communication in professional settings like job interviews, daily standups, and team meetings.

## Who Is This For?

- **Deaf and hard-of-hearing individuals** who use ASL as their primary language
- **Employers and HR teams** looking to create inclusive workplaces
- **Colleagues and team members** who want to communicate effectively with deaf coworkers
- **Job seekers** preparing for interviews where spoken communication is expected

## How It Works

1. **Camera Recognition** — The app uses your webcam to detect hand gestures in real-time using TensorFlow.js and MediaPipe
2. **ASL Fingerspelling** — Hold each ASL letter sign for ~0.8 seconds to add it to your message
3. **AI Voice Output** — When ready, trigger the AI agent (thumbs up gesture) to speak your message aloud using natural-sounding voice synthesis
4. **Two-Way Conversation** — The system facilitates back-and-forth communication in workplace scenarios

## Key Features

- Real-time hand detection and ASL alphabet recognition (A-Y)
- Natural voice synthesis powered by ElevenLabs
- Workplace-focused situation templates (interviews, meetings, etc.)
- Works entirely in the browser — no installation required
- Privacy-first: video processing happens locally

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **AI/ML**: TensorFlow.js, MediaPipe Hands, Fingerpose
- **Voice**: ElevenLabs Conversational AI
- **Styling**: Tailwind CSS 4

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
