const chalk = require('chalk');
let isDebug;
let isReady = false;

// dbg = debug
// cnsle = console
function prepareLogUtils(dbg) {
	isDebug = dbg;
	isReady = true;
}

function generateTimeMsg() {
	return new Date().toLocaleString();
}

function debug(msg) {
	// If LogUtils hasn't been prepared yet, don't allow the function to run.
	// OR
	// If the debug variable is not set, don't let this function run.
	if (!isReady || !isDebug) return;

	const time = generateTimeMsg();

	console.log(chalk.gray(`[${time}] [DEBUG] ${msg}`));
}

function success(msg) {
	if (!isReady) return;

	const time =  generateTimeMsg();

	console.log(chalk.green.bold(`[${time}] [SUCCESS] ${msg}`));
}

function general(msg) {
	if (!isReady) return;

	const time = generateTimeMsg();

	console.log(`[${time}] ${msg}`)
}

function info(msg) {
	if (!isReady) return;

	const time = generateTimeMsg();

	console.log(`[${time}] [INFO] ${msg}`);
}

function error(msg) {
	if (!isReady) return;

	const time = generateTimeMsg();

	console.log(chalk.red.bold(`[${time}] [ERROR] ${msg}`));
}

function warn(msg) {
	if (!isReady) return;

	const time = generateTimeMsg();

	console.log(chalk.hex("ffcc00")(`[${time}] [WARNING] ${msg}`));
}

module.exports = { prepareLogUtils, debug, general, info, success, error, warn };
