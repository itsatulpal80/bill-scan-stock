-- Create medicines table
CREATE TABLE public.medicines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  manufacturer TEXT,
  category TEXT,
  hsn_code TEXT,
  gst_rate NUMERIC NOT NULL DEFAULT 12,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create batches table
CREATE TABLE public.batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  expiry_date TEXT NOT NULL, -- YYYY-MM format
  purchase_rate NUMERIC NOT NULL,
  mrp NUMERIC NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  purchase_invoice_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase_invoices table
CREATE TABLE public.purchase_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT,
  invoice_date TEXT,
  supplier_name TEXT,
  supplier_gst TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  gst_amount NUMERIC NOT NULL DEFAULT 0,
  scanned_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales table
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_number TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  payment_mode TEXT NOT NULL DEFAULT 'cash',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sale_items table
CREATE TABLE public.sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES public.medicines(id),
  batch_id UUID NOT NULL REFERENCES public.batches(id),
  medicine_name TEXT NOT NULL,
  batch_number TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  mrp NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key for batches to purchase_invoices
ALTER TABLE public.batches
ADD CONSTRAINT batches_purchase_invoice_id_fkey
FOREIGN KEY (purchase_invoice_id) REFERENCES public.purchase_invoices(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX idx_batches_medicine_id ON public.batches(medicine_id);
CREATE INDEX idx_batches_expiry_date ON public.batches(expiry_date);
CREATE INDEX idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX idx_medicines_name ON public.medicines(name);

-- Enable Row Level Security
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (this is a local pharmacy app)
-- In production, you'd want proper user-based RLS
CREATE POLICY "Allow all operations on medicines" ON public.medicines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on batches" ON public.batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on purchase_invoices" ON public.purchase_invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on sale_items" ON public.sale_items FOR ALL USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_medicines_updated_at
  BEFORE UPDATE ON public.medicines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_batches_updated_at
  BEFORE UPDATE ON public.batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();