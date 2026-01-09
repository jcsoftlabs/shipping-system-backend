-- Add missing notes column to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment
COMMENT ON COLUMN invoices.notes IS 'Optional notes for the invoice';
