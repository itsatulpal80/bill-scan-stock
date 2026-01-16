import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, Loader2, Check, X, AlertCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { OCRResult, OCRItem } from '@/types/pharmacy';

// Simulated OCR result for demo
const DEMO_OCR_RESULT: OCRResult = {
  supplierName: 'ABC Pharma Distributors',
  invoiceNumber: 'INV-2024-0847',
  invoiceDate: '2024-01-15',
  items: [
    { medicineName: 'Paracetamol 500mg', quantity: 100, purchaseRate: 18, mrp: 25, batchNumber: 'PAR2025A', expiryDate: '2025-12', confidence: 95 },
    { medicineName: 'Amoxicillin 250mg', quantity: 50, purchaseRate: 45, mrp: 65, batchNumber: 'AMX2025B', expiryDate: '2025-08', confidence: 88 },
    { medicineName: 'Omeprazole 20mg', quantity: 80, purchaseRate: 32, mrp: 48, batchNumber: 'OMP2025C', expiryDate: '2025-10', confidence: 92 },
    { medicineName: 'Cetirizine 10mg', quantity: 200, purchaseRate: 8, mrp: 15, batchNumber: 'CET2025D', expiryDate: '2026-03', confidence: 78 },
  ],
};

type ScanStep = 'capture' | 'processing' | 'review';

export default function ScanBillPage() {
  const [step, setStep] = useState<ScanStep>('capture');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [editedItems, setEditedItems] = useState<OCRItem[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCapture = async (file: File) => {
    // Create preview URL
    const imageUrl = URL.createObjectURL(file);
    setCapturedImage(imageUrl);
    setStep('processing');

    // Simulate OCR processing
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Use demo result
    setOcrResult(DEMO_OCR_RESULT);
    setEditedItems([...DEMO_OCR_RESULT.items]);
    setStep('review');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCapture(file);
    }
  };

  const handleConfirm = () => {
    toast({
      title: 'Stock Updated!',
      description: `${editedItems.length} items added to inventory`,
    });
    navigate('/stock');
  };

  const updateItem = (index: number, field: keyof OCRItem, value: string | number) => {
    setEditedItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeItem = (index: number) => {
    setEditedItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <AppLayout title="Scan Purchase Bill">
      <div className="p-4">
        {step === 'capture' && (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-secondary rounded-xl p-4">
              <h3 className="font-semibold text-foreground mb-2">How to scan</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Place the bill on a flat surface</li>
                <li>• Ensure good lighting</li>
                <li>• Capture the full bill clearly</li>
                <li>• Wait for auto-extraction</li>
              </ul>
            </div>

            {/* Camera Button */}
            <div className="flex flex-col gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="h-40 flex-col gap-4 text-lg touch-feedback"
              >
                <Camera className="w-12 h-12" />
                Open Camera
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleCapture(file);
                  };
                  input.click();
                }}
                className="h-14 text-base touch-feedback"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload from Gallery
              </Button>
            </div>

            {/* Demo Button */}
            <Button
              variant="secondary"
              onClick={() => handleCapture(new File([''], 'demo.jpg'))}
              className="w-full h-12 touch-feedback"
            >
              Try Demo Scan
            </Button>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captured bill"
                className="w-full max-w-[300px] rounded-xl card-elevated"
              />
            )}
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Processing Bill...</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Extracting medicine details
              </p>
            </div>
          </div>
        )}

        {step === 'review' && ocrResult && (
          <div className="space-y-4">
            {/* Invoice Header */}
            <div className="bg-card rounded-xl border border-border p-4 card-elevated">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Supplier</p>
                  <p className="font-semibold">{ocrResult.supplierName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Invoice No.</p>
                  <p className="font-semibold">{ocrResult.invoiceNumber}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-semibold">{ocrResult.invoiceDate}</p>
                </div>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">
                Extracted Items ({editedItems.length})
              </h3>
              
              {editedItems.map((item, index) => (
                <div
                  key={index}
                  className={`bg-card rounded-xl border p-4 card-elevated ${
                    item.confidence < 85 ? 'border-warning' : 'border-border'
                  }`}
                >
                  {item.confidence < 85 && (
                    <div className="flex items-center gap-2 text-warning text-xs mb-3">
                      <AlertCircle className="w-4 h-4" />
                      Low confidence - please verify
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-3">
                    <input
                      type="text"
                      value={item.medicineName}
                      onChange={(e) => updateItem(index, 'medicineName', e.target.value)}
                      className="font-semibold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none flex-1 mr-2"
                    />
                    <button
                      onClick={() => removeItem(index)}
                      className="p-1 text-muted-foreground hover:text-destructive touch-feedback"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <label className="text-muted-foreground text-xs">Qty</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full font-medium bg-secondary rounded px-2 py-1 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-muted-foreground text-xs">Rate</label>
                      <input
                        type="number"
                        value={item.purchaseRate}
                        onChange={(e) => updateItem(index, 'purchaseRate', parseFloat(e.target.value) || 0)}
                        className="w-full font-medium bg-secondary rounded px-2 py-1 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-muted-foreground text-xs">MRP</label>
                      <input
                        type="number"
                        value={item.mrp}
                        onChange={(e) => updateItem(index, 'mrp', parseFloat(e.target.value) || 0)}
                        className="w-full font-medium bg-secondary rounded px-2 py-1 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-muted-foreground text-xs">Batch</label>
                      <input
                        type="text"
                        value={item.batchNumber}
                        onChange={(e) => updateItem(index, 'batchNumber', e.target.value)}
                        className="w-full font-medium bg-secondary rounded px-2 py-1 mt-1"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-muted-foreground text-xs">Expiry</label>
                      <input
                        type="month"
                        value={item.expiryDate}
                        onChange={(e) => updateItem(index, 'expiryDate', e.target.value)}
                        className="w-full font-medium bg-secondary rounded px-2 py-1 mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="sticky bottom-20 bg-background pt-4 pb-2 space-y-3">
              <Button
                onClick={handleConfirm}
                className="w-full h-14 text-base font-semibold touch-feedback"
              >
                <Check className="w-5 h-5 mr-2" />
                Confirm & Add to Stock
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setStep('capture');
                  setCapturedImage(null);
                  setOcrResult(null);
                }}
                className="w-full h-12 touch-feedback"
              >
                Scan Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
