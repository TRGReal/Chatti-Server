const fs = require('fs');
const fileList = [];
const pluginList = [];

global.plugins = [];

let LogUtils;
let UserManager;
let PacketUtils;
let settings;
let pluginSettings;
let localKey;

const coreList = fs.readdirSync("./plugins/core/");
const normalList = fs.readdirSync("./plugins/");

// Forces core plugins to load first since it's the first in the array.
coreList.forEach(file => {
	fileList.push("core/" + file);
});

normalList.forEach(file => {
	fileList.push(file);
});

function prepare() {
	LogUtils = this.LogUtils;
	UserManager = this.UserManager;
	PacketUtils = this.PacketUtils;
	settings = this.settings;
	pluginSettings = this.pluginSettings;
	localKey = this.localKey;

	LogUtils.info("Loading all plugins...");

	fileList.forEach(file => {
		let beginTime = new Date().getTime();

		if (file.endsWith(".js")) {
			LogUtils.debug(`Attempting to load plugin: /plugins/${file}!`);
			try {
				const plugin = {};
				const loaded = require("../plugins/" + file);

				if (!loaded.onPacketEvent || !loaded.info) {
					LogUtils.error(`There was an error with loading the plugin: /plugins/${file}. [onPacketEvent or info doesn't exist.]`);
				} else {
					const info = loaded.info;

					if (!info.name || !info.description || !info.version) {
						LogUtils.error(`Information is missing from the plugin: /plugins/${file}.`);
					} else {
						if (getPluginByName(loaded.name) === null) {
							LogUtils.debug(`Plugin passed checks, initiating plugin.`);
							if (loaded.onPreInit) loaded.onPreInit();

							// Prevents the plugin from being GC'd whilst being stored in memory.
							global.plugins.push(loaded);

							loaded.LogUtils = LogUtils;
							loaded.UserManager = UserManager;
							loaded.PacketUtils = PacketUtils;
							loaded.localKey = localKey;
							if (file.startsWith("core/")) {
								loaded.settings = settings; // if the file is a core plugin.
							} else {
								loaded.settings = pluginSettings;
							}

							plugin.self = loaded;
							plugin.onPacketEvent = loaded.onPacketEvent;
							plugin.name = info.name;
							plugin.description = info.description;
							plugin.version = info.version;
							if (loaded.onLogin) plugin.onLogin = loaded.onLogin;

							pluginList.push(plugin);
							if (loaded.onInit) loaded.onInit();

							let timeDiff = new Date().getTime() - beginTime;
							LogUtils.success(`Loaded ${info.name} v${info.version} [/plugins/${file}] [added ${timeDiff}ms to the startup].`);
						} else {
							LogUtils.error(`The following plugin attempted to register using an already used name: /plugins/${file}.`);
						}
					}
				}
			} catch(err) {
				LogUtils.error(`Caught an error whilst attempting to load the plugin: /plugins/${file}. Error:`);
				LogUtils.error(err + "\n\n" + err.stack);
				LogUtils.warn("Attempting to continue normally...");
			}
		}
	});
}

function getPluginByName(name) {
	pluginList.forEach(plugin => {
		if (plugin.name === name) return plugin;
	});
	return null;
}

function distributeEvent(response, id) {
	pluginList.forEach(plugin => {
		plugin.onPacketEvent(response.pType, response.data, id);
	});
}

function onLogin(id) {
	pluginList.forEach(plugin => {
		if (plugin.onLogin) plugin.onLogin(id);
	});
}

module.exports = { prepare, getPluginByName, distributeEvent, onLogin };
