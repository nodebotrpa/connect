/********************************************************************************
/ File        : ws-login.js
/ Description : Stores connected user information and authenticate user
/
/ Copyright (C) 2020, NodeBotRpa@gmail.com
/
/ This source code is free to use and modify provided this notice remains intact
/
*********************************************************************************/
module.exports = class User {
  constructor(workspace,email,password) {
    this.workspace = workspace;
	this.email = email;
	this.password = password;
  }

  setNode(nodews) {
	this.nodews = nodews;
  }
  getNode(nodews) {
	return this.nodews;
  }
  connect() {
	// TODO: Authenticate
	var result = {action:"LOGIN",status:"SUCCESS",value:""};
    return result;
  }
};