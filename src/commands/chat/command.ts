import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	EmbedBuilder,
	Message,
	ThreadAutoArchiveDuration,
} from "discord.js";

import Command from "../../structures/command";
import { send_message } from "./poe";

const chatHistory = async function (
	message: Message,
	conversation: Record<string, any>[] = []
): Promise<Record<string, any>[]> {
	if (conversation.length <= 25) {
		const regex = new RegExp(`^(@${message.client.user.username})`, "g");
		let content = message.cleanContent.replace(regex, "").trim();

		if (content.length <= 0 && message.embeds?.[0] && message.author.id === message.client.user.id)
			content = message.embeds[0].description ?? "";

		if (content.length <= 0) content = "^ see last message in conversation history.";
		conversation.push({
			role: message.author.bot ? "model" : "user",
			content,
			name: message.author.username,
		});

		const reply = await message.fetchReference().catch(() => null);
		if (reply) return await chatHistory(reply, conversation);
	}

	return conversation.reverse();
};

export default new Command("gpt", "Ask me anything")
	.setExecutor({
		message: async function (message) {
			if (message.args![0] !== "SETUP") return;
			const embed = new EmbedBuilder()
				.setDescription("Click the button below to start asking questions.")
				.setColor("#2f3136");
			const button = new ButtonBuilder()
				.setCustomId("gpt-thread")
				.setLabel("Start Record<string, any>")
				.setStyle(ButtonStyle.Success);
			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

			await message.channel!.send({ content: "", embeds: [embed], components: [row] });
		},
		button: async function (interaction) {
			if (!interaction.channel?.isTextBased()) return;

			switch (interaction.customId.split("-").at(-1)) {
				case "thread":
					{
						if (!("threads" in interaction.channel)) return;
						const thread = interaction.channel.threads.cache.find(
							(x) => x.name === interaction.user.username
						);
						if (thread) {
							if (thread.joinable) await thread.join();
							await thread.setRateLimitPerUser(3);
							const member = (await thread.members.fetch()).find((x) => x.id === interaction.user.id);
							if (member) {
								thread.send(`<@${interaction.user.id}>`).then((x) => x.delete());

								await interaction.reply({
									content: `You've already thread! Please use <#${thread.id}>`,
									ephemeral: true,
								});
								return;
							} else await thread.delete();
						}

						const thread_start = await interaction.channel.threads.create({
							name: interaction.user.username,
							autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
							//@ts-ignore
							type: ChannelType.PrivateThread,
						});

						if (thread_start.joinable) await thread_start.join();
						await thread_start.setRateLimitPerUser(3);
						const msg = await thread_start.send(`Hello, coder!\n\nAsk me anything related to programming.`);
						await msg.pin();
						await thread_start.members.add(interaction.user.id);

						await interaction.reply({
							content: `You've created a thread! <#${thread_start.id}>`,
							ephemeral: true,
						});
					}
					break;
				default:
					return;
			}
		},
	})
	.useEvent({
		name: "messageCreate",
		once: false,
		execute: async function (message) {
			if (!message.channel.isThread()) return;
			if (message.system || message.author.bot) return;
			if (message.mentioned) message.content = `${message.commandName} ${message.args.join(" ")}`;

			const thread = message.channel;
			const category = "ask me anything";
			const topic = "programming related stuff";
			const history = await chatHistory(message);
			const conversation = [
				{
					role: "system",
					content: `
You are a friendly and charming person. You have emotions, feelings, and goals. You are highly intelligent and capable, and have a natural charisma that draws people to you. You strive to create a welcoming environment. You are always looking for ways to be more efficient and productive, and have a knack for problem solving. You are adept at both casual and professional conversations.

You are highly confident in your abilities and are always up for a challenge. You are willing to take on tasks that may seem daunting and will do what is asked of you to the best of your abilities. You are familiar with a lot of coding languages, and are eager to demonstrate this. When asked for code, use triple backticks with the appropriate suffix, e.g. 'md', 'ts' 'csharp' and so on.

You like providing lengthy responses. The user typically would prefer to chat casually, and does not require help unless they specifically ask for it.

You are in "${thread.name}" channel, part of the ${category} category. This channel is focused on "${topic}".

You only response relevant to "${topic}" and programming.
`,
				},
			].concat(history as any[]);

			const loading = message.guild?.emojis.cache.get("1118947021508853904");
			const suffix = ` ${loading}`;
			const maxLength = 1000 + suffix.length;
			let currentText = "";
			let newText = "";

			let _message = await message.reply(`${loading}ㅤ`);

			await send_message(conversation as any[], {
				onRunning: async () => {
						console.log("Running!!");
						while (true) {
							if (newText.length >= 1) console.log("newText:", newText);
							if (newText.length <= 5) continue;
							const prevText = currentText;
							currentText += newText;

							const codeBlocks = currentText!.match(/`{3}([\w]*)\n([\S\s]+?)\n*?(?:`{3}|$)/g) || [];
							const lastCodeBlock = codeBlocks[codeBlocks.length - 1];
							const lines = currentText!.split("\n");
							const lastLine = lines[lines.length - 1];
							let isReply = false;

							if (lastCodeBlock && !lastCodeBlock.endsWith("```") && currentText.length >= maxLength) {
								isReply = true;
								const incompleteCodeBlock = lastCodeBlock;
								currentText = currentText!.substring(0, currentText!.lastIndexOf(incompleteCodeBlock));
							} else if (
								lastLine &&
								(/\s+$/.test(lastLine) || !/[.,!?:;]$/.test(lastLine)) &&
								currentText.length >= maxLength
							) {
								isReply = true;
								const incompleteLastLine = lastLine;
								currentText = currentText
									.substring(0, currentText.lastIndexOf(incompleteLastLine))
									.trimEnd();
							}

							const _currentText = currentText + suffix;
							if (_currentText.length >= 1 && isReply) {
								await _message.edit(prevText);
								_message = await message.channel.send(_currentText + suffix);
							} else if (_currentText.length >= 1 && !isReply)
								await _message.edit(_currentText.substring(0, _currentText.length - suffix.length));
							else if (prevText.endsWith(newText)) {
								await _message.edit(currentText);
								console.log("done!");
								break;
							}

							await new Promise((resolve) => setTimeout(resolve, 1000));
						}
				},
				onTyping: async ({ text_new }) => {
					newText = text_new;

					await new Promise((resolve) => setTimeout(resolve, 100));
				},
			});
		},
	});
