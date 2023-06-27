import type { TextChannel } from "discord.js";

export class TypingSender {
	private channel: TextChannel;
	private interval: NodeJS.Timeout | null = null;
	private intervalTime = 1000;

	constructor(channel: TextChannel) {
		this.channel = channel;
	}

	async start() {
		await this.channel.sendTyping();
		this.interval = setInterval(async () => {
			await this.channel.sendTyping();
		}, this.intervalTime);
	}

	stop() {
		if (this.interval) {
			clearInterval(this.interval);
		}
	}
}

type Func = () => Promise<void>;
type ErrorHandler = (error: Error, attempt: number) => Promise<boolean>;
type ExhaustedHandler = (error: Error) => Promise<void>;

export const withRetry = async (
	func: Func,
	errorHandler: ErrorHandler,
	exhaustedHandler: ExhaustedHandler,
	maxAttempts: number = 5,
	retryDelay: number = 5000
): Promise<void> => {
	let attempt = 0;
	while (attempt < maxAttempts) {
		attempt += 1;
		try {
			await func();
			break;
		} catch (error: any) {
			const shouldRetry = await errorHandler(error, attempt);
			if (!shouldRetry) {
				await exhaustedHandler(error);
				break;
			}
			await new Promise((resolve) => setTimeout(resolve, retryDelay));
		}
	}
};
