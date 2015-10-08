var User = function(name,pass,socket){
	this.name = name;
	this.pass = pass || '';
	this.socket = socket || 'undefined';
	this.id = socket ? socket.id : '';
}
exports.User = User;