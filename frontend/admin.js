// Admin Panel for PBS Notify

const API_BASE_URL = window.location.origin;
let authToken = localStorage.getItem('auth_token');

// Éléments DOM
const usernameDisplay = document.getElementById('username-display');
const logoutBtn = document.getElementById('logout-btn');
const addTokenBtn = document.getElementById('add-token-btn');
const tokensContainer = document.getElementById('tokens-container');
const tokenModal = document.getElementById('token-modal');
const tokenForm = document.getElementById('token-form');
const cancelTokenBtn = document.getElementById('cancel-token-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const tokenResult = document.getElementById('token-result');

// Vérifier l'authentification
async function checkAuth() {
  if (!authToken) {
    window.location.href = '/login.html';
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const data = await response.json();

    if (!data.valid) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('username');
      window.location.href = '/login.html';
      return false;
    }

    usernameDisplay.textContent = data.user.username;
    return true;

  } catch (error) {
    console.error('Auth error:', error);
    window.location.href = '/login.html';
    return false;
  }
}

// Déconnexion
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('username');
  window.location.href = '/login.html';
});

// Charger les tokens
async function loadTokens() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/webhook-tokens`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors du chargement des tokens');
    }

    displayTokens(data.tokens);

  } catch (error) {
    console.error('Load tokens error:', error);
    tokensContainer.innerHTML = '<div class="empty-state">Erreur lors du chargement</div>';
  }
}

// Afficher les tokens
function displayTokens(tokens) {
  if (tokens.length === 0) {
    tokensContainer.innerHTML = '<div class="empty-state">Aucun token webhook. Créez-en un pour commencer.</div>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'tokens-table';

  table.innerHTML = `
    <thead>
      <tr>
        <th>Nom</th>
        <th>Token</th>
        <th>Whitelist IP</th>
        <th>Dernière utilisation</th>
        <th>Statut</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="tokens-tbody"></tbody>
  `;

  tokensContainer.innerHTML = '';
  tokensContainer.appendChild(table);

  const tbody = document.getElementById('tokens-tbody');

  tokens.forEach(token => {
    const row = document.createElement('tr');

    const lastUsed = token.last_used
      ? new Date(token.last_used).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Jamais';

    row.innerHTML = `
      <td>${escapeHtml(token.name)}</td>
      <td>
        <span class="token-value" onclick="copyToken('${token.token}')" title="Cliquer pour copier">
          ${token.token.substring(0, 16)}...
        </span>
      </td>
      <td>${token.ip_whitelist || 'Toutes'}</td>
      <td>${lastUsed}</td>
      <td>
        <span class="badge ${token.is_active ? 'active' : 'inactive'}">
          ${token.is_active ? 'Actif' : 'Inactif'}
        </span>
      </td>
      <td>
        <div class="token-actions">
          <button class="btn-icon" onclick="toggleToken(${token.id}, ${!token.is_active})">
            ${token.is_active ? '⏸' : '▶'}
          </button>
          <button class="btn-icon delete" onclick="deleteToken(${token.id})">
            🗑
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(row);
  });
}

// Copier le token
function copyToken(token) {
  navigator.clipboard.writeText(token).then(() => {
    alert('Token copié dans le presse-papier !');
  });
}

// Créer un nouveau token
addTokenBtn.addEventListener('click', () => {
  tokenModal.classList.add('show');
  tokenForm.style.display = 'block';
  tokenResult.style.display = 'none';
  document.getElementById('token-name').value = '';
  document.getElementById('token-ip').value = '';
});

cancelTokenBtn.addEventListener('click', () => {
  tokenModal.classList.remove('show');
});

closeModalBtn.addEventListener('click', () => {
  tokenModal.classList.remove('show');
  loadTokens();
});

tokenForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('token-name').value;
  const ipWhitelist = document.getElementById('token-ip').value.trim() || null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/webhook-tokens`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, ipWhitelist })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de la création du token');
    }

    // Afficher le token créé
    tokenForm.style.display = 'none';
    tokenResult.style.display = 'block';

    document.getElementById('new-token-value').textContent = data.token.token;

    const curlExample = `curl -X POST ${API_BASE_URL}/webhook \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Token: ${data.token.token}" \\
  -d '{"message": "Test notification", "status": "success"}'`;

    document.getElementById('curl-example').textContent = curlExample;

  } catch (error) {
    alert(error.message);
  }
});

// Activer/désactiver un token
async function toggleToken(id, isActive) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/webhook-tokens/${id}/toggle`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isActive })
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la modification du token');
    }

    loadTokens();

  } catch (error) {
    alert(error.message);
  }
}

// Supprimer un token
async function deleteToken(id) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce token ?')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/webhook-tokens/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la suppression du token');
    }

    loadTokens();

  } catch (error) {
    alert(error.message);
  }
}

// Utilitaire pour échapper le HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialisation
(async () => {
  const isAuthenticated = await checkAuth();
  if (isAuthenticated) {
    loadTokens();
  }
})();
