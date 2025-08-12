import * as React from 'react'
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
export function Textarea({ className='', ...props }: TextareaProps){
  return <textarea className={`w-full resize-vertical rounded-lg px-3 py-2 outline-none focus:outline-none ${className}`} {...props} />
}
