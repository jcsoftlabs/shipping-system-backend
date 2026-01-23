# 🚨 URGENT : Configuration CORS sur Railway

## Le Problème
L'admin dashboard ne peut pas se connecter au backend car le CORS n'est pas configuré sur Railway.

## ✅ Solution (2 minutes)

### Étape 1 : Aller sur Railway
1. Ouvrez https://railway.app
2. Connectez-vous à votre compte
3. Sélectionnez votre projet backend

### Étape 2 : Ajouter la Variable CORS_ORIGIN
1. Cliquez sur l'onglet **Variables**
2. Cliquez sur **+ New Variable**
3. Ajoutez :
   - **Variable Name**: `CORS_ORIGIN`
   - **Value**: `https://admin-dashboard-ekk40cfuu-jerome-christophers-projects.vercel.app`
4. Cliquez sur **Add**

### Étape 3 : Attendre le Redéploiement
Railway va automatiquement redéployer le backend (environ 1-2 minutes).

### Étape 4 : Tester
1. Visitez : https://admin-dashboard-ekk40cfuu-jerome-christophers-projects.vercel.app
2. Connectez-vous avec : `admin@shipping.com` / `Password123!`
3. ✅ Ça devrait fonctionner !

---

## 📝 Note
Si vous déployez le client portal plus tard, vous devrez mettre à jour `CORS_ORIGIN` avec :
```
CORS_ORIGIN=https://admin-dashboard-ekk40cfuu-jerome-christophers-projects.vercel.app,https://url-du-client-portal.vercel.app
```

---

## ✅ Vérification
Le backend fonctionne correctement (testé avec curl). Le seul problème est le CORS qui bloque les requêtes depuis le navigateur.
