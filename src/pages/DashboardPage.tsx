import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Package, 
  ShoppingCart, 
  AlertTriangle, 
  IndianRupee,
  TrendingDown,
  Clock
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/ui/stat-card';
import { ActionCard } from '@/components/ui/action-card';
import { useAuth } from '@/contexts/AuthContext';
import { usePharmacyData } from '@/hooks/usePharmacyData';

const API_URL = 'http://localhost:4001';

interface AlertSummary {
  expiredCount: number;
  expiringCount: number;
  lowStockCount: number;
  totalAlerts: number;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { todaySales } = usePharmacyData();
  const [alertSummary, setAlertSummary] = useState<AlertSummary>({
    expiredCount: 0,
    expiringCount: 0,
    lowStockCount: 0,
    totalAlerts: 0,
  });

  const isOwner = user?.role === 'owner';

  useEffect(() => {
    fetchAlertSummary();
  }, []);

  const fetchAlertSummary = async () => {
    try {
      const response = await fetch(`${API_URL}/stock/alerts/summary`);
      const data = await response.json();
      if (data.success) {
        setAlertSummary(data.data);
      }
    } catch (error) {
      console.error('Error fetching alert summary:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const expiryAlertCount = alertSummary.expiringCount + alertSummary.expiredCount;

  return (
    <AppLayout title="Radhe Medical Store">
      <div className="p-4 space-y-6">
        {/* Welcome Section */}
        <div>
          <h2 className="text-xl font-bold text-primary">Radhe Medical Store</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString('en-IN', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })} • Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}!
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            title="Today's Sales"
            value={formatCurrency(todaySales)}
            icon={<IndianRupee className="w-5 h-5" />}
            variant="success"
          />
          <StatCard
            title="Low Stock"
            value={alertSummary.lowStockCount}
            subtitle="Items need reorder"
            icon={<TrendingDown className="w-5 h-5" />}
            variant={alertSummary.lowStockCount > 0 ? 'warning' : 'default'}
            onClick={() => navigate('/alerts')}
          />
        </div>

        {/* Expiry Alert */}
        {expiryAlertCount > 0 && (
          <div 
            onClick={() => navigate('/alerts')}
            className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-4 touch-feedback cursor-pointer"
          >
            <div className="p-2 bg-destructive/20 rounded-lg">
              <Clock className="w-6 h-6 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-destructive">Expiry Alert!</p>
              <p className="text-sm text-muted-foreground">
                {expiryAlertCount} medicine{expiryAlertCount > 1 ? 's' : ''} expiring soon
              </p>
            </div>
            <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full">
              {expiryAlertCount}
            </span>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">Quick Actions</h3>
          <div className="space-y-3">
            <ActionCard
              title="Scan Purchase Bill"
              description="Capture & auto-extract medicine data"
              icon={<Camera className="w-6 h-6 text-primary" />}
              onClick={() => navigate('/scan')}
              variant="primary"
            />
            
            <ActionCard
              title="New Sale"
              description="Create sale entry with auto-deduction"
              icon={<ShoppingCart className="w-6 h-6 text-primary" />}
              onClick={() => navigate('/sale')}
            />
            
            <ActionCard
              title="View Stock"
              description="Check batch-wise inventory"
              icon={<Package className="w-6 h-6 text-primary" />}
              onClick={() => navigate('/stock')}
            />
            
            <ActionCard
              title="Expiry & Alerts"
              description="Manage expired & low stock items"
              icon={<AlertTriangle className="w-6 h-6 text-warning" />}
              onClick={() => navigate('/alerts')}
              badge={alertSummary.totalAlerts > 0 ? alertSummary.totalAlerts : undefined}
            />
          </div>
        </div>

        {/* Recent Activity - Owner only */}
        {isOwner && todaySales > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Today's Summary</h3>
            <div className="bg-card rounded-xl border border-border p-4 card-elevated">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Sales</span>
                  <span className="font-semibold text-success">{formatCurrency(todaySales)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
