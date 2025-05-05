import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Dialog Component
const Dialog = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 flex items-center justify-center",
      className
    )}
    {...props}
  >
    <div className="fixed inset-0 bg-black/50" />
    <div className="relative z-10 rounded-md border bg-background p-6 shadow-sm">
      {children}
    </div>
  </div>
));

Dialog.displayName = "Dialog";

// DialogTitle Component
const DialogTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("text-lg font-semibold", className)} {...props}>
    {children}
  </div>
));

DialogTitle.displayName = "DialogTitle";

// DialogContent Component
const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("mt-4", className)} {...props}>
    {children}
  </div>
));

DialogContent.displayName = "DialogContent";

// DialogActions Component
const DialogActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mt-4 flex justify-end space-x-2", className)}
    {...props}
  >
    {children}
  </div>
));

DialogActions.displayName = "DialogActions";

// DialogButton Component
const DialogButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "px-4 py-2 rounded text-white bg-blue-500 hover:bg-blue-600",
      className
    )}
    {...props}
  >
    {children}
  </button>
));

DialogButton.displayName = "DialogButton";

// Close Button Component
const DialogCloseButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "absolute top-2 right-2 text-gray-600 hover:text-gray-900",
      className
    )}
    {...props}
  >
    &times;
  </button>
));

DialogCloseButton.displayName = "DialogCloseButton";

export {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogButton,
  DialogCloseButton,
};
