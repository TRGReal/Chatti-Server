let LogUtils;
let UserManager;
let PacketUtils;

let settings;

const info = {
	"name": "MessageHandler Core",
	"description": "Processes all incoming messages from the client and broadcasts it back formatted as a response.",
	"version": "1.0"
};

function onPacketEvent(packetType, data, id) {
	const user = UserManager.getUser(id);
	const socket = user.socket;
	const nickname = user.nickname;
	const ip = user.ip;

    if (packetType === PacketUtils.PacketType.Client.PACKET_MESSAGE) {
		if (data.length <= 2000) {
			let message = settings.replace("$nickname", nickname).replace("$message", data);
			PacketUtils.broadcastPacket(PacketUtils.createPacket(PacketUtils.PacketType.Server.PACKET_MESSAGE, message));

			if (settings.chatMessages.logMessages) {
				LogUtils.general(message);
			}
		} else {
			LogUtils.info(`Client at IP ${ip} has been disconnected for sending too many characters in a message (shouldn't normally occur).`)
			socket.write("Invalid protocol.");
			socket.destroy();
		}
	}
}

function onInit() {
	LogUtils = this.LogUtils;
	UserManager = this.UserManager;
	PacketUtils = this.PacketUtils;
	settings = this.settings;
}

module.exports = { info, onPacketEvent, onInit };
