import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Medicine, Batch, StockAlert, OCRItem } from '@/types/pharmacy';
import { useToast } from '@/hooks/use-toast';

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
    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching medicines:', error);
      return [];
    }
    
    return (data as DbMedicine[]).map((m): Medicine => ({
      id: m.id,
      name: m.name,
      manufacturer: m.manufacturer || undefined,
      category: m.category || undefined,
      hsnCode: m.hsn_code || undefined,
      gstRate: Number(m.gst_rate),
      isActive: m.is_active,
    }));
  }, []);

  // Fetch batches from database
  const fetchBatches = useCallback(async () => {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .order('expiry_date');
    
    if (error) {
      console.error('Error fetching batches:', error);
      return [];
    }
    
    return (data as DbBatch[]).map((b): Batch => ({
      id: b.id,
      medicineId: b.medicine_id,
      batchNumber: b.batch_number,
      expiryDate: b.expiry_date,
      purchaseRate: Number(b.purchase_rate),
      mrp: Number(b.mrp),
      quantity: b.quantity,
      purchaseInvoiceId: b.purchase_invoice_id || '',
    }));
  }, []);

  // Fetch today's sales total
  const fetchTodaySales = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('sales')
      .select('net_amount')
      .gte('created_at', today);
    
    if (error) {
      console.error('Error fetching today sales:', error);
      return 0;
    }
    
    return data.reduce((sum, sale) => sum + Number(sale.net_amount), 0);
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
    try {
      // Create purchase invoice record
      const { data: invoiceRecord, error: invoiceError } = await supabase
        .from('purchase_invoices')
        .insert({
          invoice_number: invoiceData?.invoiceNumber || null,
          invoice_date: invoiceData?.invoiceDate || null,
          supplier_name: invoiceData?.supplierName || null,
          total_amount: items.reduce((sum, item) => sum + (item.purchaseRate * item.quantity), 0),
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError);
        throw invoiceError;
      }

      for (const item of items) {
        // Find existing medicine by name (case-insensitive)
        const { data: existingMedicines } = await supabase
          .from('medicines')
          .select('*')
          .ilike('name', item.medicineName);
        
        let medicineId: string;
        
        if (existingMedicines && existingMedicines.length > 0) {
          medicineId = existingMedicines[0].id;
        } else {
          // Create new medicine
          const { data: newMedicine, error: medError } = await supabase
            .from('medicines')
            .insert({
              name: item.medicineName,
              gst_rate: item.gstRate || 12,
              is_active: true,
            })
            .select()
            .single();
          
          if (medError) {
            console.error('Error creating medicine:', medError);
            throw medError;
          }
          medicineId = newMedicine.id;
        }

        // Create batch
        const { error: batchError } = await supabase
          .from('batches')
          .insert({
            medicine_id: medicineId,
            batch_number: item.batchNumber,
            expiry_date: item.expiryDate,
            purchase_rate: item.purchaseRate,
            mrp: item.mrp,
            quantity: item.quantity,
            purchase_invoice_id: invoiceRecord.id,
          });
        
        if (batchError) {
          console.error('Error creating batch:', batchError);
          throw batchError;
        }
      }

      // Refresh data after adding stock
      await refreshData();
      
      return true;
    } catch (error) {
      console.error('Error adding purchase stock:', error);
      throw error;
    }
  };

  // Delete a batch
  const deleteBatch = async (batchId: string) => {
    const { error } = await supabase
      .from('batches')
      .delete()
      .eq('id', batchId);
    
    if (error) {
      console.error('Error deleting batch:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete batch',
        variant: 'destructive',
      });
      return false;
    }
    
    await refreshData();
    return true;
  };

  // Delete a medicine (and all its batches via cascade)
  const deleteMedicine = async (medicineId: string) => {
    const { error } = await supabase
      .from('medicines')
      .delete()
      .eq('id', medicineId);
    
    if (error) {
      console.error('Error deleting medicine:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete medicine',
        variant: 'destructive',
      });
      return false;
    }
    
    await refreshData();
    return true;
  };

  // Update batch quantity
  const updateBatchQuantity = async (batchId: string, newQuantity: number) => {
    const { error } = await supabase
      .from('batches')
      .update({ quantity: newQuantity })
      .eq('id', batchId);
    
    if (error) {
      console.error('Error updating batch:', error);
      return false;
    }
    
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

    // Update batch quantities in database
    for (const item of saleItems) {
      const batch = batches.find(b => b.id === item.batchId);
      if (batch) {
        await supabase
          .from('batches')
          .update({ quantity: batch.quantity - item.qty })
          .eq('id', item.batchId);
      }
    }

    // Refresh data
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
