import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function Dialog({ open, onOpenChange, title, children, wide = false }: { open: boolean; onOpenChange: (value: boolean) => void; title: string; children: ReactNode; wide?: boolean }) {
  return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[3px] data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content className={`fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100vw-28px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[22px] border border-line bg-surface p-5 shadow-2xl outline-none sm:p-7 ${wide ? 'max-w-2xl' : 'max-w-lg'}`}>
        <div className="mb-5 flex items-start justify-between gap-4"><DialogPrimitive.Title className="text-xl font-bold tracking-tight">{title}</DialogPrimitive.Title><DialogPrimitive.Close className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-foreground" aria-label="Close"><X size={20} /></DialogPrimitive.Close></div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
}
