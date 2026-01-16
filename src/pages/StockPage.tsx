import { useState } from 'react';
import { Search, Package, ChevronRight, Calendar } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { usePharmacyData } from '@/hooks/usePharmacyData';
import { cn } from '@/lib/utils';

export default function StockPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState<string | null>(null);
  const { getMedicineWithStock } = usePharmacyData();

  const medicinesWithStock = getMedicineWithStock();
  
  const filteredMedicines = medicinesWithStock.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedMedicineData = medicinesWithStock.find((m) => m.id === selectedMedicine);

  const formatExpiry = (date: string) => {
    const [year, month] = date.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const isExpiringSoon = (date: string) => {
    const [year, month] = date.split('-').map(Number);
    const expiryDate = new Date(year, month - 1, 28);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return expiryDate < thirtyDaysFromNow;
  };

  const isExpired = (date: string) => {
    const [year, month] = date.split('-').map(Number);
    const expiryDate = new Date(year, month - 1, 28);
    return expiryDate < new Date();
  };

  return (
    <AppLayout title="Stock Management">
      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search medicines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Stock List */}
        {!selectedMedicine ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {filteredMedicines.length} medicines in stock
            </p>
            
            {filteredMedicines.map((medicine) => (
              <button
                key={medicine.id}
                onClick={() => setSelectedMedicine(medicine.id)}
                className="w-full bg-card rounded-xl border border-border p-4 card-elevated flex items-center gap-4 touch-feedback text-left"
              >
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                  medicine.totalQuantity < 20 ? 'bg-warning/10' : 'bg-primary/10'
                )}>
                  <Package className={cn(
                    'w-6 h-6',
                    medicine.totalQuantity < 20 ? 'text-warning' : 'text-primary'
                  )} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{medicine.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={cn(
                      'text-sm font-medium',
                      medicine.totalQuantity < 20 ? 'text-warning' : 'text-muted-foreground'
                    )}>
                      Qty: {medicine.totalQuantity}
                    </span>
                    {medicine.nearestExpiry && (
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        isExpired(medicine.nearestExpiry) 
                          ? 'bg-destructive/10 text-destructive'
                          : isExpiringSoon(medicine.nearestExpiry)
                            ? 'bg-warning/10 text-warning'
                            : 'bg-muted text-muted-foreground'
                      )}>
                        Exp: {formatExpiry(medicine.nearestExpiry)}
                      </span>
                    )}
                  </div>
                </div>
                
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          /* Batch Detail View */
          <div className="space-y-4">
            <button
              onClick={() => setSelectedMedicine(null)}
              className="text-primary font-medium flex items-center gap-1 touch-feedback"
            >
              ← Back to list
            </button>

            {selectedMedicineData && (
              <>
                <div className="bg-card rounded-xl border border-border p-4 card-elevated">
                  <h2 className="text-lg font-bold text-foreground">
                    {selectedMedicineData.name}
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    {selectedMedicineData.manufacturer || 'Unknown Manufacturer'}
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="bg-primary/10 rounded-lg px-4 py-2">
                      <p className="text-xs text-muted-foreground">Total Stock</p>
                      <p className="text-xl font-bold text-primary">
                        {selectedMedicineData.totalQuantity}
                      </p>
                    </div>
                    <div className="bg-secondary rounded-lg px-4 py-2">
                      <p className="text-xs text-muted-foreground">Batches</p>
                      <p className="text-xl font-bold text-foreground">
                        {selectedMedicineData.batches.length}
                      </p>
                    </div>
                  </div>
                </div>

                <h3 className="font-semibold text-foreground">Batch-wise Stock</h3>
                
                <div className="space-y-3">
                  {selectedMedicineData.batches
                    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
                    .map((batch) => (
                      <div
                        key={batch.id}
                        className={cn(
                          'bg-card rounded-xl border p-4 card-elevated',
                          isExpired(batch.expiryDate)
                            ? 'border-destructive/50 bg-destructive/5'
                            : isExpiringSoon(batch.expiryDate)
                              ? 'border-warning/50 bg-warning/5'
                              : 'border-border'
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-foreground">
                              Batch: {batch.batchNumber}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className={cn(
                                'text-sm font-medium',
                                isExpired(batch.expiryDate)
                                  ? 'text-destructive'
                                  : isExpiringSoon(batch.expiryDate)
                                    ? 'text-warning'
                                    : 'text-muted-foreground'
                              )}>
                                {isExpired(batch.expiryDate) && '⚠️ '}
                                Exp: {formatExpiry(batch.expiryDate)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-foreground">
                              {batch.quantity}
                            </p>
                            <p className="text-xs text-muted-foreground">units</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                          <div>
                            <p className="text-xs text-muted-foreground">Purchase Rate</p>
                            <p className="font-semibold">₹{batch.purchaseRate}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">MRP</p>
                            <p className="font-semibold">₹{batch.mrp}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
