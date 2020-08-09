/***************************************************************************************
/ File        : ws-ssl.js
/ Description : Manages connections and message traffic between worker and nodered flows
/
/ Copyright (C) 2020, NodeBotRpa@gmail.com
/
/ This source code is free to use and modify provided this notice remains intact
/
***************************************************************************************/
var args = process.argv.slice(2);
var i;
var port=7000;
const lERROR = 20;
const lINFO  = 30;
const lDEBUG = 50;
const lOFF   = 0;
var log=lINFO;

// process arguments
for (i=0;i<args.length;i++) {
	var argp = args[i].split("=");
	if ((argp[0] == "-help") || (argp[0] == "help") || (argp[0] == "?")) {
		console.log("Usage: node ws-ssl [OPTIONS]");
		console.log("");
		console.log("Options");
		console.log("port=PORT            port to listen");
		console.log("log-level=LEVEL      set log level : DEBUG, INFO, OFF");
		return;
	}
	if (argp[0]=="port") port = argp[1];
	if (argp[0]=="log-level") {
		console.log("Logging level is "+argp[1]);
		switch (argp[1]) {
			case "OFF" : log = lOFF;break;
			case "DEBUG" : log = lDEBUG;break;
			case "INFO" : log = lINFO;break;
		}
	}
}

// log messages
function MSG(msg){
	var d = new Date();
    var n = d.toLocaleString();
	console.log(n+"-"+msg);
}

function INFO(msg) {
	if (log >= lINFO)
		MSG("INFO:"+msg);
}

function DEBUG(msg) {
	if (log >= lDEBUG)
		MSG("DEBUG:"+msg);
}
function ERROR(msg) {
	if (log >= lERROR)
		MSG("ERROR:"+msg);
}

const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const User = require("./ws-login.js");

// creates server with ssl sertificates
const server = https.createServer({
  cert: fs.readFileSync('cert.pem'),
  key: fs.readFileSync('key.pem')
});

var sockets = new Map();
var users = new Map();
var result = {status:"",value:""};
// starts server
const wss = new WebSocket.Server({ server });
  wss.on('connection', function connection(ws) {
    INFO('Accepted a new connection '+ws._socket.remoteAddress + ':' + ws._socket.remotePort);
    ws.on('data', function(data){
	  DEBUG('Received data from '+ws._socket.remoteAddress+':'+data);
    });
	// remove user information when connection closed
    ws.on('close', function(data){
	  sockets.forEach( function(socket,user){
		  if (ws == socket) {
			  sockets.delete(user);
			  users.delete(user);
		  }
	  });
	  INFO('Connection close by '+ws._socket.remoteAddress+':'+ws._socket.remotePort);
    });
	
    ws.on('message', function incoming(message) {
	  DEBUG('Incoming Message: '+message+':'+ws._socket.remoteAddress+':'+ws._socket.remotePort);
	  var msg = JSON.parse(message);
	  // Authenticate worker connection
	  if (msg.action=="LOGIN") {
		  var usr = new User(msg.workspace, msg.user, msg.password);
		  result = usr.connect();
		  if (result.status == "SUCCESS") {
			  if (!(users.has(msg.user))) {
				sockets.set(msg.user,ws);
				users.set(msg.user, usr);
			  } else {
				result.status = "ERROR";
				result.value = "User is active in another session.";
			  }
		  } else {
		  }
		  ws.send(JSON.stringify(result));
		  DEBUG('Login result sent.');
	  }
	  // Send workers's message to nodered flow
	  if (msg.action == "RESPONSE") {
		  DEBUG('Sending message to flow');
		  sockets.forEach( function(socket,user){
			  if (ws == socket) {
				  users.get(user).getNode().send(JSON.stringify(msg));
				  users.get(user).getNode().close();
			  }
	      });
	  }
	  // Send nodered flow's message to worker
	  if ((msg.action != "RESPONSE")&&(msg.action!="LOGIN")) {
		  if (!(users.has(msg.user))) {
			result.status = "ERROR";
			result.value = "Worker is inactive.";
			ws.send(JSON.stringify(result));
			ws.close();
		  } else {
			DEBUG('Sending message to worker '+JSON.stringify(msg));
			users.get(msg.user).setNode(ws);
			sockets.get(msg.user).send(JSON.stringify(msg));
		  }
	  }
    });	
    ws.on('error', function(data){
	  ERROR('Error on connection '+ws._socket.remoteAddress);
    });
});

server.listen(port, "localhost", () => {
  console.log("NodeBot connection server v0.1(Alpha)");
  console.log("Use -help parameter to see usage information\n");
  console.log("Listening on port "+port+" at localhost.");
});