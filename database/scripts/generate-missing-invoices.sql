-- Generate invoices for all parcels that don't have one yet

DO $$
DECLARE
    parcel_record RECORD;
    new_invoice_id UUID;
    invoice_number TEXT;
    invoice_count INT;
    base_rate DECIMAL;
    per_pound_rate DECIMAL;
    weight DECIMAL;
    subtotal DECIMAL;
    total DECIMAL;
BEGIN
    -- Get current invoice count for numbering
    SELECT COUNT(*) INTO invoice_count FROM invoices;
    
    -- Loop through all parcels
    FOR parcel_record IN 
        SELECT p.id, p.user_id, p.tracking_number, p.weight, p.declared_value, p.category_id,
               pc.base_rate, pc.per_pound_rate
        FROM parcels p
        LEFT JOIN parcel_categories pc ON p.category_id = pc.id
        WHERE p.id NOT IN (
            SELECT DISTINCT ii.parcel_id 
            FROM invoice_items ii
        )
    LOOP
        -- Generate invoice number
        invoice_count := invoice_count + 1;
        invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(invoice_count::TEXT, 6, '0');
        
        -- Calculate amounts
        base_rate := COALESCE(parcel_record.base_rate, 10.00);
        per_pound_rate := COALESCE(parcel_record.per_pound_rate, 2.00);
        weight := COALESCE(parcel_record.weight, 1.00);
        subtotal := base_rate + (per_pound_rate * weight);
        total := subtotal;
        
        -- Create invoice
        INSERT INTO invoices (
            id, user_id, invoice_number, subtotal, tax, fees, total, 
            status, due_date, created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            parcel_record.user_id,
            invoice_number,
            subtotal,
            0,
            0,
            total,
            'PENDING',
            NOW() + INTERVAL '30 days',
            NOW(),
            NOW()
        ) RETURNING id INTO new_invoice_id;
        
        -- Create invoice item
        INSERT INTO invoice_items (
            id, invoice_id, parcel_id, description, quantity, unit_price, total,
            created_at
        ) VALUES (
            gen_random_uuid(),
            new_invoice_id,
            parcel_record.id,
            'Frais de transport pour ' || parcel_record.tracking_number,
            1,
            total,
            total,
            NOW()
        );
        
        RAISE NOTICE 'Created invoice % for parcel %', invoice_number, parcel_record.tracking_number;
    END LOOP;
    
    RAISE NOTICE 'Invoice generation completed';
END $$;

-- Show summary
SELECT 
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_invoices,
    COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_invoices,
    SUM(CASE WHEN status = 'PENDING' THEN total ELSE 0 END) as pending_amount
FROM invoices;
