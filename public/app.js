const socket = io('ws://localhost:3500');

const msgInput = document.querySelector('#message');
const nameInput = document.querySelector('#name');
const chatRoom = document.querySelector('#room');
const activity = document.querySelector('.activity');
const usersList = document.querySelector('.user-list');
const roomList = document.querySelector('.room-list');
const chatDisplay = document.querySelector('.chat-display');
const privateUserSelect = document.querySelector('#privateUser');
const privateMessageInput = document.querySelector('#privateMessage');
const sendPrivateButton = document.querySelector('#sendPrivate');

function sendMessage(e) {
    e.preventDefault();
    if (nameInput.value && msgInput.value && chatRoom.value) {
        socket.emit('message', {
            name: nameInput.value,
            text: msgInput.value,
        });
        msgInput.value = '';
    }
    msgInput.focus();
}

function enterRoom(e) {
    e.preventDefault();
    if (nameInput.value && chatRoom.value) {
        socket.emit('enterRoom', {
            name: nameInput.value,
            room: chatRoom.value,
        });
    }
}

function sendPrivateMessage(e) {
    e.preventDefault();
    const targetUserId = privateUserSelect.value;
    const targetUserName = privateUserSelect.options[privateUserSelect.selectedIndex].text;
    const messageText = privateMessageInput.value;

    if (targetUserId && messageText) {
        socket.emit('privateMessage', {
            targetUserId,
            targetUserName,
            text: messageText,
        });

        const li = document.createElement('li');
        li.innerHTML = `<div class="post post--private">
            <span class="post__header--name">${nameInput.value} (Private to ${targetUserName})</span> 
            <span class="post__header--time">${getCurrentTime()}</span> 
            <div class="post__text">${messageText}</div>
        </div>`;
        chatDisplay.appendChild(li);

        privateMessageInput.value = '';
    }
}

function getCurrentTime() {
    return new Intl.DateTimeFormat('default', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
    }).format(new Date());
}

msgInput.addEventListener('keypress', () => {
    socket.emit('activity', nameInput.value);
});

socket.on('message', (data) => {
    activity.textContent = '';
    const { name, text, time } = data;
    const li = document.createElement('li');
    li.className = 'post';
    if (name === nameInput.value) li.className = 'post post--left';
    if (name !== nameInput.value && name !== 'Admin') li.className = 'post post--right';
    if (name !== 'Admin') {
        li.innerHTML = `<div class="post__header ${name === nameInput.value ? 'post__header--user' : 'post__header--reply'
            }">
        <span class="post__header--name">${name}</span> 
        <span class="post__header--time">${time}</span> 
        </div>
        <div class="post__text">${text}</div>`;
    } else {
        li.innerHTML = `<div class="post__text">${text}</div>`;
    }
    chatDisplay.appendChild(li);

    chatDisplay.scrollTop = chatDisplay.scrollHeight;
});

let activityTimer;
socket.on('activity', (name) => {
    activity.textContent = `${name} is typing...`;

    clearTimeout(activityTimer);
    activityTimer = setTimeout(() => {
        activity.textContent = '';
    }, 3000);
});

socket.on('userList', ({ users }) => {
    showUsers(users);
    populatePrivateUserList(users);
});

socket.on('privateMessage', ({ senderName, text }) => {
    const li = document.createElement('li');
    li.innerHTML = `<div class="post post--private">
        <span class="post__header--name">${senderName} (Private)</span> 
        <span class="post__header--time">${getCurrentTime()}</span> 
        <div class="post__text">${text}</div>
    </div>`;
    chatDisplay.appendChild(li);
});

socket.on('roomList', ({ rooms }) => {
    showRooms(rooms);
});

document.querySelector('.form-msg').addEventListener('submit', sendMessage);
document.querySelector('.form-join').addEventListener('submit', enterRoom);
document.querySelector('.form-private-msg').addEventListener('submit', sendPrivateMessage);
sendPrivateButton.addEventListener('click', sendPrivateMessage);

function showUsers(users) {
    usersList.textContent = '';
    if (users) {
        usersList.innerHTML = `<em>Users in ${chatRoom.value}:</em>`;
        users.forEach((user, i) => {
            usersList.textContent += ` ${user.name}`;
            if (users.length > 1 && i !== users.length - 1) {
                usersList.textContent += ',';
            }
        });
    }
}

function showRooms(rooms) {
    roomList.textContent = '';
    if (rooms) {
        roomList.innerHTML = '<em>Active Rooms:</em>';
        rooms.forEach((room, i) => {
            roomList.textContent += ` ${room}`;
            if (rooms.length > 1 && i !== rooms.length - 1) {
                roomList.textContent += ',';
            }
        });
    }
}

function populatePrivateUserList(users) {
    privateUserSelect.innerHTML = '';
    users.forEach((user) => {
        if (user.id !== socket.id) {
            const option = document.createElement('option');
            option.value = user.id;
            option.text = user.name;
            privateUserSelect.add(option);
        }
    });
}
