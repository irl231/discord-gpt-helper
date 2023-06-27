import { ApplicationCommandOptionType } from "discord.js";

import Command from "../../structures/command";

export default new Command("echo", "Repeat message")
	.setOptions([
		{
			name: "content",
			description: "The content that you want to repeat",
			type: ApplicationCommandOptionType.String,
			required: true,
		},
	])
	.setExecutor({
		message: async function (message) {
			await message.reply({ content: "*🏓 Pinging...*" });
		},
		interaction: async function (interaction) {
			const content = interaction.options.getString("content", true);
			await interaction.reply({ content });
		},
	});
