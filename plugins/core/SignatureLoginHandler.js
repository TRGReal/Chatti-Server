const fs = require('fs');
const NodeRSA = require('node-rsa');

const signatureKey = new NodeRSA(fs.readFileSync("./SignatureKeyStore/private-key"), "private");

let LogUtils;
let UserManager;
let PacketUtils;
let localKey;

let settings;

const info = {
	"name": "LoginHandler Core",
	"description": "The core plugin to handle the clientside key exchange process.",
	"version": "1.0"
};

function onLogin(id) {
	PacketUtils.writePacket(id, PacketUtils.createPacket(PacketUtils.PacketType.Server.PACKET_KEY_EXCHANGE, localKey.exportKey("public"), signatureKey.sign(localKey.exportKey("public"))));
}

function onPacketEvent(packetType, res, id) {
	let user = UserManager.getUser(id);
	const socket = user.socket;
	const address = user.ip;
	let pubKey = user.data.publicKey;

	// console.log(res);

	if (packetType === PacketUtils.PacketType.Client.PACKET_KEY_EXCHANGE) {
		user.data.publicKey = new NodeRSA(res, "public");
		pubKey = user.data.publicKey;
		LogUtils.debug("Traded public keys with client at IP " + address + "! Sending test message.");
		PacketUtils.writePacket(id, PacketUtils.createPacket(PacketUtils.PacketType.Server.PACKET_POST_KEY_EXCHANGE_TEST, "abcdefghijklmnopqrstuvwxyz1234567890"));
	}

	if (pubKey) {
		if (packetType === PacketUtils.PacketType.Client.PACKET_POST_KEY_EXCHANGE_TEST) {
			if (res === "abcdefghijklmnopqrstuvwxyz1234567890") {
				LogUtils.debug("Successfully exchanged encrypted test messages. Awaiting settings packet...");
			}
		}

		if (packetType === PacketUtils.PacketType.Client.PACKET_SETTINGS_INFO) {
			if (Array.prototype.filter.call(UserManager.getUsers(), u => u.data.nickname === res.nickname).length > 0) {
				return PacketUtils.kickUser(id, "Username already taken.");
			}

			let timeDiff = new Date().getTime() - user.data.joinTime;
			PacketUtils.writePacket(id, PacketUtils.createPacket(PacketUtils.PacketType.Server.PACKET_KEY_EXCHANGE_COMPLETE , ""));

			user.data.nickname = res.nickname;
			user.data.protocolVersion = res.protocolVersion;
			user.data.isLoggedIn = true;

			PacketUtils.sendMemberList(id);
			LogUtils.success("Client at IP " + address + " has logged in successfully [in " + timeDiff + "ms].");
		}
	} else {
		LogUtils.debug("Invalid protocol of client at IP " + address + " [client sent encrypted packets before key trade].");
		socket.write("Invalid protocol.");
		socket.destroy();
	}
}

function onInit() {
	LogUtils = this.LogUtils;
	UserManager = this.UserManager;
	PacketUtils = this.PacketUtils;
	settings = this.settings;
	localKey = this.localKey;
}

module.exports = { info, onPacketEvent, onInit, onLogin };
