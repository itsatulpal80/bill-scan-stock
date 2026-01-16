import { useState } from 'react';
import { Search, Plus, Minus, ShoppingCart, Check, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePharmacyData } from '@/hooks/usePharmacyData';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CartItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  mrp: number;
  maxQuantity: number;
}

export default function SalePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const { getMedicineWithStock, processSale } = usePharmacyData();
  const { toast } = useToast();

  const medicinesWithStock = getMedicineWithStock();
  
  const availableMedicines = medicinesWithStock.filter(
    (m) => m.totalQuantity > 0 && m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (medicine: typeof medicinesWithStock[0]) => {
    const existingItem = cart.find((item) => item.medicineId === medicine.id);
    
    if (existingItem) {
      if (existingItem.quantity < medicine.totalQuantity) {
        setCart((prev) =>
          prev.map((item) =>
            item.medicineId === medicine.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      }
    } else {
      // Get MRP from nearest expiry batch (FIFO)
      const nearestBatch = medicine.batches.sort((a, b) => 
        a.expiryDate.localeCompare(b.expiryDate)
      )[0];
      
      setCart((prev) => [
        ...prev,
        {
          medicineId: medicine.id,
          medicineName: medicine.name,
          quantity: 1,
          mrp: nearestBatch?.mrp || 0,
          maxQuantity: medicine.totalQuantity,
        },
      ]);
    }
    setSearchQuery('');
  };

  const updateQuantity = (medicineId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.medicineId === medicineId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.maxQuantity) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (medicineId: string) => {
    setCart((prev) => prev.filter((item) => item.medicineId !== medicineId));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.quantity * item.mrp, 0);

  const handleCheckout = () => {
    try {
      cart.forEach((item) => {
        processSale(item.medicineId, item.quantity);
      });
      
      toast({
        title: 'Sale Completed!',
        description: `Total: ₹${totalAmount.toFixed(2)}`,
      });
      
      setCart([]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process sale',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout title="New Sale">
      <div className="p-4 space-y-4 pb-40">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search medicine to add..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="bg-card rounded-xl border border-border card-elevated overflow-hidden">
            {availableMedicines.length === 0 ? (
              <p className="p-4 text-muted-foreground text-center">No medicines found</p>
            ) : (
              availableMedicines.slice(0, 5).map((medicine) => (
                <button
                  key={medicine.id}
                  onClick={() => addToCart(medicine)}
                  className="w-full p-4 flex items-center justify-between border-b border-border last:border-0 touch-feedback text-left"
                >
                  <div>
                    <p className="font-semibold text-foreground">{medicine.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Stock: {medicine.totalQuantity} | MRP: ₹{medicine.batches[0]?.mrp || 0}
                    </p>
                  </div>
                  <Plus className="w-5 h-5 text-primary" />
                </button>
              ))
            )}
          </div>
        )}

        {/* Cart */}
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Cart ({cart.length} items)
          </h3>
          
          {cart.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center card-elevated">
              <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No items in cart</p>
              <p className="text-sm text-muted-foreground mt-1">
                Search and add medicines above
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.medicineId}
                  className="bg-card rounded-xl border border-border p-4 card-elevated"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{item.medicineName}</p>
                      <p className="text-sm text-muted-foreground">
                        ₹{item.mrp} × {item.quantity} = ₹{(item.mrp * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.medicineId)}
                      className="p-2 text-destructive touch-feedback"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 bg-secondary rounded-lg p-1">
                      <button
                        onClick={() => updateQuantity(item.medicineId, -1)}
                        className="w-10 h-10 rounded-lg bg-card flex items-center justify-center touch-feedback card-elevated"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <span className="w-12 text-center font-bold text-lg">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.medicineId, 1)}
                        disabled={item.quantity >= item.maxQuantity}
                        className={cn(
                          'w-10 h-10 rounded-lg bg-card flex items-center justify-center touch-feedback card-elevated',
                          item.quantity >= item.maxQuantity && 'opacity-50'
                        )}
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <p className="text-lg font-bold text-primary">
                      ₹{(item.mrp * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Checkout Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-card border-t border-border p-4 card-elevated-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-muted-foreground">Total Amount</span>
            <span className="text-2xl font-bold text-foreground">
              ₹{totalAmount.toFixed(2)}
            </span>
          </div>
          <Button
            onClick={handleCheckout}
            className="w-full h-14 text-base font-semibold touch-feedback"
          >
            <Check className="w-5 h-5 mr-2" />
            Complete Sale
          </Button>
        </div>
      )}
    </AppLayout>
  );
}
