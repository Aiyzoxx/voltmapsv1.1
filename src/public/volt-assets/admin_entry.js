// @ts-check
(function () {
  'use strict';

  const BUTTON_ID = 'volt-open-admin-panel';

  function getClient() {
    return self.supabaseClient || null;
  }

  /**
   * @param {HTMLElement | null | undefined} button
   * @param {boolean} visible
   * @param {string} [label]
   */
  function setVisible(button, visible, label) {
    if (!button) return;
    button.hidden = !visible;
    button.style.display = visible ? 'block' : 'none';
    if (label) button.textContent = label;
  }

  /** @param {HTMLElement | null} button */
  async function checkAdmin(button) {
    const client = getClient();
    if (!button || !client) return;
    setVisible(button, false);
    try {
      const { data, error } = await client.rpc('admin_get_me');
      if (error || !data?.success || !data?.is_admin) {
        setVisible(button, false);
        return;
      }
      const role = String(data.role || 'admin').toUpperCase();
      setVisible(button, true, `Panneau Admin · ${role}`);
    } catch (_) {
      setVisible(button, false);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById(BUTTON_ID);
    if (!button) return;
    setVisible(button, false);
    button.addEventListener('click', () => {
      const url = chrome.runtime.getURL('admin.html');
      chrome.tabs.create({ url });
    });
    setTimeout(() => checkAdmin(button), 350);
    setTimeout(() => checkAdmin(button), 1800);
  });
})();
