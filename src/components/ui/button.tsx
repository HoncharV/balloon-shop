import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary to-[#ff8fc6] text-primary-foreground shadow-soft hover:shadow-pop active:scale-[0.97]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-soft hover:brightness-[1.03] active:scale-[0.97]",
        outline:
          "border-2 border-input bg-white text-foreground hover:border-primary hover:text-primary active:scale-[0.97]",
        ghost: "bg-transparent text-foreground hover:bg-muted active:scale-[0.97]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-soft hover:brightness-[1.05] active:scale-[0.97]",
        gold: "bg-accent text-accent-foreground shadow-soft hover:shadow-pop active:scale-[0.97]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 rounded-md px-3.5 text-sm",
        default: "h-11 rounded-md px-5 text-sm",
        lg: "h-12 rounded-lg px-7 text-base",
        xl: "h-14 rounded-xl px-9 text-base",
        icon: "size-11 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
