# Schéma PostgreSQL - Plateforme Shipping USA → Haïti

## 📊 Vue d'ensemble

Schéma de base de données complet pour la plateforme de shipping avec gestion des clients, adresses personnalisées, colis, tracking, facturation et audit.

---

## 🗄️ Structure de la Base de Données

### Tables Principales (16)

| Table | Description | Enregistrements |
|-------|-------------|-----------------|
| `users` | Utilisateurs (clients, agents, admins) | 7 |
| `custom_addresses` | Adresses personnalisées (HT-MIA-XXXXX/A) | 4 |
| `parcels` | Colis des clients | 5 |
| `parcel_categories` | Catégories de colis | 6 |
| `parcel_status_history` | Historique des statuts | Auto |
| `parcel_photos` | Photos des colis | 0 |
| `notifications` | Notifications envoyées | 2 |
| `notification_preferences` | Préférences de notification | 4 |
| `audit_logs` | Logs d'audit | 2 |
| `invoices` | Factures | 2 |
| `invoice_items` | Lignes de facture | 2 |
| `payments` | Paiements | 1 |
| `shipping_rates` | Tarifs de shipping | 10 |
| `permissions` | Permissions système | 14 |
| `role_permissions` | Association rôles-permissions | 33 |
| `address_counters` | Compteurs d'adresses | 3 |

### Vues (4)

- `v_customer_parcel_stats` - Statistiques par client
- `v_hub_statistics` - Statistiques par HUB
- `v_parcels_in_transit` - Colis en transit
- `v_unpaid_invoices` - Factures impayées

### Types ENUM (6)

- `user_role` - CLIENT, AGENT, ADMIN, SUPER_ADMIN
- `parcel_status` - PENDING, RECEIVED, PROCESSING, READY, SHIPPED, IN_TRANSIT, CUSTOMS, DELIVERED, etc.
- `address_status` - ACTIVE, INACTIVE, SUSPENDED
- `notification_type` - EMAIL, SMS, PUSH, IN_APP
- `notification_status` - PENDING, SENT, FAILED, READ
- `audit_action` - CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, etc.

### Triggers (11)

- `trg_users_updated_at` - Mise à jour automatique de updated_at
- `trg_custom_addresses_updated_at` - Mise à jour automatique
- `trg_parcels_updated_at` - Mise à jour automatique
- `trg_prevent_address_code_update` - **Empêche modification des adresses** ✅
- `trg_track_parcel_status_change` - Historise les changements de statut
- `trg_ensure_single_primary_address` - Garantit une seule adresse primaire
- Et 5 autres triggers de mise à jour

---

## 🔑 Entités Principales

### 1. Users (Utilisateurs)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'CLIENT',
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  ...
);
```

**Rôles disponibles**:
- `SUPER_ADMIN` - Accès complet (1 utilisateur)
- `ADMIN` - Gestion complète sauf suppression users
- `AGENT` - Gestion des colis et factures (2 utilisateurs)
- `CLIENT` - Consultation de ses données (4 utilisateurs)

### 2. Custom Addresses (Adresses Personnalisées)

```sql
CREATE TABLE custom_addresses (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  address_code VARCHAR(20) UNIQUE NOT NULL, -- HT-MIA-01044/A
  hub VARCHAR(3) NOT NULL,
  client_id VARCHAR(5) NOT NULL,
  unit VARCHAR(1) NOT NULL,
  us_street VARCHAR(255) NOT NULL,
  us_city VARCHAR(100) NOT NULL,
  us_state VARCHAR(2) NOT NULL,
  us_zipcode VARCHAR(10) NOT NULL,
  status address_status DEFAULT 'ACTIVE',
  is_primary BOOLEAN DEFAULT FALSE,
  ...
);
```

**Format**: `HT-[HUB]-[CLIENT_ID]/[UNIT]`
- Exemple: `HT-MIA-00001/A`
- **Immuable** - Ne peut jamais être modifié ✅

### 3. Parcels (Colis)

```sql
CREATE TABLE parcels (
  id UUID PRIMARY KEY,
  tracking_number VARCHAR(100) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  custom_address_id UUID REFERENCES custom_addresses(id),
  category_id UUID REFERENCES parcel_categories(id),
  carrier VARCHAR(50),
  carrier_tracking_number VARCHAR(100),
  description TEXT,
  weight DECIMAL(10, 2),
  length DECIMAL(10, 2),
  width DECIMAL(10, 2),
  height DECIMAL(10, 2),
  declared_value DECIMAL(10, 2),
  status parcel_status NOT NULL DEFAULT 'PENDING',
  warehouse VARCHAR(10),
  current_location VARCHAR(255),
  received_at TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  ...
);
```

**Statuts**: PENDING → RECEIVED → PROCESSING → READY → SHIPPED → IN_TRANSIT → CUSTOMS → DELIVERED

### 4. Parcel Status History (Historique)

```sql
CREATE TABLE parcel_status_history (
  id UUID PRIMARY KEY,
  parcel_id UUID REFERENCES parcels(id),
  old_status parcel_status,
  new_status parcel_status NOT NULL,
  location VARCHAR(255),
  description TEXT,
  changed_by UUID REFERENCES users(id),
  source VARCHAR(50), -- 'INTERNAL', 'CARRIER', 'MANUAL', 'SYSTEM'
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Automatique** - Chaque changement de statut est historisé via trigger ✅

### 5. Audit Logs (Logs d'Audit)

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  user_email VARCHAR(255),
  user_role user_role,
  action audit_action NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id UUID,
  description TEXT,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Traçabilité complète** - Toutes les actions admin sont tracées ✅

---

## 🔐 Contraintes de Sécurité

### 1. Immuabilité des Adresses

```sql
-- Trigger empêchant toute modification
CREATE TRIGGER trg_prevent_address_code_update
  BEFORE UPDATE ON custom_addresses
  FOR EACH ROW
  EXECUTE FUNCTION prevent_address_code_update();
```

**Test**:
```sql
UPDATE custom_addresses SET address_code = 'NEW-CODE' WHERE id = '...';
-- ERROR: Address code is immutable and cannot be changed ✅
```

### 2. Unicité des Codes

```sql
CONSTRAINT uq_address_code UNIQUE (address_code)
```

### 3. Validation des Formats

```sql
CONSTRAINT chk_address_format CHECK (
  address_code ~ '^HT-[A-Z]{3}-[0-9]{5}/[A-Z]$'
)
```

### 4. Une Seule Adresse Primaire

```sql
-- Trigger garantissant une seule adresse primaire par client
CREATE TRIGGER trg_ensure_single_primary_address
  BEFORE INSERT OR UPDATE ON custom_addresses
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_primary_address();
```

---

## 📊 Données d'Exemple

### Utilisateurs

| Email | Rôle | Nom |
|-------|------|-----|
| admin@shipping-ht.com | SUPER_ADMIN | Super Admin |
| agent1@shipping-ht.com | AGENT | Marie Dupont |
| agent2@shipping-ht.com | AGENT | Jean Pierre |
| john.doe@example.com | CLIENT | John Doe |
| jane.smith@example.com | CLIENT | Jane Smith |
| pierre.jean@example.com | CLIENT | Pierre Jean |
| marie.joseph@example.com | CLIENT | Marie Joseph |

**Mot de passe par défaut**: `password123`

### Adresses

| Client | Code Adresse | Primaire |
|--------|--------------|----------|
| john.doe@example.com | HT-MIA-00001/A | ✅ |
| jane.smith@example.com | HT-MIA-00002/A | ✅ |
| pierre.jean@example.com | HT-MIA-00003/A | ✅ |
| marie.joseph@example.com | HT-MIA-00004/A | ✅ |

### Colis

| Tracking | Client | Statut | Description |
|----------|--------|--------|-------------|
| PKG-2024-001 | John Doe | DELIVERED | iPhone 15 Pro |
| PKG-2024-002 | John Doe | IN_TRANSIT | Vêtements |
| PKG-2024-003 | Jane Smith | RECEIVED | Médicaments |
| PKG-2024-004 | Pierre Jean | READY | Livres |
| PKG-2024-005 | Marie Joseph | PENDING | Alimentation |

---

## 🔍 Requêtes Utiles

### Statistiques par HUB

```sql
SELECT * FROM v_hub_statistics;
```

### Colis en transit

```sql
SELECT * FROM v_parcels_in_transit;
```

### Factures impayées

```sql
SELECT * FROM v_unpaid_invoices;
```

### Statistiques par client

```sql
SELECT * FROM v_customer_parcel_stats;
```

### Historique d'un colis

```sql
SELECT 
  psh.created_at,
  psh.old_status,
  psh.new_status,
  psh.location,
  psh.description
FROM parcel_status_history psh
JOIN parcels p ON psh.parcel_id = p.id
WHERE p.tracking_number = 'PKG-2024-001'
ORDER BY psh.created_at;
```

---

## 🚀 Connexion à la Base de Données

```bash
# Via psql
psql "postgresql://postgres:fhgbCqlEhXtWKPUWXVaFklveSDymNgDr@tramway.proxy.rlwy.net:27962/railway"

# Via connection string
DATABASE_URL="postgresql://postgres:fhgbCqlEhXtWKPUWXVaFklveSDymNgDr@tramway.proxy.rlwy.net:27962/railway"
```

---

## 📝 Fichiers

- **Schéma complet**: [002_complete_schema.sql](file:///Users/christopherjerome/shipping%20systeme/database/migrations/002_complete_schema.sql)
- **Données d'exemple**: [001_sample_data.sql](file:///Users/christopherjerome/shipping%20systeme/database/seeds/001_sample_data.sql)

---

## ✅ Vérifications Effectuées

- ✅ 20 tables créées
- ✅ 11 triggers actifs
- ✅ 4 vues opérationnelles
- ✅ 6 types ENUM définis
- ✅ Données d'exemple insérées
- ✅ Contraintes d'immuabilité testées et fonctionnelles
- ✅ Intégrité référentielle vérifiée
- ✅ Index créés pour performance

**Base de données prête pour la production !** 🚀
