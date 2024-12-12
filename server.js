var express = require('express');
var http = require('http');
var socketIo = require('socket.io');
var app = express();
var server = http.createServer(app);
var io = socketIo(server);

app.use(express.static('public'));

var users = {}; // ユーザー情報 {username: {password, socketId}}
var rooms = {}; // ルーム情報 {roomId: [username1, username2, ...]}

io.on('connection', (socket) => {
    console.log('新しいユーザーが接続しました');

    // ログイン処理
    socket.on('login', (data) => {
        var { username, password } = data;
        if (users[username] && users[username].password !== password) {
            socket.emit('login-error', 'パスワードが間違っています');
        } else {
            users[username] = { password, socketId: socket.id };
            socket.emit('login-success', { username, rooms });
        }
    });

    // ルーム作成
    socket.on('create-room', (roomName) => {
        if (!rooms[roomName]) {
            rooms[roomName] = [];
            socket.emit('room-created', roomName);
            io.emit('rooms-updated', rooms); // 全員にルームリスト更新を通知
        } else {
            socket.emit('room-error', 'そのルームは既に存在します');
        }
    });

    // ルーム参加
    socket.on('join-room', ({ roomName, username }) => {
        if (rooms[roomName]) {
            rooms[roomName].push(username);
            socket.join(roomName);
            io.to(roomName).emit('message', `${username} さんが参加しました`);
        } else {
            socket.emit('room-error', 'そのルームは存在しません');
        }
    });

    // メッセージ送信
    socket.on('send-message', ({ roomName, username, message }) => {
        io.to(roomName).emit('message', `${username}: ${message}`);
    });

    // 切断処理
    socket.on('disconnect', () => {
        var user = Object.keys(users).find(key => users[key].socketId === socket.id);
        if (user) {
            delete users[user];
            console.log(`${user} が切断しました`);
        }
    });
});

server.listen(3000, () => {
    console.log('サーバーが起動しました: http://localhost:3000');
});
