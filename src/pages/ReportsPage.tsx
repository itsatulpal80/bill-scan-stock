import { useState } from 'react';
import { BarChart3, TrendingUp, Download, Calendar } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { usePharmacyData } from '@/hooks/usePharmacyData';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ReportPeriod = 'today' | 'week' | 'month';

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('today');
  const { todaySales } = usePharmacyData();
  const { toast } = useToast();

  // Demo data for reports
  const reportData = {
    today: {
      sales: todaySales,
      purchase: 8500,
      profit: todaySales - 8500,
      bills: 12,
    },
    week: {
      sales: 78500,
      purchase: 52000,
      profit: 26500,
      bills: 87,
    },
    month: {
      sales: 325000,
      purchase: 215000,
      profit: 110000,
      bills: 342,
    },
  };

  const currentData = reportData[period];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    toast({
      title: 'Export Started',
      description: `Generating ${format.toUpperCase()} report...`,
    });
  };

  const periodLabels = {
    today: "Today's",
    week: 'This Week',
    month: 'This Month',
  };

  return (
    <AppLayout title="Reports">
      <div className="p-4 space-y-4">
        {/* Period Selector */}
        <div className="flex gap-2">
          {(['today', 'week', 'month'] as ReportPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'flex-1 py-3 rounded-xl font-medium text-sm touch-feedback transition-all',
                period === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground'
              )}
            >
              {p === 'today' ? 'Today' : p === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl border border-border p-4 card-elevated">
            <div className="flex items-center gap-2 text-success mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Sales</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(currentData.sales)}
            </p>
          </div>
          
          <div className="bg-card rounded-xl border border-border p-4 card-elevated">
            <div className="flex items-center gap-2 text-warning mb-2">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm font-medium">Purchase</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(currentData.purchase)}
            </p>
          </div>
        </div>

        {/* Profit Card */}
        <div className="bg-primary/10 rounded-xl border border-primary/20 p-6 card-elevated">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary font-medium">
                {periodLabels[period]} Profit
              </p>
              <p className="text-3xl font-bold text-primary mt-1">
                {formatCurrency(currentData.profit)}
              </p>
            </div>
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-primary/20">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Profit Margin</span>
              <span className="font-semibold text-primary">
                {((currentData.profit / currentData.sales) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-card rounded-xl border border-border p-4 card-elevated">
          <h3 className="font-semibold text-foreground mb-4">{periodLabels[period]} Stats</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <span className="text-muted-foreground">Total Bills</span>
              </div>
              <span className="text-xl font-bold text-foreground">{currentData.bills}</span>
            </div>
            
            <div className="flex justify-between items-center pb-4 border-b border-border">
              <span className="text-muted-foreground">Average Bill Value</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(currentData.sales / currentData.bills)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Items Sold</span>
              <span className="font-semibold text-foreground">
                {currentData.bills * 4}
              </span>
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Export Report</h3>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handleExport('pdf')}
              className="flex-1 h-12 touch-feedback"
            >
              <Download className="w-5 h-5 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('excel')}
              className="flex-1 h-12 touch-feedback"
            >
              <Download className="w-5 h-5 mr-2" />
              Excel
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
