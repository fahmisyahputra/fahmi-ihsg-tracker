"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface LoginFormProps {
  loginAction: (formData: FormData) => Promise<void>;
  signupAction: (formData: FormData) => Promise<void>;
}

export function LoginForm({ loginAction, signupAction }: LoginFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true);
    try {
      if (isSignUp) {
        await signupAction(formData);
      } else {
        await loginAction(formData);
      }
    } catch {
      // Redirect errors are thrown — this is expected behavior
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      {/* Tab Toggle */}
      <div className="flex rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => setIsSignUp(false)}
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
            !isSignUp
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => setIsSignUp(true)}
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
            isSignUp
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Sign Up
        </button>
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          autoComplete="email"
        />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-sm font-medium text-foreground"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="••••••••"
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          autoComplete={isSignUp ? "new-password" : "current-password"}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="mt-1 flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending
          ? "Please wait..."
          : isSignUp
            ? "Create Account"
            : "Log In"}
      </button>
    </form>
  );
}
