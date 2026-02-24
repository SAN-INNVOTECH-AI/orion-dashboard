'use client'
import { clsx } from 'clsx'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={clsx(
          'bg-orion-card border border-orion-border rounded-2xl w-full flex flex-col max-h-[90vh]',
          {
            'max-w-md': size === 'sm',
            'max-w-lg': size === 'md',
            'max-w-2xl': size === 'lg',
          }
        )}
      >
        <div className="flex items-center justify-between p-6 border-b border-orion-border">
          <h3 className="text-orion-text font-semibold text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="text-orion-muted hover:text-orion-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
