# Backend Complet - Plateforme Shipping USA → Haïti

Backend NestJS avec TypeORM pour gérer une plateforme de shipping internationale.

## 🚀 Démarrage Rapide

### Installation

```bash
npm install
```

### Configuration

Le fichier `.env` est déjà configuré avec la base de données de production.

### Démarrage

```bash
# Développement
npm run start:dev

# Production
npm run build
npm run start:prod
```

### Accès

- **API**: http://localhost:3000/api
- **Swagger**: http://localhost:3000/api/docs

## 📚 Documentation

Voir [backend_documentation.md](file:///Users/christopherjerome/.gemini/antigravity/brain/e5ff5649-2a4b-488e-94a2-665056e6d12e/backend_documentation.md) pour la documentation complète de l'API.

## 🔑 Endpoints Principaux

### Authentification
- `POST /api/auth/register` - Créer un compte
- `POST /api/auth/login` - Se connecter
- `POST /api/auth/refresh` - Rafraîchir le token

### Colis
- `POST /api/parcels` - Créer un colis (AGENT/ADMIN)
- `GET /api/parcels/tracking/:trackingNumber` - Rechercher par tracking
- `GET /api/parcels/my-parcels` - Mes colis (CLIENT)
- `PUT /api/parcels/:id/status` - Mettre à jour le statut (AGENT/ADMIN)

## 🗄️ Base de Données

Base de données PostgreSQL déjà déployée et configurée.

## 🔐 Sécurité

- JWT Authentication
- RBAC (Role-Based Access Control)
- Password hashing avec bcrypt
- Validation des données avec class-validator

## 📊 Workflow des Statuts

```
RECU_USA → EN_TRANSIT → INVENTAIRE_HT → DISPONIBLE → LIVRE
                ↓
              BLOQUE (peut revenir à n'importe quel statut)
```

## 🛠️ Technologies

- NestJS 10.x
- TypeORM 0.3.x
- PostgreSQL
- JWT
- Swagger
- Class-validator

## 📝 Scripts

```bash
npm run start:dev    # Démarrage en mode développement
npm run build        # Build pour production
npm run start:prod   # Démarrage en production
npm run lint         # Linter
npm run test         # Tests
```
