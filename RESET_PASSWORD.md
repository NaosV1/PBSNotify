# 🔑 Réinitialisation du mot de passe

## Utilisation du script

Si vous avez oublié vos identifiants de connexion, vous pouvez utiliser le script de réinitialisation.

### Méthode 1 : Script shell (Recommandé)

```bash
./reset-password.sh
```

### Méthode 2 : Node.js direct

```bash
cd backend
node reset-password.js
```

## Options disponibles

Le script vous proposera deux options :

### Option 1 : Réinitialiser le mot de passe

Cette option vous permet de changer le mot de passe de l'utilisateur existant sans supprimer le compte.

**Étapes :**
1. Choisissez l'option `1`
2. Entrez un nouveau mot de passe (minimum 6 caractères)
3. Confirmez le nouveau mot de passe
4. Le mot de passe sera mis à jour immédiatement

**Exemple :**
```
╔════════════════════════════════════════╗
║   PBS Notify - Reset Password          ║
╚════════════════════════════════════════╝

📂 Database: /home/naos/PBSNotify/backend/notifications.db

👤 Utilisateur actuel:
   - admin (créé le 06/12/2025 17:00:36)

Actions disponibles:
  1. Réinitialiser le mot de passe
  2. Supprimer le compte (permet de recréer un nouveau compte)

Choisissez une action (1 ou 2): 1
Nouveau mot de passe (min. 6 caractères): nouveau_mdp_123
Confirmez le mot de passe: nouveau_mdp_123

🔐 Hashage du mot de passe...
✅ Mot de passe réinitialisé avec succès!

👤 Utilisateur: admin
🔑 Nouveau mot de passe: nouveau_mdp_123
```

### Option 2 : Supprimer le compte

Cette option supprime complètement le compte existant, vous permettant de créer un nouveau compte via la page d'inscription.

**Étapes :**
1. Choisissez l'option `2`
2. Confirmez la suppression en tapant `oui` ou `o`
3. Le compte sera supprimé
4. Vous pourrez créer un nouveau compte via `/login`

**Exemple :**
```
Choisissez une action (1 ou 2): 2
⚠️  Êtes-vous sûr de vouloir supprimer le compte "admin" ? (oui/non): oui

✅ Compte supprimé avec succès!
💡 Vous pouvez maintenant créer un nouveau compte via la page d'inscription.
```

## Notes importantes

- ⚠️ **Un seul compte** : Le système est configuré pour n'accepter qu'un seul compte administrateur
- 🔒 **Sécurité** : Le mot de passe doit contenir au moins 6 caractères
- 💾 **Sauvegarde** : Il est recommandé de sauvegarder `backend/notifications.db` avant toute opération
- 🚫 **Serveur arrêté** : Assurez-vous que le serveur Node.js est arrêté avant d'utiliser ce script

## En cas de problème

Si le script ne fonctionne pas :

1. **Vérifiez que vous êtes dans le bon répertoire :**
   ```bash
   ls -la | grep reset-password.sh
   ```

2. **Vérifiez les permissions :**
   ```bash
   chmod +x reset-password.sh
   chmod +x backend/reset-password.js
   ```

3. **Vérifiez que la base de données existe :**
   ```bash
   ls -la backend/notifications.db
   ```

4. **Utilisez Node.js directement :**
   ```bash
   cd backend
   node reset-password.js
   ```

## Alternative manuelle

Si vous préférez modifier directement la base de données :

```bash
cd backend
sqlite3 notifications.db "DELETE FROM users;"
```

Puis créez un nouveau compte via la page `/login`.
