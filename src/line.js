// LINE Login (customers sign in) and the Messaging API (order updates from the OKA Official Account).
// Docs: https://developers.line.biz/en/docs/line-login/  https://developers.line.biz/en/reference/messaging-api/

export function createLine({ loginChannelId, loginChannelSecret, messagingToken, fetchImpl = globalThis.fetch } = {}) {
  const form = (o) => ({ method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(o) });
  return {
    loginEnabled: !!(loginChannelId && loginChannelSecret),
    messagingEnabled: !!messagingToken,

    authorizeUrl(redirectUri, state) {
      const u = new URL('https://access.line.me/oauth2/v2.1/authorize');
      // bot_prompt=aggressive asks the customer to add the OKA account as a friend, which LINE requires
      // before the shop can send them messages. This needs the Login channel linked to the Official Account.
      u.search = new URLSearchParams({ response_type: 'code', client_id: loginChannelId, redirect_uri: redirectUri, state, scope: 'profile openid', bot_prompt: 'aggressive' });
      return u.toString();
    },

    /** Code from the login redirect → the customer's LINE user id, display name, picture and friend status. */
    async exchange(code, redirectUri) {
      const tok = await fetchImpl('https://api.line.me/oauth2/v2.1/token', form({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: loginChannelId, client_secret: loginChannelSecret }));
      if (!tok.ok) throw new Error(`LINE token ${tok.status}: ${(await tok.text()).slice(0, 200)}`);
      const { id_token, access_token } = await tok.json();
      const ver = await fetchImpl('https://api.line.me/oauth2/v2.1/verify', form({ id_token, client_id: loginChannelId }));
      if (!ver.ok) throw new Error(`LINE verify ${ver.status}: ${(await ver.text()).slice(0, 200)}`);
      const p = await ver.json();
      let friend = null;
      try {
        const f = await fetchImpl('https://api.line.me/friendship/v1/status', { headers: { Authorization: `Bearer ${access_token}` } });
        if (f.ok) friend = !!(await f.json()).friendFlag;
      } catch { /* friend status is optional */ }
      return { userId: p.sub, name: p.name || '', picture: p.picture || '', friend };
    },

    /** One text message to one person. Never throws; returns { status: 'sent' | 'failed' | 'skipped', error? }. */
    async push(to, text) {
      if (!messagingToken) return { status: 'skipped', error: 'LINE messaging is not set up' };
      try {
        const res = await fetchImpl('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${messagingToken}` },
          body: JSON.stringify({ to, messages: [{ type: 'text', text: text.slice(0, 4900) }] }),
        });
        return res.ok ? { status: 'sent' } : { status: 'failed', error: `${res.status} ${(await res.text()).slice(0, 200)}` };
      } catch (e) {
        return { status: 'failed', error: String(e?.message || e).slice(0, 200) };
      }
    },
  };
}
