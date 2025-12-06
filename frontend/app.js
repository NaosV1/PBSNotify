// Configuration
const API_BASE_URL = window.location.origin;

// État de l'application
let vapidPublicKey = null;
let isSubscribed = false;

// Éléments DOM
const subscribeBtn = document.getElementById('subscribe-btn');
const subscriptionStatus = document.getElementById('subscription-status');
const notificationsList = document.getElementById('notifications-list');
const refreshBtn = document.getElementById('refresh-btn');
const totalNotifications = document.getElementById('total-notifications');
const successCount = document.getElementById('success-count');
const errorCount = document.getElementById('error-count');

// === INITIALIZATION ===
async function init() {
  console.log('[App] Initializing...');

  // Vérifier le support des notifications
  if (!('serviceWorker' in navigator)) {
    updateStatus('Service Worker non supporté');
    return;
  }

  if (!('PushManager' in window)) {
    updateStatus('Notifications push non supportées');
    return;
  }

  // Enregistrer le Service Worker
  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    console.log('[App] Service Worker registered:', registration.scope);

    // Attendre que le SW soit actif
    await navigator.serviceWorker.ready;
    console.log('[App] Service Worker ready');

    // Récupérer la clé publique VAPID
    await fetchVapidPublicKey();

    // Vérifier l'état de l'abonnement
    await checkSubscriptionStatus();

    // Charger les notifications
    await loadNotifications();

    // Activer le bouton
    subscribeBtn.disabled = false;

  } catch (error) {
    console.error('[App] Initialization error:', error);
    updateStatus('Erreur lors de l\'initialisation');
  }
}

// === VAPID ===
async function fetchVapidPublicKey() {
  try {
    const response = await fetch(`${API_BASE_URL}/vapid-public-key`);
    const data = await response.json();
    vapidPublicKey = data.publicKey;
    console.log('[App] VAPID public key fetched');
  } catch (error) {
    console.error('[App] Error fetching VAPID key:', error);
    throw error;
  }
}

// === SUBSCRIPTION ===
async function checkSubscriptionStatus() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  isSubscribed = subscription !== null;

  if (isSubscribed) {
    updateStatus('Notifications activées');
    subscribeBtn.textContent = 'Désactiver les notifications';
    subscribeBtn.classList.add('unsubscribe');
  } else {
    updateStatus('Notifications désactivées');
    subscribeBtn.textContent = 'Activer les notifications';
    subscribeBtn.classList.remove('unsubscribe');
  }
}

async function subscribe() {
  try {
    // Demander la permission
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      updateStatus('Permission refusée');
      return;
    }

    // Obtenir le Service Worker registration
    const registration = await navigator.serviceWorker.ready;

    // Convertir la clé VAPID en Uint8Array
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    // S'abonner aux push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    console.log('[App] Push subscription:', subscription);

    // Envoyer l'abonnement au serveur
    const response = await fetch(`${API_BASE_URL}/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription)
    });

    if (response.ok) {
      isSubscribed = true;
      updateStatus('Notifications activées avec succès');
      subscribeBtn.textContent = 'Désactiver les notifications';
      subscribeBtn.classList.add('unsubscribe');
      console.log('[App] Subscription saved to server');
    } else {
      throw new Error('Failed to save subscription');
    }

  } catch (error) {
    console.error('[App] Subscription error:', error);
    updateStatus('Erreur lors de l\'activation');
  }
}

async function unsubscribe() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Se désabonner
      await subscription.unsubscribe();

      // Informer le serveur
      await fetch(`${API_BASE_URL}/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });

      isSubscribed = false;
      updateStatus('Notifications désactivées');
      subscribeBtn.textContent = 'Activer les notifications';
      subscribeBtn.classList.remove('unsubscribe');
      console.log('[App] Unsubscribed successfully');
    }

  } catch (error) {
    console.error('[App] Unsubscribe error:', error);
    updateStatus('Erreur lors de la désactivation');
  }
}

// === NOTIFICATIONS ===
async function loadNotifications() {
  try {
    notificationsList.innerHTML = '<div class="loading">Chargement des notifications...</div>';

    const response = await fetch(`${API_BASE_URL}/notifications?limit=50`);
    const data = await response.json();

    if (data.success && data.notifications.length > 0) {
      displayNotifications(data.notifications);
      updateStats(data.notifications);
    } else {
      notificationsList.innerHTML = '<div class="empty">Aucune notification</div>';
      updateStats([]);
    }

  } catch (error) {
    console.error('[App] Error loading notifications:', error);
    notificationsList.innerHTML = '<div class="empty">Erreur lors du chargement</div>';
  }
}

function displayNotifications(notifications) {
  notificationsList.innerHTML = '';

  notifications.forEach(notif => {
    const item = document.createElement('div');
    item.className = `notification ${notif.status}`;

    const date = new Date(notif.timestamp);
    const formattedDate = formatDate(date);

    item.innerHTML = `
      <div class="notification-header">
        <span class="notification-status">
          ${notif.status === 'success' ? 'Succès' : 'Erreur'}
        </span>
        <span class="notification-time">${formattedDate}</span>
      </div>
      <div class="notification-message">${escapeHtml(notif.message)}</div>
    `;

    notificationsList.appendChild(item);
  });
}

function updateStats(notifications) {
  const total = notifications.length;
  const success = notifications.filter(n => n.status === 'success').length;
  const errors = notifications.filter(n => n.status === 'error').length;

  totalNotifications.textContent = total;
  successCount.textContent = success;
  errorCount.textContent = errors;
}

// === UTILITIES ===
function updateStatus(message) {
  subscriptionStatus.textContent = message;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function formatDate(date) {
  const now = new Date();
  const diff = now - date;

  // Moins d'une minute
  if (diff < 60000) {
    return 'À l\'instant';
  }

  // Moins d'une heure
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `Il y a ${minutes} min`;
  }

  // Moins d'un jour
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `Il y a ${hours}h`;
  }

  // Plus d'un jour
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return date.toLocaleDateString('fr-FR', options);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// === EVENT LISTENERS ===
subscribeBtn.addEventListener('click', () => {
  if (isSubscribed) {
    unsubscribe();
  } else {
    subscribe();
  }
});

refreshBtn.addEventListener('click', () => {
  loadNotifications();
});

// Rafraîchir automatiquement toutes les 30 secondes
setInterval(loadNotifications, 30000);

// Démarrer l'application
init();

console.log('[App] Loaded and ready');
