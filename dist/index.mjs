import { Client, GatewayIntentBits } from 'discord.js';
import { Poe } from '@lazuee/poe.js';

const tokens = process.env["POE_TOKENS"]?.split("|")?.filter((x) => typeof x === "string" && x.length > 5) ?? [];
const poes = /* @__PURE__ */ new Map();
const initialize = async () => {
  for (const token of tokens) {
    const poe = new Poe({
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
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers
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
