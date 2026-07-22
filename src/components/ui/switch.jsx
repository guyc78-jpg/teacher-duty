import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    className={cn(
      "group relative inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    <span style={{ transitionDuration: "160ms" }} className="pointer-events-none absolute h-6 w-11 rounded-full bg-muted-foreground/25 shadow-inner transition-colors group-data-[state=checked]:bg-primary" />
    <SwitchPrimitives.Thumb style={{ transitionDuration: "160ms" }} className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-background shadow-md ring-0 transition-[left] group-data-[state=checked]:left-[22px]" />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }