import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	EmbedBuilder,
	Message,
	ThreadAutoArchiveDuration,
} from "discord.js";

import { clearIntervalAsync, setIntervalAsync } from "set-interval-async";
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
			const chunks: string[] = [];
			const suffix = "ㅤ<a:loading:1118947021508853904>";
			const maxLength = 1000 + suffix.length;

			let done = false;
			let currentChunk = 0;
			let currentText = "";
			let newText = "";
			let text = "";

			let _message = await message.reply(suffix);
			const editMessage = async (content: string) => await _message.edit(content);
			const sendMessage = async (content: string) => (_message = await message.channel.send(content));

			await send_message(message.content, {
				onRunning: async () => {
					const intervalId = setIntervalAsync(async () => {
						if (text.length < 5) return;

						chunks[currentChunk] ||= "";
						chunks[currentChunk] += text.substring(chunks.join().length);

						if (done || (done && currentText.length >= maxLength)) {
							if (currentText.length >= 1) {
								await editMessage(currentText.substring(0, currentText.length - suffix.length));
							}
							clearIntervalAsync(intervalId);
							return;
						}

						[currentText, newText] = [chunks[currentChunk]?.trim() ?? "", ""];

						currentText = handleIncompleteCodeBlock(currentText);
						currentText = handleIncompleteLine(currentText);

						currentText = currentText.replaceAll(
							/([\n\r]{2,})(?=[^\n\r]*```[\s\S]*?```)|([\n\r]{2,})(?=[^\n\r])/g,
							"\n"
						);

						currentText = currentText + suffix;
						if (currentText.length >= 1 && newText.length <= 0) {
							await editMessage(currentText);
						} else if (currentText.length >= 1) {
							await editMessage(currentText.substring(0, currentText.length - suffix.length));
						}

						if (newText.length >= 1) {
							await sendMessage(newText + suffix);
						}
					}, 500);
				},
				onTyping: async (msg) => {
					text = msg.text;
					await new Promise((resolve) => setTimeout(resolve, 100));
				},
			});

			done = true;

			function handleIncompleteCodeBlock(currentText: string): string {
				const codeBlocks = currentText.match(/`{3}([\w]*)\n([\S\s]+?)\n*?(?:`{3}|$)/g) || [];
				const lastCodeBlock = codeBlocks[codeBlocks.length - 1];

				if (lastCodeBlock && !lastCodeBlock.endsWith("```") && currentText.length >= maxLength) {
					const incompleteCodeBlock = lastCodeBlock;
					chunks[currentChunk] = currentText.substring(0, currentText.lastIndexOf(incompleteCodeBlock));
					currentText = chunks[currentChunk]?.trim() ?? "";

					currentChunk++;
					chunks.push("");
					chunks[currentChunk] += incompleteCodeBlock;
					newText = chunks[currentChunk] ?? "";
				}

				return currentText;
			}

			function handleIncompleteLine(currentText: string): string {
				const lines = currentText.split("\n");
				const lastLine = lines[lines.length - 1];

				if (
					lastLine &&
					(/\s+$/.test(lastLine) || !/[.,!?:;]$/.test(lastLine)) &&
					currentText.length >= maxLength
				) {
					const incompleteLastLine = lastLine;
					chunks[currentChunk] = currentText
						.substring(0, currentText.lastIndexOf(incompleteLastLine))
						.trimEnd();
					currentText = chunks[currentChunk]?.trim() ?? "";

					currentChunk++;
					chunks.push("");
					chunks[currentChunk] += incompleteLastLine;
					newText = chunks[currentChunk] ?? "";
				}

				return currentText;
			}
		},
	});
