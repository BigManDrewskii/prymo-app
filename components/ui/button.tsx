import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-[#2a2a2a] text-[#f0f0f0] hover:bg-[#333333] shadow-sm border border-[#444444]/30',
        destructive: 'bg-[#442222] text-[#f0c0c0] hover:bg-[#552222] shadow-sm border border-[#662222]/30',
        outline: 'border border-[#444444]/50 bg-transparent hover:bg-[#333333] hover:border-[#666666]',
        secondary: 'bg-[#222222] text-[#d0d0d0] hover:bg-[#2a2a2a] shadow-sm border border-[#333333]/50',
        ghost: 'bg-transparent hover:bg-[#333333] text-[#d0d0d0]',
        link: 'text-[#6699cc] underline-offset-4 hover:underline bg-transparent',
        success: 'bg-[#224422] text-[#a0e0a0] hover:bg-[#225522] shadow-sm border border-[#336633]/30',
        warning: 'bg-[#554422] text-[#f0e0a0] hover:bg-[#665522] shadow-sm border border-[#886633]/30',
        primary: 'bg-[#223344] text-[#a0c0e0] hover:bg-[#224455] shadow-sm border border-[#336699]/30',
        accent: 'bg-[#332244] text-[#d0b0e0] hover:bg-[#442255] shadow-sm border border-[#553366]/30',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-11 rounded-xl px-8',
        icon: 'h-9 w-9 rounded-lg',
      },
      state: {
        idle: '',
        loading: 'opacity-90 cursor-wait',
        disabled: 'bg-[#1a1a1a] text-[#888888] border-[#333333]/30 cursor-not-allowed',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      state: 'idle',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, state, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, state, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
