import { useEffect, useState } from 'react';
import {
  Search,
  Calendar,
  Trash2,
  RefreshCw,
  Loader2,
  Plus,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type ViewMode = 'all' | 'distributor';

type Batch = {
  _id: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchaseRate: number;
  mrp: number;
  distributor: string;
};

type Medicine = {
  _id: string;
  name: string;
  batches: Batch[];
};

export default function StockPage() {
  /* ---------------- STATE ---------------- */
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedicineId, setSelectedMedicineId] = useState<string | null>(null);
  const [expandedDistributor, setExpandedDistributor] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  /* ---------------- FORM STATE ---------------- */
  const [distributor, setDistributor] = useState('');
  const [medicineName, setMedicineName] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [purchaseRate, setPurchaseRate] = useState(0);
  const [mrp, setMrp] = useState(0);
  const [quantity, setQuantity] = useState(1);

  /* ---------------- FETCH STOCK ---------------- */
  const fetchStock = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/stock`);
      const json = await res.json();
      if (json.success) {
        setMedicines(json.data);
      }
    } catch (err) {
      console.error('Fetch stock failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  /* ---------------- ADD STOCK (POST API) ---------------- */
  const addStock = async () => {
    if (!medicineName || !distributor) return;

    try {
      const res = await fetch(`${API_URL}/stock/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicineName,
          batchNumber,
          expiry,
          purchaseRate,
          mrp,
          quantity,
          distributor,
        }),
      });

      const json = await res.json();

      if (json.success) {
        setAddOpen(false);
        setDistributor('');
        setMedicineName('');
        setBatchNumber('');
        setExpiry('');
        setPurchaseRate(0);
        setMrp(0);
        setQuantity(1);
        fetchStock();
      } else {
        alert(json.message || 'Failed to add stock');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  /* ---------------- HELPERS ---------------- */
  const formatExpiry = (date: string) => {
    const [y, m] = date.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[Number(m) - 1]} ${y}`;
  };

  const selectedMedicine = medicines.find(m => m._id === selectedMedicineId);

  /* ---------------- DISTRIBUTOR GROUP ---------------- */
  const distributorMap: Record<string, Medicine[]> = {};
  medicines.forEach(m =>
    m.batches.forEach(b => {
      if (!distributorMap[b.distributor]) distributorMap[b.distributor] = [];
      if (!distributorMap[b.distributor].some(x => x._id === m._id)) {
        distributorMap[b.distributor].push(m);
      }
    })
  );

  /* ---------------- RENDER ---------------- */
  return (
    <AppLayout title="Stock Management">
      <div className="p-4 space-y-4">

        {/* SEARCH + ACTION */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" />
            <Input
              className="pl-10 h-12"
              placeholder="Search medicines..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <Button variant="outline" size="icon" onClick={fetchStock}>
            <RefreshCw />
          </Button>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 text-white">
                <Plus />
              </Button>
            </DialogTrigger>

            {/* ===== MODAL ===== */}
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Stock</DialogTitle>
                <DialogDescription>
                  Manually add medicine to your inventory
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium">Medicine Name</label>
                  <Input value={medicineName} onChange={e => setMedicineName(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Batch No.</label>
                    <Input value={batchNumber} onChange={e => setBatchNumber(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Expiry (YYYY-MM)</label>
                    <Input value={expiry} onChange={e => setExpiry(e.target.value)} />
                  </div>
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-muted-foreground">
      Purchase Price (₹)
    </label>
    <Input
      type="number"
      placeholder="Purchase ₹"
      value={purchaseRate}
      onChange={e => setPurchaseRate(+e.target.value)}
    />
  </div>

  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-muted-foreground">
      MRP (₹)
    </label>
    <Input
      type="number"
      placeholder="MRP ₹"
      value={mrp}
      onChange={e => setMrp(+e.target.value)}
    />
  </div>

  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-muted-foreground">
      Quantity
    </label>
    <Input
      type="number"
      placeholder="Qty"
      value={quantity}
      onChange={e => setQuantity(+e.target.value)}
    />
  </div>
</div>


                <Input
                  placeholder="Distributor"
                  value={distributor}
                  onChange={e => setDistributor(e.target.value)}
                />
              </div>

              <DialogFooter className="mt-6 flex flex-col gap-2">
                <Button className="bg-emerald-600 text-white" onClick={addStock}>
                  Add Stock
                </Button>
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* TABS */}
        <div className="flex gap-2">
          <button onClick={() => setViewMode('all')} className={cn('flex-1 py-2 rounded', viewMode === 'all' && 'bg-muted')}>
            All Stock
          </button>
          <button onClick={() => setViewMode('distributor')} className={cn('flex-1 py-2 rounded', viewMode === 'distributor' && 'bg-muted')}>
            By Distributor
          </button>
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin w-8 h-8" />
          </div>
        ) : selectedMedicine ? (
          <div>
            <button onClick={() => setSelectedMedicineId(null)}>← Back</button>
            {selectedMedicine.batches.map(b => (
              <div key={b._id} className="border rounded-xl p-4 mt-3">
                <p className="font-semibold">Batch: {b.batchNumber}</p>
                <p className="text-sm flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> Exp: {formatExpiry(b.expiryDate)}
                </p>
                <p>Qty: {b.quantity}</p>
                <p>Purchase ₹{b.purchaseRate} • MRP ₹{b.mrp}</p>
              </div>
            ))}
          </div>
        ) : viewMode === 'all' ? (
          medicines
            .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(m => (
              <div key={m._id} className="border rounded-xl p-4">
                <button onClick={() => setSelectedMedicineId(m._id)}>
                  {m.name} (Qty {m.batches.reduce((s,b)=>s+b.quantity,0)})
                </button>
              </div>
            ))
        ) : (
          Object.entries(distributorMap).map(([d, meds]) => (
            <div key={d} className="border rounded-xl">
              <button className="w-full p-4 flex justify-between" onClick={() => setExpandedDistributor(expandedDistributor === d ? null : d)}>
                <span>{d}</span>
                {expandedDistributor === d ? <ChevronDown /> : <ChevronRight />}
              </button>
              {expandedDistributor === d &&
                meds.map(m => (
                  <button key={m._id} onClick={() => setSelectedMedicineId(m._id)} className="block w-full text-left px-4 py-2">
                    {m.name}
                  </button>
                ))}
            </div>
          ))
        )}
      </div>
    </AppLayout>
  );
}
