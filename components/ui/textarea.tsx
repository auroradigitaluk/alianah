import * as React from "react"

import { cn, toTitleCaseLive } from "@/lib/utils"

interface TextareaProps extends React.ComponentProps<"textarea"> {
  transform?: "titleCase"
}

function Textarea({ className, transform, onChange, ...props }: TextareaProps) {
  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (transform === "titleCase" && onChange) {
        const transformed = toTitleCaseLive(e.target.value)
        onChange({
          ...e,
          target: { ...e.target, value: transformed },
        } as React.ChangeEvent<HTMLTextAreaElement>)
        return
      }
      onChange?.(e)
    },
    [onChange, transform]
  )

  return (
    <textarea
      data-slot="textarea"
      data-transform={transform}
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
      onChange={transform === "titleCase" ? handleChange : onChange}
    />
  )
}

export { Textarea }
