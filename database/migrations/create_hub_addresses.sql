-- Create hub_addresses table
CREATE TABLE hub_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hub VARCHAR(3) UNIQUE NOT NULL,
    hub_name VARCHAR(255) NOT NULL,
    street VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zipcode VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on hub column
CREATE INDEX idx_hub_addresses_hub ON hub_addresses(hub);

-- Insert default hub addresses
INSERT INTO hub_addresses (hub, hub_name, street, city, state, zipcode) VALUES
('MIA', 'Miami', '1234 Shipping Way', 'Miami', 'FL', '33101'),
('MDL', 'Medley', '5678 Cargo Street', 'Medley', 'FL', '33166'),
('FLL', 'Fort Lauderdale', '9012 Freight Avenue', 'Fort Lauderdale', 'FL', '33315'),
('WPB', 'West Palm Beach', '3456 Logistics Blvd', 'West Palm Beach', 'FL', '33401'),
('ORL', 'Orlando', '7890 Distribution Dr', 'Orlando', 'FL', '32801'),
('TPA', 'Tampa', '2345 Commerce Way', 'Tampa', 'FL', '33602'),
('JAX', 'Jacksonville', '6789 Trade Center', 'Jacksonville', 'FL', '32202'),
('NYC', 'New York', '1111 Cargo Street', 'New York', 'NY', '10001'),
('LAX', 'Los Angeles', '2222 Freight Avenue', 'Los Angeles', 'CA', '90001');
