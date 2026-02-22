'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2, Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!email || !password) {
        setError('Please enter both email and password');
        setIsSubmitting(false);
        return;
      }

      await login(email, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/20 rounded-lg">
              <Shield size={32} className="text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">SOAR X</h1>
          <p className="text-muted-foreground">Security Operations Center Platform</p>
        </div>

        {/* Login Form */}
        <Card className="bg-card border border-border p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-start gap-3">
                <AlertCircle size={18} className="text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@soar.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="space-y-2 pt-4 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Demo Credentials</p>
            <div className="space-y-2 text-xs">
              <div className="bg-secondary/50 rounded p-2">
                <p className="text-foreground font-mono">admin@soar.com / admin123</p>
              </div>
              <div className="bg-secondary/50 rounded p-2">
                <p className="text-foreground font-mono">analyst@soar.com / analyst123</p>
              </div>
              <div className="bg-secondary/50 rounded p-2">
                <p className="text-foreground font-mono">viewer@soar.com / viewer123</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Enterprise Security Operations Center • Powered by Explainable AI
        </p>
      </div>
    </div>
  );
}
