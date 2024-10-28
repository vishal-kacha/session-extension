document.addEventListener('DOMContentLoaded', function() {
  const saveButton = document.getElementById('saveSession');
  const sessionNameInput = document.getElementById('sessionName');
  const sessionList = document.getElementById('sessionList');

  sessionNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveButton.click();
    }
  });

  loadSessions();

  saveButton.addEventListener('click', async () => {
    const sessionName = sessionNameInput.value.trim();
    if (!sessionName) {
      alert('Please enter a session name');
      sessionNameInput.focus();
      return;
    }

    try {
      const tabs = await browser.tabs.query({ currentWindow: true });
      const session = {
        name: sessionName,
        timestamp: new Date().toISOString(),
        urls: tabs.map(tab => tab.url)
      };

      const sessions = await loadSessionsFromStorage();
      const existingSessionIndex = sessions.findIndex(s => s.name === sessionName);
      if (existingSessionIndex !== -1) {
        if (!confirm('A session with this name already exists. Replace it?')) {
          return;
        }
        sessions[existingSessionIndex] = session;
      } else {
        sessions.push(session);
      }

      await browser.storage.local.set({ sessions });
      sessionNameInput.value = '';
      alert('Session saved successfully');
      loadSessions();
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Error saving session');
    }
  });

  async function loadSessionsFromStorage() {
    const data = await browser.storage.local.get('sessions');
    return data.sessions || [];
  }

  async function loadSessions() {
    const sessions = await loadSessionsFromStorage();
    sessionList.innerHTML = '';

    if (sessions.length === 0) {
      sessionList.innerHTML = `
        <div class="empty-state">
          <p>No saved sessions yet</p>
          <p>Save your current tabs to get started</p>
        </div>
      `;
      return;
    }

    sessions.forEach((session, index) => {
      const sessionElement = document.createElement('div');
      sessionElement.className = 'session-item';

      const date = new Date(session.timestamp);
      const dateString = date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      sessionElement.innerHTML = `
        <div class="session-info">
          <strong>${escapeHtml(session.name)}</strong><br>
          <small>${dateString}</small>
        </div>
        <div class="session-actions">
          <button class="restore-btn" title="Restore session">↗</button>
          <button class="delete-btn" title="Delete session">×</button>
        </div>
      `;

      const restoreBtn = sessionElement.querySelector('.restore-btn');
      const deleteBtn = sessionElement.querySelector('.delete-btn');

      restoreBtn.addEventListener('click', () => restoreSession(index));
      deleteBtn.addEventListener('click', () => deleteSession(index));

      sessionList.appendChild(sessionElement);
    });
  }

  async function restoreSession(index) {
    try {
      const sessions = await loadSessionsFromStorage();
      const session = sessions[index];

      session.urls.forEach(async (url) => {
        await browser.tabs.create({ url });
      });

      window.close();
    } catch (error) {
      console.error('Error restoring session:', error);
      alert('Error restoring session');
    }
  }

  async function deleteSession(index) {
    try {
      const sessions = await loadSessionsFromStorage();
      const sessionName = sessions[index].name;

      if (!confirm(`Are you sure you want to delete "${sessionName}"?`)) {
        return;
      }

      sessions.splice(index, 1);
      await browser.storage.local.set({ sessions });
      alert('Session deleted');
      loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Error deleting session');
    }
  }

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
