var users = [];
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");

let settings;

function init() {
	settings = this.settings;
}

function getUsers() {
	return users;
}

function getUser(id) {
	let result = null;

	// console.log(users);

	Array.prototype.forEach.call(getUsers(), user => {
		if (user.id === id) result = user;
	});

	return result;
}

function getSocket(id) {
	return getUser(id).socket;
}

function addUser(socket, ip) {
	const id = createUUID();

	Array.prototype.push.call(getUsers(), {
		id: id,
		socket: socket,
		ip: ip,
		data: []
	});

	return id;
}

function isGoodAddress(address) {
	return Array.prototype.filter.call(getUsers(), user => user.ip === address).length <= 5;
}

function removeUser(id) {
	const index = Array.prototype.findIndex.call(getUsers(), (user) => user.id === id);

	if (index !== -1) {
		users = Array.prototype.splice.call(getUsers(), index, 1)[0];
	}

	return null;
}

function randomLetter() {
	return alphabet[Math.floor(Math.random() * alphabet.length)];
}

function createUUID() {
	const uuid = randomLetter() + randomLetter() + randomLetter() + randomLetter() + randomLetter();
	if (getUser(uuid)) return createUUID();
	return uuid;
}

module.exports = { init, getUsers, getUser, getSocket, addUser, isGoodAddress, removeUser };
