"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RESTAURANT_CONFIG } from "@/lib/config";
import { createClient } from "@/lib/supabase-browser";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type LoginValues = z.infer<typeof loginSchema>;

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const errorParam = searchParams.get("error");
  const safeRedirect =
    nextPath && nextPath.startsWith("/admin") && nextPath !== "/admin/login"
      ? nextPath
      : "/admin/orders";

  const [showPassword, setShowPassword] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(
    errorParam === "unauthorized"
      ? "Access denied. This account does not have staff permissions."
      : null
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    setAuthError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error || !data.user) {
        throw new Error("Invalid email or password. Please check and try again.");
      }

      const { data: staffProfile, error: staffError } = await supabase
        .from("staff_profiles")
        .select("id, name, role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (staffError || !staffProfile) {
        await supabase.auth.signOut();
        throw new Error(
          "Access denied. This account is not registered as restaurant staff."
        );
      }

      toast.success(`Welcome back, ${staffProfile.name}`);
      router.push(safeRedirect);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to sign in right now. Please try again.";
      setAuthError(message);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col justify-between px-4 py-6">
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2.5 font-heading text-sm font-semibold"
        >
          <BrandLogo size={32} priority decorative className="size-8 rounded-lg" />
          <span>{RESTAURANT_CONFIG.name}</span>
        </Link>
        <ThemeToggle />
      </div>

      <main className="mx-auto my-8 w-full max-w-md">
        <Card className="rounded-2xl shadow-md">
          <CardHeader className="space-y-1 border-b border-border/60 pb-4">
            <CardTitle>
              <h1 className="font-heading text-xl font-bold">Staff Login</h1>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Sign in with your restaurant staff credentials.
            </p>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="staff-email" className="block text-sm font-medium">
                  Email <span aria-hidden="true">*</span>
                </label>
                <Input
                  id="staff-email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  required
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "staff-email-error" : undefined}
                  placeholder="staff@restaurant.com"
                  className="h-11 rounded-xl"
                  {...register("email")}
                />
                {errors.email && (
                  <p
                    id="staff-email-error"
                    className="text-xs font-medium text-destructive"
                  >
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="staff-password"
                  className="block text-sm font-medium"
                >
                  Password <span aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="staff-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    enterKeyHint="done"
                    required
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? "staff-password-error" : undefined
                    }
                    placeholder="Enter password"
                    className="h-11 rounded-xl pr-11"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    aria-pressed={showPassword}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p
                    id="staff-password-error"
                    className="text-xs font-medium text-destructive"
                  >
                    {errors.password.message}
                  </p>
                )}
              </div>

              {authError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs font-medium text-destructive"
                >
                  <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                  <span>{authError}</span>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="min-h-11 w-full rounded-xl font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign in</span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <footer className="text-center text-xs text-muted-foreground">
        <Link href="/" className="underline underline-offset-4 hover:text-foreground">
          Back to customer menu
        </Link>
      </footer>
    </div>
  );
}
