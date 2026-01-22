"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Step {
  id: string
  label: string
  icon?: React.ReactNode
}

interface DonationStepperProps {
  currentStep: string
  steps: Step[]
}

export function DonationStepper({ currentStep, steps }: DonationStepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep)

  return (
    <div className="w-full py-4 md:py-6">
      <div className="flex items-center justify-between relative px-2">
        {/* Connection line - using theme colors */}
        <div className="absolute top-5 left-0 right-0 h-px bg-border -z-10" 
          style={{
            left: 'calc(2rem + 0.5rem)',
            right: 'calc(2rem + 0.5rem)',
          }}
        />
        
        {steps.map((step, index) => {
          const isActive = index === currentIndex
          const isCompleted = index < currentIndex
          const isUpcoming = index > currentIndex

          return (
            <div key={step.id} className="flex flex-col items-center relative z-10 flex-1">
              {/* Step circle */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200",
                  "bg-background",
                  isActive && "bg-primary border-primary text-primary-foreground shadow-md scale-110",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isUpcoming && "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : step.icon ? (
                  <div className={cn(
                    "w-5 h-5",
                    isActive ? "text-primary-foreground" : "text-muted-foreground"
                  )}>
                    {step.icon}
                  </div>
                ) : (
                  <span className={cn(
                    "text-sm font-semibold",
                    isActive ? "text-primary-foreground" : "text-muted-foreground"
                  )}>
                    {index + 1}
                  </span>
                )}
              </div>
              
              {/* Step label */}
              <span
                className={cn(
                  "mt-2 text-xs font-medium uppercase whitespace-nowrap transition-colors",
                  isActive && "text-primary font-semibold",
                  isCompleted && "text-primary",
                  isUpcoming && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
