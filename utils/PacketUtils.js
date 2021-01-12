const protocolVersion = 1;

const UserManager = require('./UserManager.js');

let settings;

function init() {
	settings = this.settings;
}

const ClientPacketTypes = {
	PACKET_KEY_EXCHANGE: 0,
	PACKET_POST_KEY_EXCHANGE_TEST: 1,
	PACKET_SETTINGS_INFO: 2,
	PACKET_MESSAGE: 3
};

const ServerPacketTypes = {
	PACKET_KEY_EXCHANGE: 0,
	PACKET_POST_KEY_EXCHANGE_TEST: 1,
	PACKET_KEY_EXCHANGE_COMPLETE: 2,
	PACKET_MESSAGE: 3,
	PACKET_KICK_USER: 4,
	PACKET_SERVER_DATA: 5,
	PACKET_DATA_DRAIN: 6
};

const PacketType = {
	Client: ClientPacketTypes,
	Server: ServerPacketTypes
};

function kickUser(connection, reason) {
	const user = UserManager.getUser(connection);
	const nickname = user.nickname;
	const ip = user.ip;

	if (!reason) {
		reason = "None";
	}

	writePacket(connection, createPacket(PacketType.Server.PACKET_KICK_USER, reason));

	if (settings.chatMessages.broadcastOnKick) {
		const broadcastMessage = (settings.chatMessages.kickBroadcastChatMessage).replace("$nickname", nickname).replace("$reason", reason);
		broadcastPacket(createPacket(PacketType.Server.PACKET_MESSAGE, broadcastMessage));
	}

	const consoleMessage = settings.chatMessages.consoleKickMessage.replace("$nickname", nickname).replace("$ip", ip).replace("$reason", reason);
	LogUtils.info(consoleMessage);
}

function createPacket(type, data, signature) {
	let obj = {
		pType: type,
		data: data
	};

	if (signature) obj.signature = signature;

	return JSON.stringify(obj);
}

function broadcastPacket(packet) {
	const users = UserManager.getUsers();

	Array.prototype.forEach.call(users, connection => {
		// Encryption already automated.
		writePacket(connection.id, packet);
	});

}

function writePacket(connection, packet) {
	const user = UserManager.getUser(connection);
	const socket = user.socket;
	const pubKey = user.data.publicKey;

	console.log(packet);

	// Determines whether or not the packet should be automatically encrypted.
	// This only works because of how the protocol is designed.
	// After clients exchange keys, they will ALWAYS encrypt thereafter.
	if (pubKey) {
		socket.write(pubKey.encrypt(packet, "base64"));
		socket.write(pubKey.encrypt(createPacket(PacketType.Server.PACKET_DATA_DRAIN, ""), "base64"));
	} else {
		socket.write(packet);
		socket.write(createPacket(PacketType.Server.PACKET_DATA_DRAIN, ""));
	}
}

function sendMemberList(connection) {
	const users = Array.prototype.map.call(UserManager.getUsers(), u => {
		console.log(u);
		return { "id": u.id, "name": u.data.nickname };
	});

	users.push({
		"id": "00000",
		"name": "Server"
	});

	broadcastPacket(createPacket(PacketType.Server.PACKET_SERVER_DATA, {
		users,
		"protocolVersion": protocolVersion
	}));
}

module.exports = { init, PacketType, createPacket, broadcastPacket, writePacket, sendMemberList };
