import * as React from "react"
import { cn } from "@/lib/utils"

// Context para controlar o estado do dropdown
interface DropdownMenuContextType {
  open: boolean
  setOpen: (open: boolean) => void
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType | null>(null)

const useDropdownMenu = () => {
  const context = React.useContext(DropdownMenuContext)
  if (!context) {
    throw new Error("useDropdownMenu must be used within a DropdownMenu")
  }
  return context
}

// Componente principal do dropdown
const DropdownMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = React.useState(false)

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block z-50">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, onClick, asChild = false, ...props }, ref) => {
  const { open, setOpen } = useDropdownMenu()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(!open)
    onClick?.(e)
  }

  // If consumer wants the trigger to be rendered as the child element
  // (e.g. passing a `Button` component), clone that child and merge
  // props so we don't create nested <button> elements.
  if (asChild) {
    const child = React.Children.only(children) as React.ReactElement<Record<string, unknown>>

    const childProps = (child.props || {}) as { 
      onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
      className?: string
      type?: string
      [key: string]: unknown 
    }

    const mergedOnClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setOpen(!open)
      // call both child's and provided onClick handlers if present
      if (typeof childProps.onClick === 'function') childProps.onClick(e)
      if (typeof onClick === 'function') onClick(e)
    }

    // clone the child and merge props; forward ref by using the child's ref prop if present
    const cloned = React.cloneElement(child, {
      ...childProps,
      className: cn("inline-flex items-center justify-center", childProps.className, className),
      onClick: mergedOnClick,
      type: 'button', // Ensure it's a button type to prevent form submission
      'aria-expanded': open,
      'aria-haspopup': 'true',
      ...props,
    })

    return cloned
  }

  return (
    <button
      ref={ref}
      className={cn("inline-flex items-center justify-center", className)}
      onClick={handleClick}
      aria-expanded={open}
      aria-haspopup="true"
      {...props}
    >
      {children}
    </button>
  )
})
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "center" | "end" }
>(({ className, align = "start", children, ...props }, ref) => {
  const { open, setOpen } = useDropdownMenu()
  const contentRef = React.useRef<HTMLDivElement>(null)

  // Assign forwarded ref to the internal ref so outside click detection works
  const assignRef = (el: HTMLDivElement | null) => {
    contentRef.current = el
    if (!ref) return
    if (typeof ref === 'function') {
      try { ref(el) } catch {}
    } else {
      try { (ref as React.MutableRefObject<HTMLDivElement | null>).current = el } catch {}
    }
  }

  // Fecha o dropdown quando clica fora
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [open, setOpen])

  if (!open) return null

  return (
    <div
      ref={assignRef}
      className={cn(
        "absolute z-[9999] min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white p-1 shadow-lg",
        align === "start" && "left-0 top-full mt-1",
        align === "center" && "left-1/2 -translate-x-1/2 top-full mt-1",
        align === "end" && "right-0 top-full mt-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, onClick, ...props }, ref) => {
  const { setOpen } = useDropdownMenu()

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    onClick?.(e)
    setOpen(false) // Fecha o dropdown após o clique
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100",
        className
      )}
      onClick={handleClick}
      role="menuitem"
      {...props}
    >
      {children}
    </div>
  )
})
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuCheckboxItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 
    checked?: boolean 
    onCheckedChange?: (checked: boolean) => void
  }
>(({ className, children, checked, onCheckedChange, onClick, ...props }, ref) => {
  // not using setOpen here; checkbox doesn't automatically close the dropdown

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    onCheckedChange?.(!checked)
    onClick?.(e)
    // Não fecha o dropdown automaticamente para checkboxes
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100",
        className
      )}
      onClick={handleClick}
      role="menuitemcheckbox"
      aria-checked={checked}
      {...props}
    >
      <span className="mr-2 w-4 h-4 flex items-center justify-center">
        {checked ? "✓" : ""}
      </span>
      {children}
    </div>
  )
})
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem"

const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  >
    {children}
  </div>
))
DropdownMenuLabel.displayName = "DropdownMenuLabel"

const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-gray-200", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
}