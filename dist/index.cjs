'use strict';

const discord_js = require('discord.js');
const poe_js = require('@lazuee/poe.js');

const tokens = process.env["POE_TOKENS"]?.split("|")?.filter((x) => typeof x === "string" && x.length > 5) ?? [];
const poes = /* @__PURE__ */ new Map();
const initialize = async () => {
  for (const token of tokens) {
    const poe = new poe_js.Poe({
      token,
      displayName: "Sage"
    });
    poes.set(token, poe);
    await poe.initialize().catch((error) => {
      if (error.message.includes("Invalid token")) {
        console.info(`'${token}' is invalid? skipping...`);
        poes.delete(token);
      }
    });
  }
};

(async () => {
  await initialize();
  const client = new discord_js.Client({
    intents: [
      discord_js.GatewayIntentBits.Guilds,
      discord_js.GatewayIntentBits.GuildMessages,
      discord_js.GatewayIntentBits.MessageContent,
      discord_js.GatewayIntentBits.GuildMembers
    ],
    allowedMentions: {
      repliedUser: false
    }
  });
  client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot)
      return;
    if (!message.mentions.has(client.user))
      return;
  }).on("ready", () => console.log("ready!"));
  client.login(process.env.DISCORD_TOKEN);
})();
