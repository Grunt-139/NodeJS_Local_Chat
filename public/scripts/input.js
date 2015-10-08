"use strict"

//When document is ready, hide everything except login
$(document).ready(function () {
  $("#users").hide();
  $("#chat").hide();

  $("#signup").hide();

});

//Attempts to login
$("#login_button").click(function (e) {
  //Check if the fields are empty
  if ($("#login_name").val() === "") {
    $("#login_feedback").text("Username missing");
  } else if ($("#login_pass").val() === "") {
    $("#login_feedback").text("Password missing");
  } else {
    //Attempt Validation
    socket.emit('login', { name: $("#login_name").val(), pass: $("#login_pass").val() }, function (error) {
      if (error) {
        $("#login_feedback").text(error);
      } else {
        myId =$("#login_name").val();
        //In SocketCode
        InitChatScreen();
      }
    });
  }

  e.preventDefault();
});

//Starts the registration process
//Shows the signup page
$("#register_button").click(function (e) {
  $("#login_feedback").text("");
  $("#login").hide();
  $("#signup").show();
  e.preventDefault();
});

//Gets the user's information and passes it along to the server
$("#register_new_button").click(function (e) {
  
  //Attempt signup 
  //If validation suceeds, show the login screen
  if ($("#signup_name").val() == "")
    $("#signup_feedback").text("Name cannot be blank");
  else if ($("#signup_pass").val() == "")
    $("#signup_feedback").text("Password cannot be blank");
  else {
    //Input is good, lets do this
    socket.emit('register', { name: $("#signup_name").val(), pass: $("#signup_pass").val() }, function (error) {
      if (error) {
        $("#signup_feedback").text(error);
      } else {
        $("#signup_feedback").text("Successfully Registered");
        $("#login").show();
        $("#signup").hide();
        $("#signup_feedback").text("");
      }
    });
  }
  //If validation fails, show error
  e.preventDefault();
});

//Back button
$("#signup_back").click(function (e) {
  $("#login").show();
  $("#signup").hide();
  e.preventDefault();
});


$("#logout").click(function (e) {
  //Hide chat and show login screen
  $("#users").hide();
  $("#chat").hide();
  $("#login_signup").show();
  //Using code from socketcode
  socket.emit('logout', myId);
  
  e.preventDefault();
});


//Initialize Socket IO
//Found in socketcode.js
InitSocketIO();