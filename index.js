import express from 'express';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3500;
const ADMIN = 'Admin';

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const expressServer = app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
});

const messageHistory = {};

const UsersState = {
    users: [],
    setUsers: function (newUsersArray) {
        this.users = newUsersArray;
    },
};

const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5500', 'http://127.0.0.1:5500'],
    },
});

io.on('connection', (socket) => {
    console.log(`User ${socket.id} connected`);

    socket.emit('message', buildMsg(ADMIN, 'Welcome to Chat App!'));

    socket.on('enterRoom', ({ name, room }) => {
        const prevRoom = getUser(socket.id)?.room;

        if (prevRoom) {
            socket.leave(prevRoom);
            io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} has left the room`));
        }

        const user = activateUser(socket.id, name, room);

        if (prevRoom) {
            io.to(prevRoom).emit('userList', {
                users: getUsersInRoom(prevRoom),
            });
        }

        sendHistoryToUser(socket, room);

        socket.join(user.room);

        socket.emit('message', buildMsg(ADMIN, `You have joined the ${user.room} chat room`));

        socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined the room`));

        io.to(user.room).emit('userList', {
            users: getUsersInRoom(user.room),
        });

        io.emit('roomList', {
            rooms: getAllActiveRooms(),
        });
    });

    socket.on('disconnect', () => {
        const user = getUser(socket.id);
        userLeavesApp(socket.id);

        if (user) {
            io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`));

            io.to(user.room).emit('userList', {
                users: getUsersInRoom(user.room),
            });

            io.emit('roomList', {
                rooms: getAllActiveRooms(),
            });
        }

        console.log(`User ${socket.id} disconnected`);
    });

    socket.on('privateMessage', ({ targetUserId, text }) => {
        const sender = getUser(socket.id);
        const targetUser = getUser(targetUserId);

        if (sender && targetUser) {
            io.to(targetUser.id).emit('privateMessage', {
                senderName: sender.name,
                text,
            });
        }
    });

    socket.on('message', ({ name, text }) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            const message = buildMsg(name, text);
            io.to(room).emit('message', message);
            addMessageToHistory(room, message);
        }
    });

    socket.on('activity', (name) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            socket.broadcast.to(room).emit('activity', name);
        }
    });
});

function buildMsg(name, text) {
    return {
        name,
        text,
        time: new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
        }).format(new Date()),
    };
}

function activateUser(id, name, room) {
    const user = { id, name, room };
    UsersState.setUsers([...UsersState.users.filter((user) => user.id !== id), user]);
    return user;
}

function addMessageToHistory(room, message) {
    if (!messageHistory[room]) {
        messageHistory[room] = [];
    }

    messageHistory[room].push(message);

    if (messageHistory[room].length > 10) {
        messageHistory[room].shift();
    }
}

function sendHistoryToUser(socket, room) {
    if (messageHistory[room]) {
        messageHistory[room].forEach((message) => {
            socket.emit('message', message);
        });
    }
}

function userLeavesApp(id) {
    UsersState.setUsers(UsersState.users.filter((user) => user.id !== id));
}

function getUser(id) {
    return UsersState.users.find((user) => user.id === id);
}

function getUsersInRoom(room) {
    return UsersState.users.filter((user) => user.room === room);
}

function getAllActiveRooms() {
    return Array.from(new Set(UsersState.users.map((user) => user.room)));
}
