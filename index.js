const startTime = new Date().getTime();

const net = require('net');
const fs = require('fs');
const NodeRSA = require('node-rsa');
const beautifyJSON = require('beautify');

const key = new NodeRSA({ b: 512 }); // generates 512-bit rsa key
const settings = require('./settings.json');
const pluginSettings = require('./plugins/pluginSettings.json');

const LogUtils = require("./utils/LogUtils.js");
LogUtils.prepareLogUtils(settings.debug);
settings.debug ? LogUtils.info("Debug mode is enabled.") : null;
LogUtils.debug("Loaded LogUtils.js [UTILS]");

var UserManager = require('./utils/UserManager.js');
UserManager.settings = settings;
UserManager.init();
LogUtils.debug("Loaded UserManager.js [UTILS]");

var PacketUtils = require('./utils/PacketUtils.js');
PacketUtils.settings = settings;
PacketUtils.init();
LogUtils.debug("Loaded PacketUtils.js [UTILS]");

if (!fs.existsSync("./plugins/") || !fs.existsSync("./plugins/core/")) {
	LogUtils.error("The plugins/plugin core folder is missing.");
	process.exit(1);
}

let test = new Date().getTime();
var PluginManager = require('./utils/PluginManager.js');
PluginManager.LogUtils = LogUtils;
PluginManager.UserManager = UserManager;
PluginManager.PacketUtils = PacketUtils;
PluginManager.settings = settings;
PluginManager.pluginSettings = pluginSettings;
PluginManager.localKey = key;
PluginManager.prepare();
LogUtils.debug("Loaded PluginManager.js [UTILS]");

function stripAddress(ra) {
	return ra.replace("::ffff:", "");
}

process.stdin.resume();

let isCleaning = false;

function exitCleanup(exitCode) {
	if (!isCleaning) {
		isCleaning = true;
		LogUtils.info("Exiting...");
		fs.writeFileSync("./plugins/pluginSettings.json", beautifyJSON(JSON.stringify(pluginSettings), { format: "json" }));
		process.exit(exitCode);
	}
}

process.on('SIGINT', exitCleanup.bind(null));
process.on('SIGUSR1', exitCleanup.bind(null));
process.on('SIGUSR2', exitCleanup.bind(null));

process.on("uncaughtException", err => {
	LogUtils.error("Caught an exception. Error:");
	LogUtils.error(err + "\n\n" + err.stack);
	LogUtils.warn("Attempting to continue...");
});

const server = net.createServer(socket => {

	const address = stripAddress(socket.remoteAddress);

	LogUtils.debug("Incoming connection from IP " + address + ".");

	if (UserManager.isGoodAddress(address)) {
		LogUtils.info("Accepted request from IP " + address + ".");
	} else {
		// Doesn't send an informational message because we assume the intent is malicious (by using bots).
		LogUtils.info("Rejected request from IP " + address + ".");
		return socket.destroy();
	}

	// User ID.
	const connection = UserManager.addUser(socket, address);
	UserManager.getUser(connection).data.joinTime = new Date().getTime();

	PluginManager.onLogin(connection);

	socket.on('data', data => {
		try {
			let res;
			let pubKey = UserManager.getUser(connection).data.publicKey;

			if (pubKey) {
				res = JSON.parse(key.decrypt(data.toString(), "utf8"));
			} else {
				res = JSON.parse(data.toString());
			}

			// If the client doesn't send a formal packet, we will assume they're not using the correct
			// protocol/protocol version and decline their request.
			if (res.pType == null || res.data == null) {
				LogUtils.info(`Request of IP ${address} was rejected due to incorrect protocol usage and subsuquently disconnected.`);
				socket.write("Invalid protocol."); // Doesn't send formal packet because we assume they are not using the correct protocol.
				socket.destroy();
			}

			// Handles users, encryption, errors, and parsing then passes everything else to the plugins to handle.
			PluginManager.distributeEvent(res, connection);
		} catch (err) {
			// Assume the client is not using correct protocol and disconnect them to avoid further error.
			LogUtils.info(`The client at IP ${address} caused an error and was disconnected forcefully. Error:`);
			LogUtils.error(err + "\n\n" + err.stack);
			socket.write("Invalid protocol.");
			socket.destroy();
		}
	});

	socket.on('close', () => {
		LogUtils.info(`Client at IP ${address} has disconnected.`);
		UserManager.removeUser(connection);
		socket.destroy();
	});
}).on("error", err => {
	LogUtils.error("There was an error whilst connecting a user to the server. Error:");
	LogUtils.error(err + "\n\n" + err.stack);
	LogUtils.warn("Attempting to continue...");
});

server.listen(settings.port, () => {
	const timeDiff = new Date().getTime() - startTime;
	LogUtils.info("Ready on port " + settings.port + ". Awaiting incoming requests. [in " + timeDiff + "ms]");
});

function loop() {
	PacketUtils.broadcastPacket(PacketUtils.createPacket(PacketUtils.PacketType.Server.PACKET_MESSAGE, {
		"message": "This is a test message being broadcasted every 5 seconds.",
		"author": "00000"
	}));

	setTimeout(loop, 5000);
}

loop();
