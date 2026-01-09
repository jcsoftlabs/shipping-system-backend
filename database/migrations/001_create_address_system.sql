-- ============================================================================
-- Migration: Système de Génération d'Adresses Personnalisées
-- Format: HT-[HUB]-[CLIENT_ID]/[UNIT]
-- Exemple: HT-MIA-01044/A
-- ============================================================================

-- ============================================================================
-- Table: address_counters
-- Gère les compteurs séquentiels par HUB pour générer les CLIENT_ID
-- ============================================================================
CREATE TABLE IF NOT EXISTS address_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub VARCHAR(3) NOT NULL UNIQUE,
  current_sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Contraintes de validation
  CONSTRAINT chk_hub_format CHECK (hub ~ '^[A-Z]{3}$'),
  CONSTRAINT chk_sequence_range CHECK (
    current_sequence >= 0 AND current_sequence <= 99999
  )
);

-- Index pour performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_address_counters_hub 
  ON address_counters(hub);

-- Commentaires
COMMENT ON TABLE address_counters IS 
  'Compteurs séquentiels pour générer les CLIENT_ID par HUB';
COMMENT ON COLUMN address_counters.hub IS 
  'Code du HUB (3 lettres majuscules, ex: MIA, FLL, NYC)';
COMMENT ON COLUMN address_counters.current_sequence IS 
  'Numéro séquentiel actuel (0-99999)';

-- ============================================================================
-- Table: custom_addresses
-- Stocke toutes les adresses personnalisées générées
-- ============================================================================
CREATE TABLE IF NOT EXISTS custom_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
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
  status VARCHAR(20) DEFAULT 'ACTIVE',
  is_primary BOOLEAN DEFAULT FALSE,
  generated_at TIMESTAMP DEFAULT NOW(),
  activated_at TIMESTAMP,
  deactivated_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Contraintes de validation
  CONSTRAINT chk_address_format CHECK (
    address_code ~ '^HT-[A-Z]{3}-[0-9]{5}/[A-Z]$'
  ),
  CONSTRAINT chk_hub_format CHECK (hub ~ '^[A-Z]{3}$'),
  CONSTRAINT chk_client_id_format CHECK (client_id ~ '^[0-9]{5}$'),
  CONSTRAINT chk_unit_format CHECK (unit ~ '^[A-Z]$'),
  CONSTRAINT chk_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  CONSTRAINT chk_us_state CHECK (us_state ~ '^[A-Z]{2}$'),
  
  -- Contraintes d'unicité
  CONSTRAINT uq_address_code UNIQUE (address_code),
  CONSTRAINT uq_user_hub_client_unit UNIQUE (user_id, hub, client_id, unit)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_custom_addresses_user_id 
  ON custom_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_addresses_code 
  ON custom_addresses(address_code);
CREATE INDEX IF NOT EXISTS idx_custom_addresses_hub 
  ON custom_addresses(hub);
CREATE INDEX IF NOT EXISTS idx_custom_addresses_status 
  ON custom_addresses(status);
CREATE INDEX IF NOT EXISTS idx_custom_addresses_client_id 
  ON custom_addresses(hub, client_id);
CREATE INDEX IF NOT EXISTS idx_custom_addresses_primary 
  ON custom_addresses(user_id, is_primary) 
  WHERE is_primary = TRUE;

-- Commentaires
COMMENT ON TABLE custom_addresses IS 
  'Adresses personnalisées générées pour les clients';
COMMENT ON COLUMN custom_addresses.address_code IS 
  'Code d''adresse complet (ex: HT-MIA-01044/A) - IMMUABLE';
COMMENT ON COLUMN custom_addresses.client_id IS 
  'Identifiant client unique sur 5 chiffres (ex: 01044)';
COMMENT ON COLUMN custom_addresses.unit IS 
  'Suffixe pour adresses multiples (A-Z)';
COMMENT ON COLUMN custom_addresses.is_primary IS 
  'Indique si c''est l''adresse principale du client';

-- ============================================================================
-- Table: address_generation_logs
-- Audit trail de toutes les tentatives de génération d'adresses
-- ============================================================================
CREATE TABLE IF NOT EXISTS address_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  address_code VARCHAR(20),
  hub VARCHAR(3) NOT NULL,
  client_id VARCHAR(5),
  unit VARCHAR(1),
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT chk_log_status CHECK (status IN ('SUCCESS', 'FAILED'))
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_address_logs_user 
  ON address_generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_address_logs_created 
  ON address_generation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_address_logs_status 
  ON address_generation_logs(status);

-- Commentaires
COMMENT ON TABLE address_generation_logs IS 
  'Logs d''audit de toutes les générations d''adresses';

-- ============================================================================
-- Fonction: prevent_address_code_update
-- Empêche la modification des champs immuables (address_code, hub, etc.)
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_address_code_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si le code d'adresse a été modifié
  IF OLD.address_code IS DISTINCT FROM NEW.address_code THEN
    RAISE EXCEPTION 'Address code is immutable and cannot be changed';
  END IF;
  
  -- Vérifier si le HUB a été modifié
  IF OLD.hub IS DISTINCT FROM NEW.hub THEN
    RAISE EXCEPTION 'HUB is immutable and cannot be changed';
  END IF;
  
  -- Vérifier si le CLIENT_ID a été modifié
  IF OLD.client_id IS DISTINCT FROM NEW.client_id THEN
    RAISE EXCEPTION 'CLIENT_ID is immutable and cannot be changed';
  END IF;
  
  -- Vérifier si le UNIT a été modifié
  IF OLD.unit IS DISTINCT FROM NEW.unit THEN
    RAISE EXCEPTION 'UNIT is immutable and cannot be changed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Commentaire
COMMENT ON FUNCTION prevent_address_code_update() IS 
  'Empêche la modification des champs immuables de l''adresse';

-- ============================================================================
-- Trigger: trg_prevent_address_code_update
-- Applique la fonction de protection sur les UPDATE
-- ============================================================================
DROP TRIGGER IF EXISTS trg_prevent_address_code_update ON custom_addresses;

CREATE TRIGGER trg_prevent_address_code_update
  BEFORE UPDATE ON custom_addresses
  FOR EACH ROW
  EXECUTE FUNCTION prevent_address_code_update();

-- ============================================================================
-- Fonction: update_updated_at_column
-- Met à jour automatiquement le champ updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers: Mise à jour automatique de updated_at
-- ============================================================================
DROP TRIGGER IF EXISTS trg_address_counters_updated_at ON address_counters;
CREATE TRIGGER trg_address_counters_updated_at
  BEFORE UPDATE ON address_counters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_custom_addresses_updated_at ON custom_addresses;
CREATE TRIGGER trg_custom_addresses_updated_at
  BEFORE UPDATE ON custom_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Fonction: ensure_single_primary_address
-- Garantit qu'un utilisateur n'a qu'une seule adresse primaire
-- ============================================================================
CREATE OR REPLACE FUNCTION ensure_single_primary_address()
RETURNS TRIGGER AS $$
BEGIN
  -- Si on définit une adresse comme primaire
  IF NEW.is_primary = TRUE THEN
    -- Désactiver toutes les autres adresses primaires de cet utilisateur
    UPDATE custom_addresses
    SET is_primary = FALSE
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_primary = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Trigger: trg_ensure_single_primary_address
-- ============================================================================
DROP TRIGGER IF EXISTS trg_ensure_single_primary_address ON custom_addresses;

CREATE TRIGGER trg_ensure_single_primary_address
  BEFORE INSERT OR UPDATE ON custom_addresses
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_primary_address();

-- ============================================================================
-- Données initiales: Initialiser les compteurs pour les HUBs principaux
-- ============================================================================
INSERT INTO address_counters (hub, current_sequence) 
VALUES 
  ('MIA', 0),  -- Miami
  ('FLL', 0),  -- Fort Lauderdale
  ('NYC', 0),  -- New York
  ('ATL', 0),  -- Atlanta
  ('LAX', 0),  -- Los Angeles
  ('ORD', 0)   -- Chicago
ON CONFLICT (hub) DO NOTHING;

-- ============================================================================
-- Vues utiles
-- ============================================================================

-- Vue: Statistiques par HUB
CREATE OR REPLACE VIEW v_hub_statistics AS
SELECT 
  hub,
  COUNT(*) as total_addresses,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(client_id) as highest_client_id,
  COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_addresses,
  COUNT(*) FILTER (WHERE status = 'INACTIVE') as inactive_addresses,
  COUNT(*) FILTER (WHERE is_primary = true) as primary_addresses
FROM custom_addresses
GROUP BY hub
ORDER BY hub;

-- Vue: Capacité restante par HUB
CREATE OR REPLACE VIEW v_hub_capacity AS
SELECT 
  hub,
  current_sequence,
  (99999 - current_sequence) as remaining_capacity,
  ROUND((current_sequence::DECIMAL / 99999) * 100, 2) as usage_percentage
FROM address_counters
ORDER BY usage_percentage DESC;

-- Vue: Utilisateurs avec plusieurs adresses
CREATE OR REPLACE VIEW v_users_multiple_addresses AS
SELECT 
  user_id,
  COUNT(*) as address_count,
  STRING_AGG(address_code, ', ' ORDER BY unit) as addresses,
  MAX(created_at) as last_address_created
FROM custom_addresses
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY address_count DESC;

-- ============================================================================
-- Commentaires sur les vues
-- ============================================================================
COMMENT ON VIEW v_hub_statistics IS 
  'Statistiques détaillées par HUB';
COMMENT ON VIEW v_hub_capacity IS 
  'Capacité restante et utilisation par HUB';
COMMENT ON VIEW v_users_multiple_addresses IS 
  'Utilisateurs ayant plusieurs adresses';

-- ============================================================================
-- Fin de la migration
-- ============================================================================
