
'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getMembers } from '@/app/actions';

const ADMIN_PASSWORD = 'admin';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Admin Login
    if (username.toLowerCase() === 'admin') {
      if (password === ADMIN_PASSWORD) {
        toast({ title: 'Login Successful', description: 'Welcome, Admin!' });
        login({ name: 'admin', role: 'admin' });
      } else {
        setError('Incorrect password for admin.');
      }
      setIsSubmitting(false);
      return;
    }

    // Team Member Login
    try {
      const membersData = await getMembers();
      if (!membersData.values || membersData.values.length === 0) {
        setError('No members found in the system.');
        setIsSubmitting(false);
        return;
      }
      
      const memberHeaders = membersData.values[0];
      const nameIndex = memberHeaders.indexOf('Name');
      const members = membersData.values.slice(1);

      if (nameIndex === -1) {
        setError('Member data sheet is not configured correctly (Missing Name column).');
        setIsSubmitting(false);
        return;
      }

      const member = members.find(m => m[nameIndex]?.toLowerCase() === username.toLowerCase());

      if (member) {
        const expectedPassword = `${member[nameIndex]}123`;
        if (password === expectedPassword) {
            toast({ title: 'Login Successful', description: `Welcome, ${member[nameIndex]}!` });
            login({ name: member[nameIndex], role: 'member' });
        } else {
            setError('Incorrect password.');
        }
      } else {
        setError('User not found.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during login. Please try again.');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
      <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Enter your credentials to access your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your name or 'admin'"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}
