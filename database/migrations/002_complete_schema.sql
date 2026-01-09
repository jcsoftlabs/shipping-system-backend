-- ============================================================================
-- SCHÉMA COMPLET - PLATEFORME SHIPPING USA → HAÏTI
-- Base de données: PostgreSQL 15+
-- ============================================================================

-- ============================================================================
-- EXTENSION: UUID Generation
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Rôles utilisateurs
CREATE TYPE user_role AS ENUM ('CLIENT', 'AGENT', 'ADMIN', 'SUPER_ADMIN');

-- Statuts de colis
CREATE TYPE parcel_status AS ENUM (
  'PENDING',           -- En attente de réception
  'RECEIVED',          -- Reçu à l'entrepôt
  'PROCESSING',        -- En traitement
  'READY',             -- Prêt à expédier
  'SHIPPED',           -- Expédié
  'IN_TRANSIT',        -- En transit
  'CUSTOMS',           -- En douane
  'OUT_FOR_DELIVERY',  -- En cours de livraison
  'DELIVERED',         -- Livré
  'EXCEPTION',         -- Exception/Problème
  'RETURNED',          -- Retourné
  'CANCELLED'          -- Annulé
);

-- Statuts d'adresse
CREATE TYPE address_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- Types de notification
CREATE TYPE notification_type AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');

-- Statuts de notification
CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- Types d'action pour audit
CREATE TYPE audit_action AS ENUM (
  'CREATE', 'READ', 'UPDATE', 'DELETE',
  'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE',
  'STATUS_CHANGE', 'EXPORT', 'IMPORT'
);

-- ============================================================================
-- TABLE: users
-- Tous les utilisateurs du système (clients, agents, admins)
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'CLIENT',
  
  -- Informations personnelles
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  avatar_url TEXT,
  
  -- Sécurité
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(255),
  
  -- Statut
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP,
  last_login_ip INET,
  
  -- Métadonnées
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT chk_phone_format CHECK (phone IS NULL OR phone ~ '^\+?[0-9]{10,15}$')
);

-- Index
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- Commentaires
COMMENT ON TABLE users IS 'Tous les utilisateurs du système (clients, agents, admins)';
COMMENT ON COLUMN users.role IS 'Rôle: CLIENT, AGENT, ADMIN, SUPER_ADMIN';

-- ============================================================================
-- TABLE: permissions
-- Permissions disponibles dans le système
-- ============================================================================
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT uq_resource_action UNIQUE (resource, action)
);

-- Commentaires
COMMENT ON TABLE permissions IS 'Permissions disponibles dans le système';

-- ============================================================================
-- TABLE: role_permissions
-- Association entre rôles et permissions
-- ============================================================================
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT uq_role_permission UNIQUE (role, permission_id)
);

-- Index
CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- ============================================================================
-- TABLE: address_counters
-- Compteurs pour générer les CLIENT_ID par HUB
-- ============================================================================
CREATE TABLE address_counters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hub VARCHAR(3) NOT NULL UNIQUE,
  current_sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT chk_hub_format CHECK (hub ~ '^[A-Z]{3}$'),
  CONSTRAINT chk_sequence_range CHECK (current_sequence >= 0 AND current_sequence <= 99999)
);

-- Index
CREATE UNIQUE INDEX idx_address_counters_hub ON address_counters(hub);

-- ============================================================================
-- TABLE: custom_addresses
-- Adresses personnalisées des clients (HT-MIA-XXXXX/A)
-- ============================================================================
CREATE TABLE custom_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Composants de l'adresse
  address_code VARCHAR(20) NOT NULL UNIQUE,
  hub VARCHAR(3) NOT NULL,
  client_id VARCHAR(5) NOT NULL,
  unit VARCHAR(1) NOT NULL,
  
  -- Adresse USA complète
  us_street VARCHAR(255) NOT NULL,
  us_city VARCHAR(100) NOT NULL,
  us_state VARCHAR(2) NOT NULL,
  us_zipcode VARCHAR(10) NOT NULL,
  
  -- Métadonnées
  status address_status DEFAULT 'ACTIVE',
  is_primary BOOLEAN DEFAULT FALSE,
  generated_at TIMESTAMP DEFAULT NOW(),
  activated_at TIMESTAMP,
  deactivated_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT chk_address_format CHECK (address_code ~ '^HT-[A-Z]{3}-[0-9]{5}/[A-Z]$'),
  CONSTRAINT chk_hub_format CHECK (hub ~ '^[A-Z]{3}$'),
  CONSTRAINT chk_client_id_format CHECK (client_id ~ '^[0-9]{5}$'),
  CONSTRAINT chk_unit_format CHECK (unit ~ '^[A-Z]$'),
  CONSTRAINT chk_us_state CHECK (us_state ~ '^[A-Z]{2}$'),
  CONSTRAINT uq_address_code UNIQUE (address_code),
  CONSTRAINT uq_user_hub_client_unit UNIQUE (user_id, hub, client_id, unit)
);

-- Index
CREATE INDEX idx_custom_addresses_user_id ON custom_addresses(user_id);
CREATE INDEX idx_custom_addresses_code ON custom_addresses(address_code);
CREATE INDEX idx_custom_addresses_hub ON custom_addresses(hub);
CREATE INDEX idx_custom_addresses_status ON custom_addresses(status);
CREATE INDEX idx_custom_addresses_primary ON custom_addresses(user_id, is_primary) WHERE is_primary = TRUE;

-- Commentaires
COMMENT ON TABLE custom_addresses IS 'Adresses personnalisées des clients (format: HT-MIA-01044/A)';

-- ============================================================================
-- TABLE: parcel_categories
-- Catégories de colis
-- ============================================================================
CREATE TABLE parcel_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  
  -- Règles de tarification
  base_rate DECIMAL(10, 2),
  per_pound_rate DECIMAL(10, 2),
  
  -- Restrictions
  max_weight_lbs DECIMAL(10, 2),
  max_length_inches DECIMAL(10, 2),
  max_width_inches DECIMAL(10, 2),
  max_height_inches DECIMAL(10, 2),
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_parcel_categories_active ON parcel_categories(is_active) WHERE is_active = TRUE;

-- Commentaires
COMMENT ON TABLE parcel_categories IS 'Catégories de colis (électronique, vêtements, etc.)';

-- ============================================================================
-- TABLE: parcels
-- Colis des clients
-- ============================================================================
CREATE TABLE parcels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_number VARCHAR(100) NOT NULL UNIQUE,
  
  -- Relations
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  custom_address_id UUID NOT NULL REFERENCES custom_addresses(id),
  category_id UUID REFERENCES parcel_categories(id),
  
  -- Informations transporteur
  carrier VARCHAR(50),
  carrier_tracking_number VARCHAR(100),
  
  -- Détails du colis
  description TEXT,
  weight DECIMAL(10, 2),
  length DECIMAL(10, 2),
  width DECIMAL(10, 2),
  height DECIMAL(10, 2),
  declared_value DECIMAL(10, 2),
  
  -- Statut actuel
  status parcel_status NOT NULL DEFAULT 'PENDING',
  
  -- Localisation
  warehouse VARCHAR(10),
  current_location VARCHAR(255),
  
  -- Dates importantes
  received_at TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  
  -- Notes
  notes TEXT,
  internal_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT chk_weight_positive CHECK (weight IS NULL OR weight > 0),
  CONSTRAINT chk_dimensions_positive CHECK (
    (length IS NULL OR length > 0) AND
    (width IS NULL OR width > 0) AND
    (height IS NULL OR height > 0)
  ),
  CONSTRAINT chk_value_positive CHECK (declared_value IS NULL OR declared_value >= 0)
);

-- Index
CREATE INDEX idx_parcels_user_id ON parcels(user_id);
CREATE INDEX idx_parcels_tracking ON parcels(tracking_number);
CREATE INDEX idx_parcels_status ON parcels(status);
CREATE INDEX idx_parcels_address ON parcels(custom_address_id);
CREATE INDEX idx_parcels_category ON parcels(category_id);
CREATE INDEX idx_parcels_warehouse ON parcels(warehouse);
CREATE INDEX idx_parcels_received_at ON parcels(received_at);
CREATE INDEX idx_parcels_shipped_at ON parcels(shipped_at);

-- Commentaires
COMMENT ON TABLE parcels IS 'Colis des clients';
COMMENT ON COLUMN parcels.tracking_number IS 'Numéro de suivi interne unique';
COMMENT ON COLUMN parcels.carrier_tracking_number IS 'Numéro de suivi du transporteur externe';

-- ============================================================================
-- TABLE: parcel_status_history
-- Historique des changements de statut des colis
-- ============================================================================
CREATE TABLE parcel_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  
  -- Statut
  old_status parcel_status,
  new_status parcel_status NOT NULL,
  
  -- Localisation
  location VARCHAR(255),
  
  -- Description
  description TEXT,
  
  -- Qui a fait le changement
  changed_by UUID REFERENCES users(id),
  source VARCHAR(50), -- 'INTERNAL', 'CARRIER', 'MANUAL', 'SYSTEM'
  
  -- Métadonnées
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_status_history_parcel ON parcel_status_history(parcel_id);
CREATE INDEX idx_status_history_created ON parcel_status_history(created_at);
CREATE INDEX idx_status_history_status ON parcel_status_history(new_status);

-- Commentaires
COMMENT ON TABLE parcel_status_history IS 'Historique complet des changements de statut';

-- ============================================================================
-- TABLE: parcel_photos
-- Photos des colis
-- ============================================================================
CREATE TABLE parcel_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  
  url TEXT NOT NULL,
  type VARCHAR(50), -- 'PACKAGE', 'LABEL', 'DAMAGE', 'OTHER'
  caption TEXT,
  
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_parcel_photos_parcel ON parcel_photos(parcel_id);
CREATE INDEX idx_parcel_photos_type ON parcel_photos(type);

-- ============================================================================
-- TABLE: notifications
-- Notifications envoyées aux utilisateurs
-- ============================================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Type et canal
  type notification_type NOT NULL,
  channel VARCHAR(50),
  
  -- Contenu
  subject VARCHAR(255),
  message TEXT NOT NULL,
  
  -- Données supplémentaires
  data JSONB,
  
  -- Statut
  status notification_status DEFAULT 'PENDING',
  
  -- Dates
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created ON notifications(created_at);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- Commentaires
COMMENT ON TABLE notifications IS 'Notifications envoyées aux utilisateurs';

-- ============================================================================
-- TABLE: notification_preferences
-- Préférences de notification des utilisateurs
-- ============================================================================
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Canaux activés
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT TRUE,
  
  -- Événements
  events JSONB DEFAULT '{
    "parcel_received": true,
    "status_update": true,
    "parcel_ready": true,
    "parcel_shipped": true,
    "parcel_delivered": true,
    "payment_received": true,
    "invoice_generated": false
  }'::jsonb,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE UNIQUE INDEX idx_notification_prefs_user ON notification_preferences(user_id);

-- ============================================================================
-- TABLE: audit_logs
-- Logs d'audit de toutes les actions importantes
-- ============================================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Qui
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  user_role user_role,
  
  -- Quoi
  action audit_action NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id UUID,
  
  -- Détails
  description TEXT,
  changes JSONB,
  
  -- Où
  ip_address INET,
  user_agent TEXT,
  
  -- Quand
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);

-- Commentaires
COMMENT ON TABLE audit_logs IS 'Logs d''audit de toutes les actions importantes du système';

-- ============================================================================
-- TABLE: invoices
-- Factures des clients
-- ============================================================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Montants
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0,
  fees DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Statut
  status VARCHAR(50) DEFAULT 'DRAFT',
  
  -- Dates
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT chk_amounts_positive CHECK (
    subtotal >= 0 AND tax >= 0 AND fees >= 0 AND total >= 0
  ),
  CONSTRAINT chk_invoice_status CHECK (
    status IN ('DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED')
  )
);

-- Index
CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_created ON invoices(created_at);

-- ============================================================================
-- TABLE: invoice_items
-- Lignes de facture
-- ============================================================================
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id),
  
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_prices_positive CHECK (unit_price >= 0 AND total >= 0)
);

-- Index
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_parcel ON invoice_items(parcel_id);

-- ============================================================================
-- TABLE: payments
-- Paiements des clients
-- ============================================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Montant
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Méthode
  method VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  
  -- Passerelle de paiement
  transaction_id VARCHAR(255),
  gateway VARCHAR(50),
  
  -- Métadonnées
  metadata JSONB,
  
  -- Dates
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT chk_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_payment_method CHECK (
    method IN ('CARD', 'BANK_TRANSFER', 'CASH', 'MOBILE_MONEY', 'PAYPAL')
  ),
  CONSTRAINT chk_payment_status CHECK (
    status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')
  )
);

-- Index
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created ON payments(created_at);

-- ============================================================================
-- TABLE: shipping_rates
-- Tarifs de shipping
-- ============================================================================
CREATE TABLE shipping_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Poids
  weight_min DECIMAL(10, 2) NOT NULL,
  weight_max DECIMAL(10, 2) NOT NULL,
  
  -- Tarifs
  base_rate DECIMAL(10, 2) NOT NULL,
  per_pound_rate DECIMAL(10, 2) NOT NULL,
  
  -- Zone et service
  zone VARCHAR(50) DEFAULT 'HAITI',
  service_type VARCHAR(50) DEFAULT 'STANDARD',
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT chk_weight_range CHECK (weight_min < weight_max),
  CONSTRAINT chk_rates_positive CHECK (base_rate >= 0 AND per_pound_rate >= 0),
  CONSTRAINT chk_service_type CHECK (
    service_type IN ('STANDARD', 'EXPRESS', 'ECONOMY')
  )
);

-- Index
CREATE INDEX idx_shipping_rates_active ON shipping_rates(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_shipping_rates_zone ON shipping_rates(zone);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Fonction: Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur toutes les tables avec updated_at
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_custom_addresses_updated_at
  BEFORE UPDATE ON custom_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_parcels_updated_at
  BEFORE UPDATE ON parcels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_parcel_categories_updated_at
  BEFORE UPDATE ON parcel_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_notification_prefs_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_shipping_rates_updated_at
  BEFORE UPDATE ON shipping_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction: Empêcher modification des adresses
CREATE OR REPLACE FUNCTION prevent_address_code_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.address_code IS DISTINCT FROM NEW.address_code THEN
    RAISE EXCEPTION 'Address code is immutable and cannot be changed';
  END IF;
  IF OLD.hub IS DISTINCT FROM NEW.hub THEN
    RAISE EXCEPTION 'HUB is immutable and cannot be changed';
  END IF;
  IF OLD.client_id IS DISTINCT FROM NEW.client_id THEN
    RAISE EXCEPTION 'CLIENT_ID is immutable and cannot be changed';
  END IF;
  IF OLD.unit IS DISTINCT FROM NEW.unit THEN
    RAISE EXCEPTION 'UNIT is immutable and cannot be changed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_address_code_update
  BEFORE UPDATE ON custom_addresses
  FOR EACH ROW EXECUTE FUNCTION prevent_address_code_update();

-- Fonction: Historiser les changements de statut
CREATE OR REPLACE FUNCTION track_parcel_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO parcel_status_history (
      parcel_id, old_status, new_status, source
    ) VALUES (
      NEW.id, OLD.status, NEW.status, 'SYSTEM'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_track_parcel_status_change
  AFTER UPDATE ON parcels
  FOR EACH ROW EXECUTE FUNCTION track_parcel_status_change();

-- Fonction: Garantir une seule adresse primaire
CREATE OR REPLACE FUNCTION ensure_single_primary_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = TRUE THEN
    UPDATE custom_addresses
    SET is_primary = FALSE
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_primary = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ensure_single_primary_address
  BEFORE INSERT OR UPDATE ON custom_addresses
  FOR EACH ROW EXECUTE FUNCTION ensure_single_primary_address();

-- ============================================================================
-- VUES UTILES
-- ============================================================================

-- Vue: Statistiques des colis par client
CREATE OR REPLACE VIEW v_customer_parcel_stats AS
SELECT 
  u.id as user_id,
  u.email,
  u.first_name,
  u.last_name,
  COUNT(p.id) as total_parcels,
  COUNT(p.id) FILTER (WHERE p.status = 'DELIVERED') as delivered_parcels,
  COUNT(p.id) FILTER (WHERE p.status = 'IN_TRANSIT') as in_transit_parcels,
  COUNT(p.id) FILTER (WHERE p.status = 'PENDING') as pending_parcels,
  SUM(p.weight) as total_weight,
  MAX(p.created_at) as last_parcel_date
FROM users u
LEFT JOIN parcels p ON u.id = p.user_id
WHERE u.role = 'CLIENT'
GROUP BY u.id, u.email, u.first_name, u.last_name;

-- Vue: Statistiques par HUB
CREATE OR REPLACE VIEW v_hub_statistics AS
SELECT 
  hub,
  COUNT(*) as total_addresses,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(client_id) as highest_client_id,
  COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_addresses
FROM custom_addresses
GROUP BY hub
ORDER BY hub;

-- Vue: Colis en transit
CREATE OR REPLACE VIEW v_parcels_in_transit AS
SELECT 
  p.id,
  p.tracking_number,
  u.email as customer_email,
  u.first_name,
  u.last_name,
  ca.address_code,
  p.status,
  p.current_location,
  p.shipped_at,
  EXTRACT(DAY FROM NOW() - p.shipped_at) as days_in_transit
FROM parcels p
JOIN users u ON p.user_id = u.id
JOIN custom_addresses ca ON p.custom_address_id = ca.id
WHERE p.status IN ('SHIPPED', 'IN_TRANSIT', 'CUSTOMS')
ORDER BY p.shipped_at DESC;

-- Vue: Factures impayées
CREATE OR REPLACE VIEW v_unpaid_invoices AS
SELECT 
  i.id,
  i.invoice_number,
  u.email as customer_email,
  u.first_name,
  u.last_name,
  i.total,
  i.currency,
  i.due_date,
  CASE 
    WHEN i.due_date < NOW() THEN 'OVERDUE'
    ELSE 'PENDING'
  END as payment_status,
  EXTRACT(DAY FROM NOW() - i.due_date) as days_overdue
FROM invoices i
JOIN users u ON i.user_id = u.id
WHERE i.status IN ('PENDING', 'OVERDUE')
ORDER BY i.due_date ASC;

-- ============================================================================
-- FIN DU SCHÉMA
-- ============================================================================
