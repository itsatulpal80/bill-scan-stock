import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, ArrowRight, Pill, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (mobile.length !== 10 || password.length < 4) {
      toast({ title: 'Invalid input', description: 'Enter valid mobile and password', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    let success = false;
    if (mode === 'login') success = await login(mobile, password);
    else success = await signup(mobile, password, undefined);
    setIsLoading(false);

    if (success) navigate('/dashboard');
    else toast({ title: 'Auth Failed', description: 'Check credentials or try signup', variant: 'destructive' });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header Section */}
      <div className="bg-primary px-6 pt-12 pb-16 rounded-b-[2rem]">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
            <Pill className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary-foreground">MedStock Pro</h1>
            <p className="text-primary-foreground/80 text-sm">Pharmacy Management</p>
          </div>
        </div>
        
        <h2 className="text-xl font-semibold text-primary-foreground mb-2">
          {mode === 'login' ? 'Welcome Back!' : 'Create account'}
        </h2>
        <p className="text-primary-foreground/70 text-sm">
          {mode === 'login'
            ? 'Enter your mobile number and password to login'
            : 'Create an account using your mobile number and password'
          }
        </p>
      </div>

      {/* Form Section */}
      <div className="flex-1 px-6 -mt-8">
        <div className="bg-card rounded-2xl p-6 card-elevated-lg">
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Mobile Number</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-muted-foreground">
                      <Smartphone className="w-5 h-5" />
                      <span className="font-medium">+91</span>
                    </div>
                    <Input type="tel" placeholder="9876543210" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} className="pl-24 h-14 text-lg font-medium" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Password</label>
                  <Input type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-14 text-lg" />
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => setMode('login')} variant={mode === 'login' ? undefined : 'ghost'} className="flex-1">Login</Button>
                  <Button onClick={() => setMode('signup')} variant={mode === 'signup' ? undefined : 'ghost'} className="flex-1">Sign up</Button>
                </div>

                <Button onClick={handleSubmit} disabled={isLoading || mobile.length !== 10 || password.length < 4} className="w-full h-14 text-base font-semibold touch-feedback">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ArrowRight className="w-5 h-5 ml-2" /> {mode === 'login' ? 'Login' : 'Create account'}</>}
                </Button>
                </div>
        </div>

        {/* Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            By logging in, you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
}
