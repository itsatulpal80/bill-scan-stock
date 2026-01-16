import { useState, useEffect } from 'react';
import { Medicine, Batch, PurchaseInvoice, Sale, StockAlert } from '@/types/pharmacy';

// Demo data for the pharmacy
const DEMO_MEDICINES: Medicine[] = [
  { id: '1', name: 'Paracetamol 500mg', manufacturer: 'Cipla', gstRate: 12, isActive: true },
  { id: '2', name: 'Amoxicillin 250mg', manufacturer: 'Sun Pharma', gstRate: 12, isActive: true },
  { id: '3', name: 'Omeprazole 20mg', manufacturer: 'Dr. Reddy\'s', gstRate: 12, isActive: true },
  { id: '4', name: 'Metformin 500mg', manufacturer: 'Mankind', gstRate: 12, isActive: true },
  { id: '5', name: 'Azithromycin 500mg', manufacturer: 'Zydus', gstRate: 12, isActive: true },
  { id: '6', name: 'Cetirizine 10mg', manufacturer: 'Cipla', gstRate: 12, isActive: true },
  { id: '7', name: 'Pan D', manufacturer: 'Alkem', gstRate: 12, isActive: true },
  { id: '8', name: 'Dolo 650', manufacturer: 'Micro Labs', gstRate: 12, isActive: true },
];

const DEMO_BATCHES: Batch[] = [
  { id: 'b1', medicineId: '1', batchNumber: 'PAR2024A', expiryDate: '2025-06', purchaseRate: 18, mrp: 25, quantity: 150, purchaseInvoiceId: 'inv1' },
  { id: 'b2', medicineId: '1', batchNumber: 'PAR2024B', expiryDate: '2025-12', purchaseRate: 19, mrp: 26, quantity: 200, purchaseInvoiceId: 'inv2' },
  { id: 'b3', medicineId: '2', batchNumber: 'AMX2024X', expiryDate: '2025-03', purchaseRate: 45, mrp: 65, quantity: 80, purchaseInvoiceId: 'inv1' },
  { id: 'b4', medicineId: '3', batchNumber: 'OMP2024Y', expiryDate: '2025-08', purchaseRate: 32, mrp: 48, quantity: 120, purchaseInvoiceId: 'inv2' },
  { id: 'b5', medicineId: '4', batchNumber: 'MET2024Z', expiryDate: '2025-01', purchaseRate: 22, mrp: 35, quantity: 15, purchaseInvoiceId: 'inv1' },
  { id: 'b6', medicineId: '5', batchNumber: 'AZI2024W', expiryDate: '2024-12', purchaseRate: 85, mrp: 120, quantity: 45, purchaseInvoiceId: 'inv2' },
  { id: 'b7', medicineId: '6', batchNumber: 'CET2024V', expiryDate: '2026-03', purchaseRate: 8, mrp: 15, quantity: 300, purchaseInvoiceId: 'inv1' },
  { id: 'b8', medicineId: '7', batchNumber: 'PAN2024U', expiryDate: '2025-09', purchaseRate: 55, mrp: 85, quantity: 90, purchaseInvoiceId: 'inv2' },
  { id: 'b9', medicineId: '8', batchNumber: 'DOL2024T', expiryDate: '2025-11', purchaseRate: 22, mrp: 32, quantity: 250, purchaseInvoiceId: 'inv1' },
];

export function usePharmacyData() {
  const [medicines, setMedicines] = useState<Medicine[]>(DEMO_MEDICINES);
  const [batches, setBatches] = useState<Batch[]>(DEMO_BATCHES);
  const [todaySales, setTodaySales] = useState(12450);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate stock alerts
  const getStockAlerts = (): StockAlert[] => {
    const alerts: StockAlert[] = [];
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    batches.forEach((batch) => {
      const medicine = medicines.find((m) => m.id === batch.medicineId);
      if (!medicine) return;

      const [year, month] = batch.expiryDate.split('-').map(Number);
      const expiryDate = new Date(year, month - 1, 28); // End of month

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
  };

  const alerts = getStockAlerts();
  const lowStockCount = alerts.filter((a) => a.alertType === 'low_stock').length;
  const expiryAlertCount = alerts.filter((a) => a.alertType === 'expiring_soon' || a.alertType === 'expired').length;

  // Get medicine with stock info
  const getMedicineWithStock = () => {
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
  };

  // Add stock from purchase invoice
  const addPurchaseStock = (items: Array<{
    medicineName: string;
    quantity: number;
    purchaseRate: number;
    mrp: number;
    batchNumber: string;
    expiryDate: string;
  }>) => {
    const newBatches: Batch[] = [];
    
    items.forEach((item) => {
      // Find or create medicine
      let medicine = medicines.find(
        (m) => m.name.toLowerCase() === item.medicineName.toLowerCase()
      );
      
      if (!medicine) {
        medicine = {
          id: `med_${Date.now()}_${Math.random()}`,
          name: item.medicineName,
          gstRate: 12,
          isActive: true,
        };
        setMedicines((prev) => [...prev, medicine!]);
      }

      // Create batch
      const batch: Batch = {
        id: `batch_${Date.now()}_${Math.random()}`,
        medicineId: medicine.id,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        purchaseRate: item.purchaseRate,
        mrp: item.mrp,
        quantity: item.quantity,
        purchaseInvoiceId: `inv_${Date.now()}`,
      };
      
      newBatches.push(batch);
    });

    setBatches((prev) => [...prev, ...newBatches]);
    return newBatches;
  };

  // Process sale (FIFO)
  const processSale = (medicineId: string, quantity: number) => {
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

    // Update batch quantities
    setBatches((prev) =>
      prev.map((batch) => {
        const sale = saleItems.find((s) => s.batchId === batch.id);
        if (sale) {
          return { ...batch, quantity: batch.quantity - sale.qty };
        }
        return batch;
      })
    );

    // Update today's sales
    const saleAmount = saleItems.reduce((sum, s) => sum + s.qty * s.mrp, 0);
    setTodaySales((prev) => prev + saleAmount);

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
  };
}
