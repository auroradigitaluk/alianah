import * as React from "react"

import { cn, toTitleCaseLive, toUpperCaseLive } from "@/lib/utils"

type InputTransform = "titleCase" | "uppercase"

interface InputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  transform?: InputTransform
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function Input({ className, type, transform, onChange, value, ...props }: InputProps) {
  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (transform && onChange) {
        const raw = e.target.value
        const transformed =
          transform === "titleCase" ? toTitleCaseLive(raw) : toUpperCaseLive(raw)
        onChange({
          ...e,
          target: { ...e.target, value: transformed },
        } as React.ChangeEvent<HTMLInputElement>)
        return
      }
      onChange?.(e)
    },
    [onChange, transform]
  )

  return (
    <input
      type={type}
      data-slot="input"
      data-transform={transform}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
      value={value}
      onChange={transform ? handleChange : onChange}
    />
  )
}

export { Input }
