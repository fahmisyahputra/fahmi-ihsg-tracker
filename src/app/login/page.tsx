import { login, signup } from "./actions";
import { LoginForm } from "./login-form";

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Stock<span className="text-primary">Tracker</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            IHSG Portfolio Performance Tracker
          </p>
        </div>

        {/* Feedback messages */}
        {params.error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-loss-muted px-4 py-3 text-sm text-destructive">
            {params.error}
          </div>
        )}
        {params.message && (
          <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
            {params.message}
          </div>
        )}

        {/* Login card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <LoginForm loginAction={login} signupAction={signup} />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your data is encrypted and secured with Supabase RLS.
        </p>
      </div>
    </div>
  );
}
