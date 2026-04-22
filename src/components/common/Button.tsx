interface ButtonProps {
  children: React.ReactNode;
  color?: "primary" | "secondary" | "gray" | "warning";
  size?: "sm" | "md" | "lg";
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  color = "primary",
  size = "md",
  onClick,
  type = "button",
  disabled = false,
  className = "",
}) => {
  const sizeClasses = {
    sm: "min-h-9 px-3 sm:px-4 py-2 text-xs sm:text-sm",
    md: "min-h-10 sm:min-h-11 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base",
    lg: "min-h-11 sm:min-h-12 px-5 sm:px-8 py-3 sm:py-4 text-base sm:text-lg",
  };

  const colorClasses = {
    primary: "bg-primary text-white",
    secondary: "bg-secondary text-white",
    gray: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    warning: "bg-warning text-white",
  };

  const baseClasses =
    "rounded-lg font-medium leading-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
  const disabledClasses = "opacity-50 cursor-not-allowed";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses[size]} ${colorClasses[color]} ${
        disabled ? disabledClasses : ""
      } ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
