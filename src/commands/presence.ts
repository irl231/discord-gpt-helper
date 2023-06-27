import Command from "../structures/command";
import store from "../structures/store";

store.set("lastActive", Date.now());
export default new Command("presence", "Bot presence")
	.useEvent({
		name: "ready",
		once: true,
		execute: async function (client) {
			const autoIdle = () => {
				if (Date.now() - store.get("lastActive") > 1 * 60 * 1000) client.user.setPresence({ status: "idle" });
			};

			client.user.setPresence({ status: "online" });
			setInterval(autoIdle, 15 * 1000);
		},
	})
	.useEvent({
		name: "messageCreate",
		once: false,
		execute: async function (message) {
			if (!message.mentioned) return;

			store.set("lastActive", Date.now());
			if (message.client.user.presence.status != "online") message.client.user.setPresence({ status: "online" });
		},
	});
