import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-terracota text-cream hover:bg-terracota/90",
  secondary: "bg-brown-dark text-cream hover:bg-brown-dark/90",
  ghost: "bg-transparent text-brown-dark hover:bg-brown-dark/5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-soft px-6 py-3 text-base font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
);
Button.displayName = "Button";
