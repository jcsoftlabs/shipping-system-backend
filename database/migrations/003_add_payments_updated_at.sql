-- ============================================================================
-- Migration: Add updated_at column to payments table
-- Date: 2026-01-23
-- Description: Add missing updated_at column and trigger for payments table
-- ============================================================================

-- Add updated_at column to payments table
ALTER TABLE payments 
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

-- Create trigger to auto-update updated_at
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update existing rows to have current timestamp
UPDATE payments SET updated_at = created_at WHERE updated_at IS NULL;

-- Add comment
COMMENT ON COLUMN payments.updated_at IS 'Timestamp of last update';
