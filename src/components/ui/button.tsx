import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const variants = cva('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-45', {
  variants: { variant: { default: 'bg-accent text-accent-ink hover:bg-accent-hover', secondary: 'bg-surface-2 text-foreground hover:bg-surface-3', outline: 'border border-line bg-transparent text-foreground hover:bg-surface-2', ghost: 'text-muted hover:bg-surface-2 hover:text-foreground', danger: 'bg-danger/10 text-danger hover:bg-danger/20' }, size: { default: 'h-10 px-4', sm: 'h-8 px-3 text-xs', lg: 'h-12 px-5', icon: 'h-9 w-9' } }, defaultVariants: { variant: 'default', size: 'default' },
})
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> { asChild?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(variants({ variant, size }), className)} ref={ref} {...props} />
})
Button.displayName = 'Button'
