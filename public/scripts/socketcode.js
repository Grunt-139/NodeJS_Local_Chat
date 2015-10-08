"user strict"
//Socket
var socket;

//saved ids
var friendId, myId = '';

var typingTimer;

//users list
var activeUsers = [];
var inactiveUsers = [];

//Whether or not we are logged in
var loggedIn = false;


//Loads and displays the user list
function loadUsers(onlineUsers, offlineUsers) {

  var on = JSON.parse(onlineUsers);
  var off = JSON.parse(offlineUsers);

  for (var i = 0; i < on.length; i++) {
    activeUsers.push(on[i].name);
  }

  for (var j = 0; j < off.length; j++) {
    inactiveUsers.push(off[j].name);
  }
  PopulateUserList();
  
  
  //We set the loggedin flag now, that way we know the users are correct
  loggedIn = true;

};

//Sends the message out into the world
$('#chatform').submit(function () {
  //Send the message to the other users
  socket.emit('chat message', { msg: $('#m').val(), id: myId, receiver: friendId });
  //Append it to the local messages
  $('#messages').append($('<li class="localMessages">').text("You: " + $('#m').val()));
  $('#m').val('');
  return false;
});




//Initiliaze Socket Connection
function InitSocketIO() {
  socket = io();
  
  //Message Event
  socket.on('chat message', function (data) {
    $('#messages').append($('<li class="otherMessages">').text(data.id + ': ' + data.msg));
  });
  
  //Typing Event
  socket.on('typing_begin', function (name) {
    if (!loggedIn) return;
    var curMessage = $("#typing_id").text().split(',');

    if (curMessage.indexOf(name) < 0) {

      curMessage.splice(curMessage.length - 1, 1);

      curMessage.push(name + ', is typing');

      curMessage = curMessage.join();

      $("#typing_id").text(curMessage);


      typingTimer = setTimeout(function () {
        var curMessage = $("#typing_id").text().split(',');

        curMessage.splice(curMessage.indexOf(name), 1);
        if (curMessage.length > 1)
          curMessage = curMessage.join();
        else
          curMessage = '';

        $("#typing_id").text(curMessage);

      }, 2000);

    }

  });

  socket.on('typing_end', function (name) {
    if (!loggedIn) return;

    clearTimeout(typingTimer);

    var curMessage = $("#typing_id").text().split(',');

    curMessage.splice(curMessage.indexOf(name), 1);


    if (curMessage.length > 1)
      curMessage = curMessage.join();
    else
      curMessage = '';

    $("#typing_id").text(curMessage);

  });
  
  //New active user
  socket.on('new_login', function (name) {
    if (!loggedIn) return;
    MakeActive(name);
  });
  
  //New user
  socket.on('new_user', function (name) {
    if (!loggedIn) return;
    MakeActive(name);
  });
  
  //User disconnected
  socket.on('user_disconnect', function (name) {
    if (!loggedIn) return;
    MakeInactive(name);
  });


};

//Clears the user list and then refills it 
function PopulateUserList() {
  //Empty the lists first
  $("#active_users_list").empty();
  $("#inactive_users_list").empty();
  
  //Repopulate the lists
  for (var i = 0; i < activeUsers.length; i++) {
    $("#active_users_list").append($('<li>').text(activeUsers[i]));
  }

  for (var i = 0; i < inactiveUsers.length; i++) {
    $("#inactive_users_list").append($('<li>').text(inactiveUsers[i]));
  }
}


//Makes a user inactive
function MakeInactive(name) {
  //Add to the inactive list
  inactiveUsers.push(name);
    
  //Remove from the active list
  var u = findUserByName(name, activeUsers);
  if (u) {
    activeUsers.splice(activeUsers.indexOf(u), 1);
  }
  PopulateUserList();
}


function MakeActive(name) {
  //Add to the inactive list
  activeUsers.push(name);
    
  //Remove from the active list
  var u = findUserByName(name, inactiveUsers);
  if (u) {
    inactiveUsers.splice(inactiveUsers.indexOf(u), 1);
  }
  PopulateUserList();
}

//Finds a user within a list and returns the user or false
function findUserByName(name, list) {
  var i;
  for (i = 0; i < list.length; i++) {
    if (list[i] == name)
      return list[i];
  };

  return false;
};

//Shows the chat screen loads the user list 
function InitChatScreen() {
  //Hide the login/signup page
  $("#login_signup").hide();
    
  //Show the users side panel
  $("#users").show();

  $("#chat").show();
  
  //Load the users sidebar
  socket.emit('getusers', loadUsers);
};


//Keyup event on input
$("#m").keyup(function () {
  socket.emit('typing_begin', myId);
});


//Keydown event on input
$("#m").keydown(function () {
  socket.emit('typing_end', myId);
});