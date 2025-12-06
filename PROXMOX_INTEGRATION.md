# Intégration avec Proxmox

Ce document explique comment configurer Proxmox pour envoyer des notifications à PBS Notify.

## Méthode 1 : Script de post-backup

### 1. Créer un script de notification

Sur votre serveur Proxmox, créez `/usr/local/bin/pbs-notify.sh` :

```bash
#!/bin/bash

# Configuration
PBS_NOTIFY_URL="http://votre-serveur:3000/webhook"

# Récupérer les informations du backup
VMID="$1"
STATUS="$2"  # success ou error
MESSAGE="$3"

# Par défaut, construire un message
if [ -z "$MESSAGE" ]; then
    if [ "$STATUS" == "success" ]; then
        MESSAGE="Backup de VM/CT $VMID réussi"
    else
        MESSAGE="Erreur lors du backup de VM/CT $VMID"
    fi
fi

# Envoyer la notification
curl -X POST "$PBS_NOTIFY_URL" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"$MESSAGE\",\"status\":\"$STATUS\"}" \
  --max-time 10 \
  --silent

exit 0
```

Rendez-le exécutable :

```bash
chmod +x /usr/local/bin/pbs-notify.sh
```

### 2. Appeler le script après vos backups

Dans vos scripts de backup, ajoutez :

```bash
# Si le backup réussit
if vzdump ...; then
    /usr/local/bin/pbs-notify.sh "$VMID" "success" "Backup de $VMID terminé ($(date))"
else
    /usr/local/bin/pbs-notify.sh "$VMID" "error" "Échec du backup de $VMID"
fi
```

## Méthode 2 : Hook vzdump

### 1. Créer un hook vzdump

Créez `/etc/vzdump/pbs-notify-hook.pl` :

```perl
#!/usr/bin/perl

use strict;
use warnings;
use JSON;
use LWP::UserAgent;

my $PBS_NOTIFY_URL = 'http://votre-serveur:3000/webhook';

# Phases: job-start, job-end, job-abort
# backup-start, backup-end, backup-abort, log-end, pre-stop, pre-restart, post-restart

my $phase = shift;
my $mode = shift;  # stop/suspend/snapshot
my $vmid = shift;
my $vmtype = $ENV{VMTYPE} // 'unknown';

my $ua = LWP::UserAgent->new(timeout => 10);

if ($phase eq 'backup-end') {
    my $message = "Backup de $vmtype $vmid terminé avec succès";
    send_notification('success', $message);
}
elsif ($phase eq 'backup-abort') {
    my $message = "Backup de $vmtype $vmid a échoué";
    send_notification('error', $message);
}
elsif ($phase eq 'job-end') {
    my $message = "Tâche de backup terminée";
    send_notification('success', $message);
}

sub send_notification {
    my ($status, $message) = @_;

    my $data = encode_json({
        message => $message,
        status => $status
    });

    my $response = $ua->post(
        $PBS_NOTIFY_URL,
        'Content-Type' => 'application/json',
        Content => $data
    );

    if (!$response->is_success) {
        warn "Failed to send notification: " . $response->status_line;
    }
}

exit(0);
```

Rendez-le exécutable :

```bash
chmod +x /etc/vzdump/pbs-notify-hook.pl
```

### 2. Utiliser le hook

Dans votre configuration de backup (`/etc/vzdump.conf`) ou en ligne de commande :

```bash
vzdump 100 --script /etc/vzdump/pbs-notify-hook.pl
```

Ou dans `/etc/vzdump.conf` :

```
script: /etc/vzdump/pbs-notify-hook.pl
```

## Méthode 3 : Proxmox Backup Server Notifications

### 1. Configuration via l'API PBS

Si vous utilisez Proxmox Backup Server, vous pouvez configurer un webhook directement :

```bash
# Créer un endpoint de notification
pvesh create /config/notify/endpoints/webhook/pbs-notify \
  --url "http://votre-serveur:3000/webhook" \
  --method POST \
  --header "Content-Type: application/json" \
  --body-template '{"message":"{{message}}","status":"{{#if error}}error{{else}}success{{/if}}"}'
```

### 2. Configurer les notifications

```bash
# Attacher le webhook aux événements de backup
pvesh create /config/notify/targets \
  --name pbs-notify \
  --endpoint pbs-notify \
  --filter severity:info
```

## Méthode 4 : Cron avec surveillance

### 1. Script de surveillance des logs

Créez `/usr/local/bin/pbs-watch-logs.sh` :

```bash
#!/bin/bash

PBS_NOTIFY_URL="http://votre-serveur:3000/webhook"
LOG_FILE="/var/log/pve/tasks/active"
LAST_CHECK_FILE="/var/tmp/pbs-notify-last-check"

# Trouver les nouveaux backups terminés depuis le dernier check
if [ -f "$LAST_CHECK_FILE" ]; then
    SINCE=$(cat "$LAST_CHECK_FILE")
else
    SINCE=$(date -d "1 hour ago" +%s)
fi

# Chercher les tâches de backup terminées
find /var/log/pve/tasks/ -name "*.log" -newer "$LAST_CHECK_FILE" 2>/dev/null | while read logfile; do
    if grep -q "backup finished" "$logfile"; then
        VMID=$(basename "$logfile" | cut -d':' -f2)
        MESSAGE="Backup de VM/CT $VMID terminé"

        if grep -q "ERROR:" "$logfile"; then
            STATUS="error"
            MESSAGE="Erreur lors du backup de VM/CT $VMID"
        else
            STATUS="success"
        fi

        curl -X POST "$PBS_NOTIFY_URL" \
          -H "Content-Type: application/json" \
          -d "{\"message\":\"$MESSAGE\",\"status\":\"$STATUS\"}" \
          --silent
    fi
done

# Mettre à jour le timestamp
date +%s > "$LAST_CHECK_FILE"
touch "$LAST_CHECK_FILE"
```

### 2. Ajouter au cron

```bash
# Exécuter toutes les 5 minutes
echo "*/5 * * * * /usr/local/bin/pbs-watch-logs.sh" | crontab -
```

## Test de l'intégration

Une fois configuré, testez manuellement :

```bash
/usr/local/bin/pbs-notify.sh 100 success "Test de notification"
```

Ou utilisez le script de test fourni :

```bash
./test-webhook.sh http://votre-serveur:3000
```

## Sécurité

### Ajouter une authentification

Modifiez votre script pour inclure un token :

```bash
curl -X POST "$PBS_NOTIFY_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN_SECRET" \
  -d "{\"message\":\"$MESSAGE\",\"status\":\"$STATUS\"}"
```

Et modifiez le backend pour vérifier ce token.

### Utiliser HTTPS

Configurez un reverse proxy (nginx/Caddy) avec SSL pour sécuriser les communications.

## Dépannage

### Tester la connectivité

```bash
curl -v http://votre-serveur:3000/health
```

### Vérifier les logs Proxmox

```bash
tail -f /var/log/pve/tasks/*.log
```

### Logs PBS Notify

Consultez la sortie du serveur backend pour voir les webhooks reçus.
