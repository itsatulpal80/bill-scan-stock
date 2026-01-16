import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Package, ShoppingCart, AlertTriangle, BarChart3, Settings, LogOut, Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
}

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
  ownerOnly?: boolean;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/dashboard' },
  { icon: Camera, label: 'Scan', path: '/scan' },
  { icon: Package, label: 'Stock', path: '/stock' },
  { icon: ShoppingCart, label: 'Sale', path: '/sale' },
  { icon: AlertTriangle, label: 'Alerts', path: '/alerts' },
];

export function AppLayout({ children, title }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isOwner = user?.role === 'owner';

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground px-4 py-3 card-elevated">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{title || 'MedStock Pro'}</h1>
            <p className="text-xs opacity-80">{user?.name} • {user?.role === 'owner' ? 'Owner' : 'Staff'}</p>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                onClick={() => navigate('/settings')}
                className="p-2 rounded-full hover:bg-primary-foreground/10 touch-feedback"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={logout}
              className="p-2 rounded-full hover:bg-primary-foreground/10 touch-feedback"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation - Android Style */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border card-elevated-lg z-50">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-2 rounded-lg touch-feedback min-w-[64px]',
                  isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('w-6 h-6', isActive && 'stroke-[2.5px]')} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
          
          {isOwner && (
            <button
              onClick={() => navigate('/reports')}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-lg touch-feedback min-w-[64px]',
                location.pathname === '/reports' ? 'text-primary bg-primary/10' : 'text-muted-foreground'
              )}
            >
              <BarChart3 className={cn('w-6 h-6', location.pathname === '/reports' && 'stroke-[2.5px]')} />
              <span className="text-xs font-medium">Reports</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
