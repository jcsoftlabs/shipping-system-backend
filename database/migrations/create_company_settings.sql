-- Create company_settings table
CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) DEFAULT 'Shipping Platform',
    company_address VARCHAR(255),
    company_city VARCHAR(100),
    company_state VARCHAR(50),
    company_zipcode VARCHAR(20),
    company_phone VARCHAR(50),
    company_email VARCHAR(255),
    company_website VARCHAR(255),
    receipt_footer TEXT,
    logo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO company_settings (
    company_name,
    company_address,
    company_city,
    company_state,
    company_zipcode,
    company_phone,
    company_email,
    receipt_footer
) VALUES (
    'Haiti Shipping Platform',
    '123 Main Street',
    'Port-au-Prince',
    'Haiti',
    'HT6110',
    '+509 1234-5678',
    'contact@haitishipping.com',
    'Merci pour votre confiance! Thank you for your business!'
);
