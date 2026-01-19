import { useState, useEffect, useCallback } from 'react';
import { Medicine, Batch, StockAlert, OCRItem } from '@/types/pharmacy';
import { useToast } from '@/hooks/use-toast';

// LocalStorage-backed mock DB to replace Supabase for UI-only mode.
type DBShape = {
  medicines: Medicine[];
  batches: Batch[];
  sales: Array<{ id: string; net_amount: number; created_at: string }>;
  purchase_invoices: Array<{ id: string; invoice_number?: string; invoice_date?: string; supplier_name?: string; total_amount?: number; created_at: string }>;
};

const STORAGE_KEY = 'pharma_local_db_v1';

function loadDB(): DBShape {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw) as DBShape;
  const init: DBShape = { medicines: [], batches: [], sales: [], purchase_invoices: [] };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
  return init;
}

function saveDB(db: DBShape) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

interface DbMedicine {
  id: string;
  name: string;
  manufacturer: string | null;
  category: string | null;
  hsn_code: string | null;
  gst_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DbBatch {
  id: string;
  medicine_id: string;
  batch_number: string;
  expiry_date: string;
  purchase_rate: number;
  mrp: number;
  quantity: number;
  purchase_invoice_id: string | null;
  created_at: string;
  updated_at: string;
}

export function usePharmacyData() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [todaySales, setTodaySales] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch medicines from database
  const fetchMedicines = useCallback(async () => {
    const db = loadDB();
    return db.medicines;
  }, []);

  // Fetch batches from database
  const fetchBatches = useCallback(async () => {
    const db = loadDB();
    return db.batches;
  }, []);

  // Fetch today's sales total
  const fetchTodaySales = useCallback(async () => {
    const db = loadDB();
    const today = new Date().toISOString().split('T')[0];
    return db.sales.filter(s => s.created_at >= today).reduce((sum, s) => sum + Number(s.net_amount), 0);
  }, []);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [meds, batchList, sales] = await Promise.all([
        fetchMedicines(),
        fetchBatches(),
        fetchTodaySales(),
      ]);
      setMedicines(meds);
      setBatches(batchList);
      setTodaySales(sales);
      setIsLoading(false);
    };
    loadData();
  }, [fetchMedicines, fetchBatches, fetchTodaySales]);

  // Refresh data
  const refreshData = useCallback(async () => {
    const [meds, batchList, sales] = await Promise.all([
      fetchMedicines(),
      fetchBatches(),
      fetchTodaySales(),
    ]);
    setMedicines(meds);
    setBatches(batchList);
    setTodaySales(sales);
  }, [fetchMedicines, fetchBatches, fetchTodaySales]);

  // Calculate stock alerts
  const getStockAlerts = useCallback((): StockAlert[] => {
    const alerts: StockAlert[] = [];
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    batches.forEach((batch) => {
      const medicine = medicines.find((m) => m.id === batch.medicineId);
      if (!medicine) return;

      const [year, month] = batch.expiryDate.split('-').map(Number);
      const expiryDate = new Date(year, month - 1, 28);

      if (expiryDate < today) {
        alerts.push({
          medicineId: batch.medicineId,
          medicineName: medicine.name,
          alertType: 'expired',
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
        });
      } else if (expiryDate < thirtyDaysFromNow) {
        alerts.push({
          medicineId: batch.medicineId,
          medicineName: medicine.name,
          alertType: 'expiring_soon',
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
        });
      }
    });

    // Check low stock
    const stockByMedicine = batches.reduce((acc, batch) => {
      acc[batch.medicineId] = (acc[batch.medicineId] || 0) + batch.quantity;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(stockByMedicine).forEach(([medicineId, quantity]) => {
      if (quantity < 20) {
        const medicine = medicines.find((m) => m.id === medicineId);
        if (medicine) {
          alerts.push({
            medicineId,
            medicineName: medicine.name,
            alertType: 'low_stock',
            currentQuantity: quantity,
            minQuantity: 20,
          });
        }
      }
    });

    return alerts;
  }, [medicines, batches]);

  const alerts = getStockAlerts();
  const lowStockCount = alerts.filter((a) => a.alertType === 'low_stock').length;
  const expiryAlertCount = alerts.filter((a) => a.alertType === 'expiring_soon' || a.alertType === 'expired').length;

  // Get medicine with stock info
  const getMedicineWithStock = useCallback(() => {
    return medicines.map((medicine) => {
      const medicineBatches = batches.filter((b) => b.medicineId === medicine.id);
      const totalQuantity = medicineBatches.reduce((sum, b) => sum + b.quantity, 0);
      const nearestExpiry = medicineBatches
        .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))[0]?.expiryDate;
      
      return {
        ...medicine,
        totalQuantity,
        nearestExpiry,
        batches: medicineBatches,
      };
    });
  }, [medicines, batches]);

  // Add stock from purchase invoice (from OCR scan)
  const addPurchaseStock = async (items: OCRItem[], invoiceData?: { supplierName?: string; invoiceNumber?: string; invoiceDate?: string }) => {
    const db = loadDB();
    const invoiceId = `inv_${Date.now()}`;
    const created_at = new Date().toISOString();

    const invoice = {
      id: invoiceId,
      invoice_number: invoiceData?.invoiceNumber || null,
      invoice_date: invoiceData?.invoiceDate || null,
      supplier_name: invoiceData?.supplierName || null,
      total_amount: items.reduce((sum, item) => sum + (item.purchaseRate * item.quantity), 0),
      created_at,
    };

    db.purchase_invoices.push(invoice);

    for (const item of items) {
      const existing = db.medicines.find(m => m.name.toLowerCase() === item.medicineName.toLowerCase());
      let medicineId = existing?.id;
      if (!medicineId) {
        medicineId = `med_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        db.medicines.push({
          id: medicineId,
          name: item.medicineName,
          manufacturer: item.manufacturer || undefined,
          category: item.category || undefined,
          hsnCode: item.hsnCode || undefined,
          gstRate: item.gstRate || 12,
          isActive: true,
        });
      }

      const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      db.batches.push({
        id: batchId,
        medicineId,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        purchaseRate: item.purchaseRate,
        mrp: item.mrp,
        quantity: item.quantity,
        purchaseInvoiceId: invoiceId,
      });
    }

    saveDB(db);
    await refreshData();
    return true;
  };

  // Delete a batch
  const deleteBatch = async (batchId: string) => {
    const db = loadDB();
    const idx = db.batches.findIndex(b => b.id === batchId);
    if (idx === -1) {
      toast({ title: 'Error', description: 'Batch not found', variant: 'destructive' });
      return false;
    }
    db.batches.splice(idx, 1);
    saveDB(db);
    await refreshData();
    return true;
  };

  // Delete a medicine (and all its batches via cascade)
  const deleteMedicine = async (medicineId: string) => {
    const db = loadDB();
    db.medicines = db.medicines.filter(m => m.id !== medicineId);
    db.batches = db.batches.filter(b => b.medicineId !== medicineId);
    saveDB(db);
    await refreshData();
    return true;
  };

  // Update batch quantity
  const updateBatchQuantity = async (batchId: string, newQuantity: number) => {
    const db = loadDB();
    const batch = db.batches.find(b => b.id === batchId);
    if (!batch) return false;
    batch.quantity = newQuantity;
    saveDB(db);
    await refreshData();
    return true;
  };

  // Process sale (FIFO)
  const processSale = async (medicineId: string, quantity: number) => {
    const medicineBatches = batches
      .filter((b) => b.medicineId === medicineId && b.quantity > 0)
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate)); // FIFO by expiry

    let remaining = quantity;
    const saleItems: Array<{ batchId: string; qty: number; mrp: number }> = [];

    for (const batch of medicineBatches) {
      if (remaining <= 0) break;
      
      const deduct = Math.min(remaining, batch.quantity);
      saleItems.push({ batchId: batch.id, qty: deduct, mrp: batch.mrp });
      remaining -= deduct;
    }

    if (remaining > 0) {
      throw new Error('Insufficient stock');
    }

    // Update batch quantities in local DB
    const db = loadDB();
    for (const item of saleItems) {
      const batch = db.batches.find(b => b.id === item.batchId);
      if (batch) batch.quantity = batch.quantity - item.qty;
    }
    // add a sale record
    db.sales.push({ id: `sale_${Date.now()}`, net_amount: saleItems.reduce((s, it) => s + it.mrp * it.qty, 0), created_at: new Date().toISOString() });
    saveDB(db);
    await refreshData();
    return saleItems;
  };

  return {
    medicines,
    batches,
    alerts,
    todaySales,
    lowStockCount,
    expiryAlertCount,
    isLoading,
    getMedicineWithStock,
    addPurchaseStock,
    processSale,
    deleteBatch,
    deleteMedicine,
    updateBatchQuantity,
    refreshData,
  };
}
