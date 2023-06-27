import "dotenv/config";
import { initialize } from "./commands/chat/poe.js";
import Client from "./structures/client";

(async () => {
	await initialize();
	const client = new Client();
	client.start();
})();
