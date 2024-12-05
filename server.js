/*****************************/
/* set up the static file server*/
let static = require("node-static");

/*set up the http server */
let http = require("http");

/*if we are running on heroku */
let port = process.env.PORT;
let directory = __dirname + "/public";

/* if not on heroku, adjust our port and directory */
if ((typeof port == 'undefined') || (port == NULL)) {
    port = 8080;
    directory = "./public";
}

/* set up static file web server to deliver files from the file system */
let file = new static.Server(directory);

let app = http.createServer(
    function (request, response) {
        request.addListener("end",
            function () {
                file.serve(request, response);
            }
        ).resume();
    }
).listen(port);

console.log("The server is running.");

/***************************************************/
/* Set up the web sockets */

// set up a registry of player info and their socket id
let players = [];

const { Server } = require("socket.io");
const { join } = require("path");
const io = new Server(app);

io.on('connection', (socket) => {

    /* Output a log message on the server and send it to the clients */
    function serverLog(...messages){
        io.emit('log', ['**** Messages from the server: \n']);
        messages.forEach((item) => {
            io.emit('log', ['****\t' + item]);
            console.log(item);
        });
    }

    serverLog('A page connected to the server: ' + socket.id);

    

    /* join_room command handler */

    /* expected payload:
    {
        'room': the room to be joined,
        'username': the name of the user joining the room
    }

    join_room_reponse :
        {
            'result': 'success',
            'room' : room that was joined,
            'username': the user that joined the room,
            'count': the number of users in the chat room
            'socket_id': the socket of the user that joins the room
        }

        or

        {
            'result': 'fail'.
            'message': the reason for the failure
        }
    */

    socket.on('join_room', (payload) => {
        serverLog('Server received a command', '\'join_room\'', JSON.stringify(payload));
        // check that data coming from the client is good
        if((typeof payload == 'undefined') || (payload == null)){
            response = {};
            response.result = 'fail';
            response.messages = 'client did send a valid payload';
            socket.emit('join_room_response', response);
            serverLog('join_room_command failed', JSON.stringify(response));
            return;
        }

        let room = payload.room;
        let username = payload.username;
        if((typeof room == 'undefined') || (room == null)){
            response = {};
            response.result = 'fail';
            response.messages = 'client did send a valid room to join';
            socket.emit('join_room_response', response);
            serverLog('join_room_command failed', JSON.stringify(response));
            return;
        }
        if((typeof username == 'undefined') || (username == null)){
            response = {};
            response.result = 'fail';
            response.messages = 'client did send a valid username to join';
            socket.emit('join_room_response', response);
            serverLog('join_room_command failed', JSON.stringify(response));
            return;
        }

        /* Handle the command */
        socket.join(room);

        /* make sure the client was put into the room*/
        io.in(room).fetchSockets().then((sockets) =>{
            serverLog('There are ' + sockets.length + ' clients in the room, ' + room);
            /*Socket did not join the room */
            if((typeof sockets == 'undefined') || (sockets == null) || !sockets.includes(socket)) {
                response = {};
                response.result = 'fail';
                response.messages = 'server internal error joining chat room';
                socket.emit('join_room_response', response);
                serverLog('join_room_command failed', JSON.stringify(response));
                return;
            }
            /*Socket did join room */
            else{
                players[socket.id] = {
                    username: username,
                    room: room
                }
                /* Announce to everyone that is in room who else is in the room*/

                for (const member of sockets) {
                    response = {
                        response: "success",
                        socket_id: member.id,
                        room: room,
                        username: username,
                        count: sockets.length
                    };
                    
                    /*Tell everyone that a new user joined the chat room */
                   io.of('/').to(room).emit('join_room_response', response);
                   serverLog('join_room command succeeded', JSON.stringify(response));
                }

                
            }
        });

    });

    socket.on('disconnect', () => {
        serverLog('A page disconnected from the server: ' + socket.id);
        if((typeof players[socket.id] != 'undefined') && (players[socket.id] != null)) {
            let payload = {
                username: players[socket.id].username,
                room: players[socket.id].room,
                count: Object.keys(players).length -1,
                socket_id: socket.id
            };
            let room = players[socket.id].room;
            delete players[socket.id];
            /*Tell everyone who left the room */
            io.of("/").to(room).emit('player_disconnected', payload);
            serverLog('player_disconnected succeeded', JSON.stringify(payload));
        }
    });

        /* send_chat_message command handler */

    /* expected payload:
    {
        'room': the room to which the message should be sent,
        'username': the name of the user joining the room
        'message': the message to be broadcast
    }

    send_chat_message_response :
        {
            'result': 'success',
            'username': the user that sent the message,
            'message': the message that was sent
        }

        or

        {
            'result': 'fail'.
            'message': the reason for the failure
        }
    */

        socket.on('send_chat_message', (payload) => {
            serverLog('Server received a command', '\'send_chat_message\'', JSON.stringify(payload));
            // check that data coming from the client is good
            if((typeof payload == 'undefined') || (payload == null)){
                response = {};
                response.result = 'fail';
                response.messages = 'client did send a valid payload';
                socket.emit('send_chat_message_response', response);
                serverLog('send_chat_message_command failed', JSON.stringify(response));
                return;
            }
    
            let room = payload.room;
            let username = payload.username;
            let message = payload.message;
            if((typeof room == 'undefined') || (room == null)){
                response = {};
                response.result = 'fail';
                response.messages = 'client did send a valid room to message';
                socket.emit('send_chat_message_response', response);
                serverLog('send_chat_message_command failed', JSON.stringify(response));
                return;
            }
            if((typeof username == 'undefined') || (username == null)){
                response = {};
                response.result = 'fail';
                response.messages = 'client did send a valid username to as a message sender';
                socket.emit('send_chat_message_response', response);
                serverLog('send_chat_message_command failed', JSON.stringify(response));
                return;
            }
            if((typeof message == 'undefined') || (message == null)){
                response = {};
                response.result = 'fail';
                response.messages = 'client did send a valid message';
                socket.emit('send_chat_message_response', response);
                serverLog('send_chat_message_command failed', JSON.stringify(response));
                return;
            }
    
            /* Handle the command */
            let response = {};
            response.result = 'success';
            response.username = username;
            response.room = room;
            response.message = message;

            /* tell everyone in the room what the messageis */
            io.of('/').to(room).emit('send_chat_message_response', response);
            serverLog('send_chat_message command succeeded', JSON.stringify(response));
            
    
        });

});