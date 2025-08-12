import * as React from 'react'
export function Badge({ className='', ...props }: React.HTMLAttributes<HTMLSpanElement>){
  return <span className={`inline-flex items-center px-2.5 py-1 text-xs rounded-full border ${className}`} {...props} />
}
