-- Add missing gateway_response column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_response JSONB;

-- Add comment
COMMENT ON COLUMN payments.gateway_response IS 'Response from payment gateway (Stripe, etc.)';
