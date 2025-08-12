import './globals.css'
import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Prymo • AI Prompt Enhancement',
  description: 'Modern app to enhance your prompts with Groq AI and export as Markdown'
}

export default function RootLayout({ children }: { children: React.ReactNode }){
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
