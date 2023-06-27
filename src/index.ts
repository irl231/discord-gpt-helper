import { Client, GatewayIntentBits } from "discord.js";
import dotenv from 'dotenv';
import * as Poe from "./poe";

(async () => {
  dotenv.config();
	await Poe.initialize();

	const client = new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildMembers,
		],
		allowedMentions: {
			repliedUser: false,
		},
	});

	client
		.on("messageCreate", async (message) => {
			if (!message.guild || message.author.bot) return;
			if (!message.mentions.has(client.user!)) return;
			console.log(message.cleanContent);
		})
		.on("ready", () => console.log("ready!"));
		console.log(process.env.NODE_ENV)
	client.login(process.env.DISCORD_TOKEN!);
})();
