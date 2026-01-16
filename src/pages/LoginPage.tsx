import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, ArrowRight, Pill, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSendOtp = async () => {
    if (mobile.length !== 10) {
      toast({
        title: 'Invalid Mobile',
        description: 'Please enter a valid 10-digit mobile number',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    // Simulate OTP send
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setStep('otp');
    
    toast({
      title: 'OTP Sent',
      description: 'Demo: Use any 4-digit OTP to login',
    });
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 4) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter a valid 4-digit OTP',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const success = await login(mobile, otp);
    setIsLoading(false);

    if (success) {
      navigate('/dashboard');
    } else {
      toast({
        title: 'Login Failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
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
          {step === 'mobile' ? 'Welcome Back!' : 'Verify OTP'}
        </h2>
        <p className="text-primary-foreground/70 text-sm">
          {step === 'mobile' 
            ? 'Enter your mobile number to login' 
            : `OTP sent to +91 ${mobile}`
          }
        </p>
      </div>

      {/* Form Section */}
      <div className="flex-1 px-6 -mt-8">
        <div className="bg-card rounded-2xl p-6 card-elevated-lg">
          {step === 'mobile' ? (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-muted-foreground">
                    <Smartphone className="w-5 h-5" />
                    <span className="font-medium">+91</span>
                  </div>
                  <Input
                    type="tel"
                    placeholder="9876543210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="pl-24 h-14 text-lg font-medium"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Demo: Numbers starting with 9 login as Owner, others as Staff
                </p>
              </div>

              <Button 
                onClick={handleSendOtp} 
                disabled={isLoading || mobile.length !== 10}
                className="w-full h-14 text-base font-semibold touch-feedback"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Send OTP
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Enter OTP
                </label>
                <Input
                  type="tel"
                  placeholder="Enter 4-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="h-14 text-2xl font-bold text-center tracking-[0.5em]"
                  maxLength={4}
                />
              </div>

              <Button 
                onClick={handleVerifyOtp} 
                disabled={isLoading || otp.length !== 4}
                className="w-full h-14 text-base font-semibold touch-feedback"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Verify & Login
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <button
                onClick={() => {
                  setStep('mobile');
                  setOtp('');
                }}
                className="w-full text-center text-primary font-medium touch-feedback py-2"
              >
                Change Mobile Number
              </button>
            </div>
          )}
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
