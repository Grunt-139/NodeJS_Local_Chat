"use strict"
/* global i */
//Init Express
var express = require('express');
var app = express();
//Create server
var http = require('http').Server(app);
//Init SocketIO
var io = require('socket.io')(http);

//User object
var User = require('./user').User;

//File System
var fs = require("fs");
var jsonfile = require('jsonfile');

//Online users
var activeUsers = [];

//Offline users
var offlineUsers = [];

//All the users
var allUsers = [];

//All the users and their sockets
var userSockets = [];

var usersFileName = 'users.txt';


app.use(express.static('public'));


app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});

http.listen(3000, function () {
  console.log('listening on *:3000');
});


/*********************
 * Initializes Everything
 * *************************** */
function Init() {
  console.log("Init Begun");
  //Get the users
  //Loading the users first so they can be loaded prior to setting up the event handlers, removes the chance of a register event being fired before everything is setup
  LoadUsers();
  //Set the event handlers
  SetEventHandlers();
  console.log("Initiliazed");
};

/****************************
 * Sets up the Event handlers
 * ******************************* */
function SetEventHandlers() {
  console.log("Setting Event Handlers");
  io.on('connection', OnSocketConnection);
}

/**************************
 * Connection Event Handler
 * *********************** */
function OnSocketConnection(client) {
  console.log('User Connected: ' + client.id);
  client.on('chat message', ChatMessage);
  client.on('disconnect', Disconnect);
  client.on('login', Login);
  client.on('register', Register);
  client.on('getusers', GetUsers);
  client.on('logout',Logout)
  client.on('typing_begin',TypingBegin);
  client.on('typing_end',TypingEnd);
}

/*****************************************************************
*Handles the login attempt, returns if it worked or not
*If it worked, it creates a new user, adds it to the online users
*******************************************************************/
function Login(data, callback) {
  console.log("Attempting login");
  
  //Check if already logged in or not
  var u = FindUserByName(data.name, activeUsers);
  console.log("Checking if logged in");
  if (u) {
    callback("Already Logged In");
    console.log("Login Failed: Already logged in");
    return;
  }
  console.log("Not logged in checking password");
  //Not logged in? Check if the credentials are good
  u = FindUserByName(data.name, allUsers);

  if (u) {
    //Set up the id and socket of the user
    u.id = this.id;
    u.socket = this;

    //If the password matches, we are good
    if (data.pass === u.pass) {
      callback();
      console.log("Succesful login");
      this.broadcast.emit('new_login', data.name);
      MakeActive(data.name);

    } else {
      console.log("Bad password");
      callback("Password Does Not Match")
    }
  } else {
    console.log("User cannot be found");
    callback("User Does Not Exist");
  }

};

/*************************
 * Fired when typing ends
 * ********************** */
function TypingBegin(name){
  this.broadcast.emit('typing_begin',name);
}

/*****************************
 * Fired when input stops
 * *********************** */
function TypingEnd(name){
  this.broadcast.emit('typing_end',name);
}


/*****************************************
*New User handler
*Creates and saves the new user data
******************************************/
function Register(data, callback) {
  console.log("Register Attempt: " + JSON.stringify(data));
  //Check if the user exists
  var u = FindUserByName(data.name, allUsers);
  
  //User Exists
  if (u) {
    console.log("Registration failed: User Exists");
    callback("User Exists");
  } else {
    //User does not exist
    allUsers.push(new User(data.name, data.pass, this));
    console.log(allUsers[allUsers.length - 1].id);
    console.log("User Added To Users Array");
    //Make it inactive
    MakeInactive(data.name);
    
    //We create our user file if it does not exist or we write to it
    jsonfile.writeFile(usersFileName, allUsers, { replacer: ['pass', 'name'] }, function (err) {
      if (err) {
        console.log("Error Writing to file: " + err);
        throw err;
      } else {
        console.log("New user saved");
        //call the callback
        callback("");
        
        //Tell all the active users (ie. anyone listening for the event) about the new user
        //We need to get the socket from the user because this write is async so 'this' will no longer be valid
        var s = FindUserByName(data.name, allUsers);

        if (s && typeof (s.socket) !== 'undefined') {
          s.socket.broadcast.emit('new_user', data.name);
        }
      }
    });
  }
};

/********************
 * Disconnect Event
 * ********************** */
function Disconnect(client) {
  console.log('User Disconnected');
  //Get the user
  var u = FindUserById(this.id, allUsers);

  if (u) {
    this.broadcast.emit('user_disconnect', u.name);
    //Remove from active list, push into offline
    MakeInactive(u.name);
  }

};

/********************************
 * Handles when the user log outs
 * ****************************** */
function Logout(name) {
  
  console.log("User " + name + " has logged out");
  
  //Get the user
  var u = FindUserById(this.id, allUsers);

  if (u) {
    this.broadcast.emit('user_disconnect', u.name);
    //Remove from active list, push into offline
    MakeInactive(u.name);
  }
}


/*********************
 * Event for sent messages
 * ******************** */
function ChatMessage(data) {
  //If the receiver is empty, we send it to everyone, otherwise we send it to the just that (TODO: MULTI-CHAT) user
  if (data.receiver) {

  } else {
    this.broadcast.emit('chat message',{id:data.id, msg:data.msg});
  }
};

/*********************
 * Returns the User List
 * ******************** */
function GetUsers(fn) {
  console.log("Sending user list");
  console.log("Active:" + JSON.stringify(activeUsers));
  console.log("Inactive " + JSON.stringify(offlineUsers));
  fn(JSON.stringify(activeUsers), JSON.stringify(offlineUsers));
};

/*******************
 * Loads the users from disk
 * ******************* */
function LoadUsers() {
  console.log("Loading Users");
  console.log("Checking if file exists");
  //Read the file
  fs.stat(usersFileName, function (err, stat) {
    if (err == null) {
      console.log("File exists...attempting read");
      //File Exists, now to read from it
      jsonfile.readFile(usersFileName, 'utf8', function (err, obj) {
        console.log("File Read");
        if (err) {
          return console.log("Error:" + err);
        }
        
        
        //Load the current user list
        allUsers = obj;
        
        //load offline users
        for (var i = 0; i < allUsers.length; i++) {
          offlineUsers.push(new User(allUsers[i].name));
        }

      });
    } else if (err.code == 'ENOENT') {
      console.log("File Does Not Exist");
    } else {
      console.log('Some other error: ', err.code);
    }
  });
};




/*************************
 * Make a user inactive
 * ********************** */
function MakeInactive(name) {
  console.log("User: " + name + " going offline");
  //Add to the inactive list
  offlineUsers.push(new User(name));
    
  //Remove from the active list
  var u = FindUserByName(name, activeUsers);
  if (u) {
    console.log("User: " + name + " removed from active list");
    activeUsers.splice(activeUsers.indexOf(u), 1);
  } else {
    console.log("User: " + name + " failed to be removed from active list");
  }
}

/***********************
 * Make a user active
 * ******************* */
function MakeActive(name) {
  console.log("User: " + name + " going online");
  //Add to the inactive list
  activeUsers.push(new User(name));
    
  //Remove from the offline list
  var u = FindUserByName(name, offlineUsers);
  if (u) {
    console.log("User: " + name + " removed from inactive list");
    offlineUsers.splice(offlineUsers.indexOf(u), 1);
  } else {
    console.log("User: " + name + " failed to be removed from inactive list");
  }
}


/****************************
 * Finds the user by their name
 * ************************ */
function FindUserByName(name, list) {
  var i;
  for (i = 0; i < list.length; i++) {
    if (list[i].name == name) {
      return list[i];
    }
  };

  return false;
};

/***************************
 * Finds a user by their id
 * *********************** */
function FindUserById(id, list) {
  var i;
  for (i = 0; i < list.length; i++) {
    if (list[i].id == id) {
      return list[i];
    }
  };

  return false;
};


Init();