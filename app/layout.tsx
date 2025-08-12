import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Prompt Enhancer • Groq + Kimi',
  description: 'Mini app to enhance prompts and copy as Markdown'
}

export default function RootLayout({ children }: { children: React.ReactNode }){
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
