import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './Button.css'

export type ButtonVariant = 'primary' | 'ghost' | 'danger'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  children: ReactNode
}

export function Button({ variant = 'primary', className, ...props }: Props) {
  const cn = className ? `btn btn--${variant} ${className}` : `btn btn--${variant}`
  return <button {...props} className={cn} />
}

