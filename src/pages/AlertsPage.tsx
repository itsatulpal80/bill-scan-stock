import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, TrendingDown, Package, RotateCcw, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type AlertTab = 'expired' | 'expiring' | 'low_stock';

interface Alert {
  medicineId: string;
  medicineName: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity?: number;
  distributor?: string;
  currentQuantity?: number;
  minQuantity?: number;
  alertType: string;
}

const API_URL = 'http://localhost:4001';

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState<AlertTab>('expiring');
  const [expiredAlerts, setExpiredAlerts] = useState<Alert[]>([]);
  const [expiringAlerts, setExpiringAlerts] = useState<Alert[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const [expiredRes, expiringRes, lowStockRes] = await Promise.all([
        fetch(`${API_URL}/stock/alerts/expired`),
        fetch(`${API_URL}/stock/alerts/expiring-soon`),
        fetch(`${API_URL}/stock/alerts/low-stock`),
      ]);

      const expiredData = await expiredRes.json();
      const expiringData = await expiringRes.json();
      const lowStockData = await lowStockRes.json();

      if (expiredData.success) setExpiredAlerts(expiredData.data);
      if (expiringData.success) setExpiringAlerts(expiringData.data);
      if (lowStockData.success) setLowStockAlerts(lowStockData.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch alerts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'expired' as AlertTab, label: 'Expired', count: expiredAlerts.length, icon: AlertTriangle },
    { id: 'expiring' as AlertTab, label: 'Expiring', count: expiringAlerts.length, icon: Clock },
    { id: 'low_stock' as AlertTab, label: 'Low Stock', count: lowStockAlerts.length, icon: TrendingDown },
  ];

  const currentAlerts = activeTab === 'expired' 
    ? expiredAlerts 
    : activeTab === 'expiring' 
      ? expiringAlerts 
      : lowStockAlerts;

  const handleDispose = (medicineName: string) => {
    toast({
      title: 'Marked as Disposed',
      description: `${medicineName} removed from inventory`,
    });
  };

  const handleReturn = (medicineName: string) => {
    toast({
      title: 'Marked for Return',
      description: `${medicineName} marked for supplier return`,
    });
  };

  const formatExpiry = (date?: string) => {
    if (!date) return '';
    const [year, month] = date.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  return (
    <AppLayout title="Alerts & Expiry">
      <div className="p-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap touch-feedback transition-all',
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-muted-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-bold',
                    activeTab === tab.id
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-destructive text-destructive-foreground'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Alert List */}
        {currentAlerts.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center card-elevated">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-success" />
            </div>
            <p className="text-foreground font-semibold">All Clear!</p>
            <p className="text-sm text-muted-foreground mt-1">
              {activeTab === 'expired' && 'No expired medicines'}
              {activeTab === 'expiring' && 'No medicines expiring soon'}
              {activeTab === 'low_stock' && 'Stock levels are healthy'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentAlerts.map((alert, index) => (
              <div
                key={`${alert.medicineId}-${alert.batchNumber || index}`}
                className={cn(
                  'bg-card rounded-xl border p-4 card-elevated',
                  activeTab === 'expired' ? 'border-destructive/50' : 
                  activeTab === 'expiring' ? 'border-warning/50' : 'border-warning/50'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'p-2 rounded-lg shrink-0',
                    activeTab === 'expired' ? 'bg-destructive/10' : 'bg-warning/10'
                  )}>
                    {activeTab === 'low_stock' ? (
                      <TrendingDown className={cn('w-5 h-5 text-warning')} />
                    ) : (
                      <Clock className={cn(
                        'w-5 h-5',
                        activeTab === 'expired' ? 'text-destructive' : 'text-warning'
                      )} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{alert.medicineName}</p>
                    
                    {activeTab !== 'low_stock' && (
                      <div className="mt-1 space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Batch: {alert.batchNumber}
                        </p>
                        <p className={cn(
                          'text-sm font-medium',
                          activeTab === 'expired' ? 'text-destructive' : 'text-warning'
                        )}>
                          {activeTab === 'expired' ? 'Expired: ' : 'Expires: '}
                          {formatExpiry(alert.expiryDate)}
                        </p>
                      </div>
                    )}
                    
                    {activeTab === 'low_stock' && (
                      <div className="mt-1">
                        <p className="text-sm text-warning font-medium">
                          Only {alert.currentQuantity} units left
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Minimum: {alert.quantity} units
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions for expired/expiring */}
                {activeTab !== 'low_stock' && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReturn(alert.medicineName)}
                      className="flex-1 touch-feedback"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Return
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDispose(alert.medicineName)}
                      className="flex-1 touch-feedback"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Dispose
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
