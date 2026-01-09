-- Add metadata column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add comment
COMMENT ON COLUMN payments.metadata IS 'Additional payment metadata (receivedBy, notes, changeGiven for cash payments)';
