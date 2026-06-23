const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();

const GAMES = [
  { id: 1, date: "2026-06-11", time: "16h", home: "México", away: "África do Sul" },
  { id: 6, date: "2026-06-13", time: "19h", home: "Brasil", away: "Marrocos" }
  // COLE AQUI TODOS OS JOGOS DO SEU GAMES, só precisa id/date/time/home/away
];

function gameDate(g) {
  const m = String(g.time).match(/^(\d{1,2})h(30)?$/);
  const hh = String(parseInt(m?.[1] || "0")).padStart(2, "0");
  const mm = m?.[2] ? "30" : "00";
  return new Date(`${g.date}T${hh}:${mm}:00-03:00`);
}

function tokenKey(token) {
  return Buffer.from(token).toString("base64url");
}

exports.lembreteUmaHoraAntes = onSchedule(
  {
    schedule: "0 * * * *",
    timeZone: "America/Sao_Paulo"
  },
  async () => {
    const db = admin.database();
    const now = new Date();

    for (const game of GAMES) {
      const diffMin = (gameDate(game) - now) / 60000;

      // Como roda de 1h em 1h, pega jogos entre 30 e 90 min antes
      if (diffMin < 30 || diffMin > 90) continue;

      const sentKey = `game_${game.id}_1h`;
      const sentSnap = await db.ref(`sentNotifications/${sentKey}`).get();
      if (sentSnap.exists()) continue;

      const tokensSnap = await db.ref("notificationTokens").get();
      const all = tokensSnap.val() || {};

      const tokens = [];
      Object.values(all).forEach(userTokens => {
        Object.values(userTokens || {}).forEach(item => {
          if (item && item.enabled && item.token) tokens.push(item.token);
        });
      });

      if (!tokens.length) continue;

      const message = {
        tokens,
        notification: {
          title: "🔔 Falta 1 hora!",
          body: `${game.home} x ${game.away} começa em breve. Corre lá e deixa teu palpite no Palpitei.`
        },
        data: {
          url: "https://julialdoce.github.io/palpitei/",
          tag: `palpitei-game-${game.id}`,
          icon: "/palpitei/icon-192.png",
          badge: "/palpitei/icon-192.png"
        },
        webpush: {
          fcmOptions: {
            link: "https://julialdoce.github.io/palpitei/"
          }
        }
      };

      const res = await admin.messaging().sendEachForMulticast(message);

      await db.ref(`sentNotifications/${sentKey}`).set({
        gameId: game.id,
        sentAt: Date.now(),
        title: message.notification.title,
        body: message.notification.body,
        successCount: res.successCount,
        failureCount: res.failureCount
      });

      const bad = [];
      res.responses.forEach((r, i) => {
        if (!r.success) bad.push(tokens[i]);
      });

      for (const t of bad) {
        for (const [playerId, userTokens] of Object.entries(all)) {
          const key = tokenKey(t);
          if (userTokens && userTokens[key]) {
            await db.ref(`notificationTokens/${playerId}/${key}/enabled`).set(false);
          }
        }
      }
    }
  }
);
