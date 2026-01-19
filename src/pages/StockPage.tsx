import { useState } from 'react';
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

type ViewMode = 'all' | 'distributor';

type Batch = {
  id: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchaseRate: number;
  mrp: number;
  distributor: string;
};

type Medicine = {
  id: string;
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

  /* ---------------- FORM STATE ---------------- */
  const [distributor, setDistributor] = useState('');
  const [medicineName, setMedicineName] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [purchaseRate, setPurchaseRate] = useState(0);
  const [mrp, setMrp] = useState(0);
  const [quantity, setQuantity] = useState(1);

  /* ---------------- DUMMY DATA ---------------- */
  const [medicines, setMedicines] = useState<Medicine[]>([
    {
      id: '1',
      name: '4 OME CAP 1X15',
      batches: [
        {
          id: 'b1',
          batchNumber: 'C-2912',
          expiryDate: '2027-10',
          quantity: 20,
          purchaseRate: 7,
          mrp: 60,
          distributor: 'PAL MEDICAL AGENCIES',
        },
      ],
    },
    {
      id: '2',
      name: 'ACNESTAR FACE WASH 50GM',
      batches: [
        {
          id: 'b2',
          batchNumber: 'A-110',
          expiryDate: '2027-10',
          quantity: 2,
          purchaseRate: 80,
          mrp: 150,
          distributor: 'BHARSON HEALTHCARE',
        },
      ],
    },
  ]);

  /* ---------------- HELPERS ---------------- */
  const formatExpiry = (date: string) => {
    const [y, m] = date.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[Number(m) - 1]} ${y}`;
  };

  const selectedMedicine = medicines.find(m => m.id === selectedMedicineId);

  /* ---------------- ADD STOCK ---------------- */
  const addStock = () => {
    if (!medicineName || !distributor) return;

    const newBatch: Batch = {
      id: Date.now().toString(),
      batchNumber,
      expiryDate: expiry,
      quantity,
      purchaseRate,
      mrp,
      distributor,
    };

    setMedicines(prev => {
      const existing = prev.find(m => m.name.toLowerCase() === medicineName.toLowerCase());
      if (existing) {
        return prev.map(m =>
          m.id === existing.id
            ? { ...m, batches: [...m.batches, newBatch] }
            : m
        );
      }
      return [
        ...prev,
        {
          id: Date.now().toString(),
          name: medicineName,
          batches: [newBatch],
        },
      ];
    });

    setAddOpen(false);
    setDistributor('');
    setMedicineName('');
    setBatchNumber('');
    setExpiry('');
    setPurchaseRate(0);
    setMrp(0);
    setQuantity(1);
  };

  /* ---------------- DELETE ---------------- */
  const confirmDelete = () => {
    if (!deleteTarget) return;
    setMedicines(prev => prev.filter(m => m.id !== deleteTarget.id));
    setDeleteOpen(false);
    setDeleteTarget(null);
    setSelectedMedicineId(null);
  };

  /* ---------------- DISTRIBUTOR GROUP ---------------- */
  const distributorMap: Record<string, Medicine[]> = {};
  medicines.forEach(m =>
    m.batches.forEach(b => {
      if (!distributorMap[b.distributor]) distributorMap[b.distributor] = [];
      if (!distributorMap[b.distributor].includes(m)) distributorMap[b.distributor].push(m);
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

          <Button variant="outline" size="icon">
            <RefreshCw />
          </Button>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 text-white">
                <Plus />
              </Button>
            </DialogTrigger>

           <DialogContent className="max-w-md">
  <DialogHeader className="relative">
    <DialogTitle className="text-lg font-semibold">
      Add New Stock
    </DialogTitle>
    <DialogDescription>
      Manually add medicine to your inventory
    </DialogDescription>
  </DialogHeader>

  {/* FORM */}
  <div className="space-y-4 mt-4">

    {/* Medicine Name */}
    <div className="space-y-1">
      <label className="text-sm font-medium">Medicine Name</label>
      <Input
        placeholder="Enter medicine name"
        value={medicineName}
        onChange={(e) => setMedicineName(e.target.value)}
      />
    </div>

    {/* Batch + Expiry */}
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <label className="text-sm font-medium">Batch No.</label>
        <Input
          placeholder="e.g., B001"
          value={batchNumber}
          onChange={(e) => setBatchNumber(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Expiry (YYYY-MM)</label>
        <Input
          placeholder="e.g., 2025-12"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
        />
      </div>
    </div>

    {/* Purchase / MRP / Qty */}
    <div className="grid grid-cols-3 gap-3">
      <div className="space-y-1">
        <label className="text-sm font-medium">Purchase ₹</label>
        <Input
          type="number"
          value={purchaseRate}
          onChange={(e) => setPurchaseRate(+e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">MRP ₹</label>
        <Input
          type="number"
          value={mrp}
          onChange={(e) => setMrp(+e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Quantity</label>
        <Input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(+e.target.value)}
        />
      </div>
    </div>
  </div>

  {/* ACTIONS */}
  <DialogFooter className="mt-6 flex flex-col gap-2">
    <Button
      className="w-full bg-emerald-600 text-white"
      onClick={addStock}
    >
      Add Stock
    </Button>

    <Button
      variant="outline"
      className="w-full"
      onClick={() => setAddOpen(false)}
    >
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
        {selectedMedicine ? (
          <div>
            <button onClick={() => setSelectedMedicineId(null)}>← Back</button>
            {selectedMedicine.batches.map(b => (
              <div key={b.id} className="border rounded-xl p-4 mt-3">
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
              <div key={m.id} className="border rounded-xl p-4 flex justify-between">
                <button onClick={() => setSelectedMedicineId(m.id)}>
                  {m.name} (Qty {m.batches.reduce((s,b)=>s+b.quantity,0)})
                </button>
                <Trash2
                  className="text-destructive"
                  onClick={() => {
                    setDeleteTarget({ id: m.id, name: m.name });
                    setDeleteOpen(true);
                  }}
                />
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
                  <button key={m.id} onClick={() => setSelectedMedicineId(m.id)} className="block w-full text-left px-4 py-2">
                    {m.name}
                  </button>
                ))}
            </div>
          ))
        )}
      </div>

      {/* DELETE */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
