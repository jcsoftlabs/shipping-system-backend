-- ============================================================================
-- DONNÉES D'EXEMPLE - PLATEFORME SHIPPING
-- ============================================================================

-- ============================================================================
-- 1. PERMISSIONS
-- ============================================================================
INSERT INTO permissions (name, description, resource, action) VALUES
  ('view_users', 'Voir les utilisateurs', 'users', 'read'),
  ('create_users', 'Créer des utilisateurs', 'users', 'create'),
  ('update_users', 'Modifier des utilisateurs', 'users', 'update'),
  ('delete_users', 'Supprimer des utilisateurs', 'users', 'delete'),
  
  ('view_parcels', 'Voir les colis', 'parcels', 'read'),
  ('create_parcels', 'Créer des colis', 'parcels', 'create'),
  ('update_parcels', 'Modifier des colis', 'parcels', 'update'),
  ('delete_parcels', 'Supprimer des colis', 'parcels', 'delete'),
  
  ('view_invoices', 'Voir les factures', 'invoices', 'read'),
  ('create_invoices', 'Créer des factures', 'invoices', 'create'),
  ('update_invoices', 'Modifier des factures', 'invoices', 'update'),
  ('delete_invoices', 'Supprimer des factures', 'invoices', 'delete'),
  
  ('view_reports', 'Voir les rapports', 'reports', 'read'),
  ('manage_settings', 'Gérer les paramètres', 'settings', 'update');

-- ============================================================================
-- 2. ROLE_PERMISSIONS
-- ============================================================================

-- Permissions SUPER_ADMIN (toutes)
INSERT INTO role_permissions (role, permission_id)
SELECT 'SUPER_ADMIN', id FROM permissions;

-- Permissions ADMIN (presque toutes sauf delete users)
INSERT INTO role_permissions (role, permission_id)
SELECT 'ADMIN', id FROM permissions WHERE name != 'delete_users';

-- Permissions AGENT (gestion des colis et factures)
INSERT INTO role_permissions (role, permission_id)
SELECT 'AGENT', id FROM permissions 
WHERE resource IN ('parcels', 'invoices') AND action IN ('read', 'create', 'update');

-- Permissions CLIENT (lecture uniquement de ses propres données)
INSERT INTO role_permissions (role, permission_id)
SELECT 'CLIENT', id FROM permissions 
WHERE resource IN ('parcels', 'invoices') AND action = 'read';

-- ============================================================================
-- 3. UTILISATEURS
-- ============================================================================

-- Super Admin
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, email_verified, is_active) VALUES
  ('admin@shipping-ht.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxF6q4fpu', 'SUPER_ADMIN', 'Super', 'Admin', '+15551234567', TRUE, TRUE);

-- Agents
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, email_verified, is_active) VALUES
  ('agent1@shipping-ht.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxF6q4fpu', 'AGENT', 'Marie', 'Dupont', '+15559876543', TRUE, TRUE),
  ('agent2@shipping-ht.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxF6q4fpu', 'AGENT', 'Jean', 'Pierre', '+15559876544', TRUE, TRUE);

-- Clients
INSERT INTO users (email, password_hash, role, first_name, last_name, phone, email_verified, is_active) VALUES
  ('john.doe@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxF6q4fpu', 'CLIENT', 'John', 'Doe', '+15551111111', TRUE, TRUE),
  ('jane.smith@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxF6q4fpu', 'CLIENT', 'Jane', 'Smith', '+15552222222', TRUE, TRUE),
  ('pierre.jean@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxF6q4fpu', 'CLIENT', 'Pierre', 'Jean', '+15553333333', TRUE, TRUE),
  ('marie.joseph@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxF6q4fpu', 'CLIENT', 'Marie', 'Joseph', '+15554444444', TRUE, TRUE);

-- ============================================================================
-- 4. COMPTEURS D'ADRESSES
-- ============================================================================
INSERT INTO address_counters (hub, current_sequence) VALUES
  ('MIA', 4),
  ('FLL', 0),
  ('NYC', 0);

-- ============================================================================
-- 5. ADRESSES PERSONNALISÉES
-- ============================================================================

-- Adresses pour les clients
INSERT INTO custom_addresses (user_id, address_code, hub, client_id, unit, us_street, us_city, us_state, us_zipcode, status, is_primary, generated_at, activated_at)
SELECT 
  u.id,
  'HT-MIA-00001/A',
  'MIA',
  '00001',
  'A',
  '00001A Warehouse Blvd',
  'Miami',
  'FL',
  '33101',
  'ACTIVE',
  TRUE,
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '30 days'
FROM users u WHERE u.email = 'john.doe@example.com';

INSERT INTO custom_addresses (user_id, address_code, hub, client_id, unit, us_street, us_city, us_state, us_zipcode, status, is_primary, generated_at, activated_at)
SELECT 
  u.id,
  'HT-MIA-00002/A',
  'MIA',
  '00002',
  'A',
  '00002A Warehouse Blvd',
  'Miami',
  'FL',
  '33101',
  'ACTIVE',
  TRUE,
  NOW() - INTERVAL '25 days',
  NOW() - INTERVAL '25 days'
FROM users u WHERE u.email = 'jane.smith@example.com';

INSERT INTO custom_addresses (user_id, address_code, hub, client_id, unit, us_street, us_city, us_state, us_zipcode, status, is_primary, generated_at, activated_at)
SELECT 
  u.id,
  'HT-MIA-00003/A',
  'MIA',
  '00003',
  'A',
  '00003A Warehouse Blvd',
  'Miami',
  'FL',
  '33101',
  'ACTIVE',
  TRUE,
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '20 days'
FROM users u WHERE u.email = 'pierre.jean@example.com';

INSERT INTO custom_addresses (user_id, address_code, hub, client_id, unit, us_street, us_city, us_state, us_zipcode, status, is_primary, generated_at, activated_at)
SELECT 
  u.id,
  'HT-MIA-00004/A',
  'MIA',
  '00004',
  'A',
  '00004A Warehouse Blvd',
  'Miami',
  'FL',
  '33101',
  'ACTIVE',
  TRUE,
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '15 days'
FROM users u WHERE u.email = 'marie.joseph@example.com';

-- ============================================================================
-- 6. CATÉGORIES DE COLIS
-- ============================================================================
INSERT INTO parcel_categories (name, description, icon, base_rate, per_pound_rate, max_weight_lbs, is_active) VALUES
  ('Électronique', 'Appareils électroniques, téléphones, ordinateurs', '📱', 15.00, 2.50, 50.0, TRUE),
  ('Vêtements', 'Vêtements, chaussures, accessoires', '👕', 10.00, 1.50, 100.0, TRUE),
  ('Alimentation', 'Produits alimentaires non périssables', '🍽️', 12.00, 2.00, 75.0, TRUE),
  ('Médicaments', 'Médicaments et produits de santé', '💊', 20.00, 3.00, 25.0, TRUE),
  ('Documents', 'Documents, livres, papiers', '📄', 8.00, 1.00, 10.0, TRUE),
  ('Autre', 'Autres articles', '📦', 10.00, 2.00, 100.0, TRUE);

-- ============================================================================
-- 7. COLIS
-- ============================================================================

-- Colis pour John Doe
INSERT INTO parcels (tracking_number, user_id, custom_address_id, category_id, carrier, carrier_tracking_number, description, weight, length, width, height, declared_value, status, warehouse, received_at)
SELECT 
  'PKG-2024-001',
  u.id,
  ca.id,
  pc.id,
  'USPS',
  '9400111899562941234567',
  'iPhone 15 Pro',
  1.5,
  6.0,
  3.0,
  0.5,
  999.00,
  'DELIVERED',
  'MIA',
  NOW() - INTERVAL '10 days'
FROM users u
JOIN custom_addresses ca ON u.id = ca.user_id
JOIN parcel_categories pc ON pc.name = 'Électronique'
WHERE u.email = 'john.doe@example.com' AND ca.is_primary = TRUE;

INSERT INTO parcels (tracking_number, user_id, custom_address_id, category_id, carrier, carrier_tracking_number, description, weight, length, width, height, declared_value, status, warehouse, received_at)
SELECT 
  'PKG-2024-002',
  u.id,
  ca.id,
  pc.id,
  'FedEx',
  'FX123456789US',
  'Vêtements et chaussures',
  5.0,
  12.0,
  10.0,
  8.0,
  250.00,
  'IN_TRANSIT',
  'MIA',
  NOW() - INTERVAL '5 days'
FROM users u
JOIN custom_addresses ca ON u.id = ca.user_id
JOIN parcel_categories pc ON pc.name = 'Vêtements'
WHERE u.email = 'john.doe@example.com' AND ca.is_primary = TRUE;

-- Colis pour Jane Smith
INSERT INTO parcels (tracking_number, user_id, custom_address_id, category_id, carrier, description, weight, length, width, height, declared_value, status, warehouse, received_at)
SELECT 
  'PKG-2024-003',
  u.id,
  ca.id,
  pc.id,
  'UPS',
  'Médicaments et vitamines',
  2.0,
  8.0,
  6.0,
  4.0,
  150.00,
  'RECEIVED',
  'MIA',
  NOW() - INTERVAL '2 days'
FROM users u
JOIN custom_addresses ca ON u.id = ca.user_id
JOIN parcel_categories pc ON pc.name = 'Médicaments'
WHERE u.email = 'jane.smith@example.com' AND ca.is_primary = TRUE;

-- Colis pour Pierre Jean
INSERT INTO parcels (tracking_number, user_id, custom_address_id, category_id, carrier, description, weight, length, width, height, declared_value, status, warehouse, received_at)
SELECT 
  'PKG-2024-004',
  u.id,
  ca.id,
  pc.id,
  'USPS',
  'Livres et documents',
  3.0,
  10.0,
  8.0,
  2.0,
  50.00,
  'READY',
  'MIA',
  NOW() - INTERVAL '3 days'
FROM users u
JOIN custom_addresses ca ON u.id = ca.user_id
JOIN parcel_categories pc ON pc.name = 'Documents'
WHERE u.email = 'pierre.jean@example.com' AND ca.is_primary = TRUE;

-- Colis pour Marie Joseph
INSERT INTO parcels (tracking_number, user_id, custom_address_id, category_id, carrier, description, weight, length, width, height, declared_value, status, warehouse)
SELECT 
  'PKG-2024-005',
  u.id,
  ca.id,
  pc.id,
  'FedEx',
  'Produits alimentaires',
  10.0,
  15.0,
  12.0,
  10.0,
  200.00,
  'PENDING',
  'MIA'
FROM users u
JOIN custom_addresses ca ON u.id = ca.user_id
JOIN parcel_categories pc ON pc.name = 'Alimentation'
WHERE u.email = 'marie.joseph@example.com' AND ca.is_primary = TRUE;

-- ============================================================================
-- 8. HISTORIQUE DES STATUTS (sera auto-généré par les triggers)
-- ============================================================================

-- Historique pour PKG-2024-001 (DELIVERED)
INSERT INTO parcel_status_history (parcel_id, old_status, new_status, location, description, source, created_at)
SELECT 
  p.id,
  NULL,
  'PENDING',
  'Online',
  'Colis enregistré dans le système',
  'SYSTEM',
  NOW() - INTERVAL '10 days'
FROM parcels p WHERE p.tracking_number = 'PKG-2024-001';

INSERT INTO parcel_status_history (parcel_id, old_status, new_status, location, description, source, created_at)
SELECT 
  p.id,
  'PENDING',
  'RECEIVED',
  'Miami Warehouse',
  'Colis reçu à l''entrepôt',
  'INTERNAL',
  NOW() - INTERVAL '10 days'
FROM parcels p WHERE p.tracking_number = 'PKG-2024-001';

INSERT INTO parcel_status_history (parcel_id, old_status, new_status, location, description, source, created_at)
SELECT 
  p.id,
  'RECEIVED',
  'SHIPPED',
  'Miami Port',
  'Colis expédié vers Haïti',
  'INTERNAL',
  NOW() - INTERVAL '8 days'
FROM parcels p WHERE p.tracking_number = 'PKG-2024-001';

INSERT INTO parcel_status_history (parcel_id, old_status, new_status, location, description, source, created_at)
SELECT 
  p.id,
  'SHIPPED',
  'IN_TRANSIT',
  'En mer',
  'Colis en transit maritime',
  'CARRIER',
  NOW() - INTERVAL '7 days'
FROM parcels p WHERE p.tracking_number = 'PKG-2024-001';

INSERT INTO parcel_status_history (parcel_id, old_status, new_status, location, description, source, created_at)
SELECT 
  p.id,
  'IN_TRANSIT',
  'CUSTOMS',
  'Port-au-Prince Customs',
  'Colis en douane',
  'CARRIER',
  NOW() - INTERVAL '3 days'
FROM parcels p WHERE p.tracking_number = 'PKG-2024-001';

INSERT INTO parcel_status_history (parcel_id, old_status, new_status, location, description, source, created_at)
SELECT 
  p.id,
  'CUSTOMS',
  'DELIVERED',
  'Port-au-Prince',
  'Colis livré au client',
  'INTERNAL',
  NOW() - INTERVAL '1 day'
FROM parcels p WHERE p.tracking_number = 'PKG-2024-001';

-- ============================================================================
-- 9. PRÉFÉRENCES DE NOTIFICATION
-- ============================================================================
INSERT INTO notification_preferences (user_id, email_enabled, sms_enabled, push_enabled)
SELECT id, TRUE, TRUE, TRUE FROM users WHERE role = 'CLIENT';

-- ============================================================================
-- 10. NOTIFICATIONS
-- ============================================================================
INSERT INTO notifications (user_id, type, channel, subject, message, status, sent_at, created_at)
SELECT 
  u.id,
  'EMAIL',
  'email',
  'Bienvenue sur Shipping HT',
  'Votre compte a été créé avec succès. Votre adresse personnalisée est: HT-MIA-00001/A',
  'SENT',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '30 days'
FROM users u WHERE u.email = 'john.doe@example.com';

INSERT INTO notifications (user_id, type, channel, subject, message, data, status, sent_at, read_at, created_at)
SELECT 
  u.id,
  'EMAIL',
  'email',
  'Colis reçu',
  'Votre colis PKG-2024-001 a été reçu à notre entrepôt de Miami',
  '{"tracking_number": "PKG-2024-001", "status": "RECEIVED"}',
  'READ',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '9 days',
  NOW() - INTERVAL '10 days'
FROM users u WHERE u.email = 'john.doe@example.com';

-- ============================================================================
-- 11. TARIFS DE SHIPPING
-- ============================================================================
INSERT INTO shipping_rates (weight_min, weight_max, base_rate, per_pound_rate, zone, service_type) VALUES
  (0.0, 5.0, 15.00, 2.00, 'HAITI', 'STANDARD'),
  (5.1, 10.0, 20.00, 1.80, 'HAITI', 'STANDARD'),
  (10.1, 25.0, 30.00, 1.50, 'HAITI', 'STANDARD'),
  (25.1, 50.0, 50.00, 1.20, 'HAITI', 'STANDARD'),
  (50.1, 100.0, 80.00, 1.00, 'HAITI', 'STANDARD'),
  
  (0.0, 5.0, 25.00, 3.00, 'HAITI', 'EXPRESS'),
  (5.1, 10.0, 35.00, 2.80, 'HAITI', 'EXPRESS'),
  (10.1, 25.0, 50.00, 2.50, 'HAITI', 'EXPRESS'),
  
  (0.0, 10.0, 12.00, 1.50, 'HAITI', 'ECONOMY'),
  (10.1, 50.0, 25.00, 1.20, 'HAITI', 'ECONOMY');

-- ============================================================================
-- 12. FACTURES
-- ============================================================================
INSERT INTO invoices (invoice_number, user_id, subtotal, tax, fees, total, status, due_date, created_at)
SELECT 
  'INV-2024-001',
  u.id,
  18.75,
  0.00,
  5.00,
  23.75,
  'PAID',
  NOW() + INTERVAL '30 days',
  NOW() - INTERVAL '10 days'
FROM users u WHERE u.email = 'john.doe@example.com';

INSERT INTO invoices (invoice_number, user_id, subtotal, tax, fees, total, status, due_date, created_at)
SELECT 
  'INV-2024-002',
  u.id,
  29.00,
  0.00,
  5.00,
  34.00,
  'PENDING',
  NOW() + INTERVAL '30 days',
  NOW() - INTERVAL '5 days'
FROM users u WHERE u.email = 'john.doe@example.com';

-- ============================================================================
-- 13. LIGNES DE FACTURE
-- ============================================================================
INSERT INTO invoice_items (invoice_id, parcel_id, description, quantity, unit_price, total)
SELECT 
  i.id,
  p.id,
  'Shipping - iPhone 15 Pro (1.5 lbs)',
  1,
  18.75,
  18.75
FROM invoices i
JOIN users u ON i.user_id = u.id
JOIN parcels p ON p.user_id = u.id AND p.tracking_number = 'PKG-2024-001'
WHERE i.invoice_number = 'INV-2024-001';

INSERT INTO invoice_items (invoice_id, parcel_id, description, quantity, unit_price, total)
SELECT 
  i.id,
  p.id,
  'Shipping - Vêtements (5.0 lbs)',
  1,
  29.00,
  29.00
FROM invoices i
JOIN users u ON i.user_id = u.id
JOIN parcels p ON p.user_id = u.id AND p.tracking_number = 'PKG-2024-002'
WHERE i.invoice_number = 'INV-2024-002';

-- ============================================================================
-- 14. PAIEMENTS
-- ============================================================================
INSERT INTO payments (invoice_id, user_id, amount, currency, method, status, transaction_id, gateway, processed_at, created_at)
SELECT 
  i.id,
  u.id,
  23.75,
  'USD',
  'CARD',
  'COMPLETED',
  'ch_3OxYZ123456789',
  'stripe',
  NOW() - INTERVAL '9 days',
  NOW() - INTERVAL '9 days'
FROM invoices i
JOIN users u ON i.user_id = u.id
WHERE i.invoice_number = 'INV-2024-001';

-- ============================================================================
-- 15. LOGS D'AUDIT
-- ============================================================================
INSERT INTO audit_logs (user_id, user_email, user_role, action, resource, resource_id, description, ip_address, created_at)
SELECT 
  u.id,
  u.email,
  u.role,
  'LOGIN',
  'auth',
  u.id,
  'Connexion réussie',
  '192.168.1.100',
  NOW() - INTERVAL '1 hour'
FROM users u WHERE u.email = 'admin@shipping-ht.com';

INSERT INTO audit_logs (user_id, user_email, user_role, action, resource, resource_id, description, ip_address, created_at)
SELECT 
  u.id,
  u.email,
  u.role,
  'UPDATE',
  'parcels',
  p.id,
  'Statut du colis changé de RECEIVED à READY',
  '192.168.1.101',
  NOW() - INTERVAL '3 days'
FROM users u
JOIN parcels p ON p.tracking_number = 'PKG-2024-004'
WHERE u.email = 'agent1@shipping-ht.com';

-- ============================================================================
-- FIN DES DONNÉES D'EXEMPLE
-- ============================================================================
