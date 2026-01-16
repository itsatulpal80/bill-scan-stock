// Core data types for pharmacy management

export type UserRole = 'owner' | 'staff';

export interface User {
  id: string;
  name: string;
  mobile: string;
  role: UserRole;
  shopId: string;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  gstNumber?: string;
  phone: string;
  licenseNumber?: string;
}

export interface Medicine {
  id: string;
  name: string;
  manufacturer?: string;
  category?: string;
  hsnCode?: string;
  gstRate: number;
  isActive: boolean;
}

export interface Batch {
  id: string;
  medicineId: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM
  purchaseRate: number;
  mrp: number;
  quantity: number;
  purchaseInvoiceId: string;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  supplierName: string;
  supplierGst?: string;
  totalAmount: number;
  gstAmount: number;
  createdAt: string;
  scannedImageUrl?: string;
}

export interface PurchaseInvoiceItem {
  id: string;
  invoiceId: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  purchaseRate: number;
  mrp: number;
  batchNumber: string;
  expiryDate: string;
  gstRate: number;
  amount: number;
  ocrConfidence?: number; // 0-100, highlight if low
}

export interface Sale {
  id: string;
  billNumber: string;
  customerName?: string;
  customerPhone?: string;
  totalAmount: number;
  discount: number;
  netAmount: number;
  paymentMode: 'cash' | 'upi' | 'card';
  createdAt: string;
  createdBy: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  medicineId: string;
  batchId: string;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  mrp: number;
  amount: number;
}

export interface StockAlert {
  medicineId: string;
  medicineName: string;
  alertType: 'expired' | 'expiring_soon' | 'low_stock';
  batchNumber?: string;
  expiryDate?: string;
  currentQuantity?: number;
  minQuantity?: number;
}

// OCR result from bill scanning
export interface OCRResult {
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  items: OCRItem[];
  rawText?: string;
}

export interface OCRItem {
  medicineName: string;
  quantity: number;
  purchaseRate: number;
  mrp: number;
  batchNumber: string;
  expiryDate: string;
  gstRate?: number;
  confidence: number; // 0-100
}
