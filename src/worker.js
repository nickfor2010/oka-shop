// Cloudflare Workers entry. Static files in /public are served by Workers Assets
// (e.g. /admin -> admin.html); /api/*, /auth/*, /photos/* and /healthz reach this code.
import { createApp } from './app.js';

const d1 = (DB) => ({
  all: async (sql, params = []) => (await DB.prepare(sql).bind(...params.map((v) => v ?? null)).all()).results,
  get: async (sql, params = []) => (await DB.prepare(sql).bind(...params.map((v) => v ?? null)).first()) ?? null,
  run: async (sql, params = []) => ({ lastId: (await DB.prepare(sql).bind(...params.map((v) => v ?? null)).run()).meta.last_row_id }),
});
const r2 = (bucket) => bucket && ({
  put: (key, bytes, type) => bucket.put(key, bytes, { httpMetadata: { contentType: type } }),
  get: async (key) => { const o = await bucket.get(key); return o && { body: o.body, type: o.httpMetadata?.contentType }; },
  delete: (key) => bucket.delete(key),
});

let app;
export default {
  async fetch(request, env, ctx) {
    app ||= createApp({
      db: d1(env.DB),
      photos: r2(env.PHOTOS),
      timezone: env.APP_TIMEZONE || 'Asia/Taipei',
      adminPassword: env.ADMIN_PASSWORD || 'oka-admin',
      line: { loginChannelId: env.LINE_LOGIN_CHANNEL_ID, loginChannelSecret: env.LINE_LOGIN_CHANNEL_SECRET, messagingToken: env.LINE_MESSAGING_TOKEN },
      devLogin: env.DEV_LOGIN === '1',
    });
    // LINE messages are sent after the response, so checkout and admin buttons feel instant.
    const res = await app.handle(request, { ip: request.headers.get('cf-connecting-ip') || 'unknown', defer: (p) => ctx.waitUntil(p) });
    return res || env.ASSETS.fetch(request);
  },
};
