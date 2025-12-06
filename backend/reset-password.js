#!/usr/bin/env node

require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

// Configurer l'interface readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fonction pour poser une question
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   PBS Notify - Reset Password          ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Connexion à la base de données
  const dbDir = process.env.DB_PATH || __dirname;
  const dbPath = path.join(dbDir, 'notifications.db');
  console.log(`📂 Database: ${dbPath}\n`);

  const db = new Database(dbPath);

  try {
    // Récupérer tous les utilisateurs
    const users = db.prepare('SELECT id, username, created_at FROM users').all();

    if (users.length === 0) {
      console.log('❌ Aucun utilisateur trouvé dans la base de données.');
      console.log('💡 Utilisez la page d\'inscription pour créer un compte.\n');
      rl.close();
      db.close();
      return;
    }

    console.log('👤 Utilisateur actuel:');
    users.forEach(user => {
      console.log(`   - ${user.username} (créé le ${new Date(user.created_at).toLocaleString('fr-FR')})`);
    });
    console.log('');

    // Demander l'action
    console.log('Actions disponibles:');
    console.log('  1. Réinitialiser le mot de passe');
    console.log('  2. Supprimer le compte (permet de recréer un nouveau compte)');
    console.log('');

    const action = await question('Choisissez une action (1 ou 2): ');

    if (action === '1') {
      // Réinitialiser le mot de passe
      const newPassword = await question('Nouveau mot de passe (min. 6 caractères): ');

      if (newPassword.length < 6) {
        console.log('\n❌ Le mot de passe doit contenir au moins 6 caractères.\n');
        rl.close();
        db.close();
        return;
      }

      const confirmPassword = await question('Confirmez le mot de passe: ');

      if (newPassword !== confirmPassword) {
        console.log('\n❌ Les mots de passe ne correspondent pas.\n');
        rl.close();
        db.close();
        return;
      }

      // Hasher le nouveau mot de passe
      console.log('\n🔐 Hashage du mot de passe...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      // Mettre à jour dans la base de données
      const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
      stmt.run(passwordHash, users[0].id);

      console.log('✅ Mot de passe réinitialisé avec succès!\n');
      console.log(`👤 Utilisateur: ${users[0].username}`);
      console.log(`🔑 Nouveau mot de passe: ${newPassword}\n`);

    } else if (action === '2') {
      // Supprimer le compte
      const confirm = await question(`⚠️  Êtes-vous sûr de vouloir supprimer le compte "${users[0].username}" ? (oui/non): `);

      if (confirm.toLowerCase() === 'oui' || confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'o') {
        const stmt = db.prepare('DELETE FROM users WHERE id = ?');
        stmt.run(users[0].id);

        console.log('\n✅ Compte supprimé avec succès!');
        console.log('💡 Vous pouvez maintenant créer un nouveau compte via la page d\'inscription.\n');
      } else {
        console.log('\n❌ Suppression annulée.\n');
      }

    } else {
      console.log('\n❌ Action invalide.\n');
    }

  } catch (error) {
    console.error('\n❌ Erreur:', error.message, '\n');
  } finally {
    rl.close();
    db.close();
  }
}

main();
