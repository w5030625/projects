let stompClient = null;
let currentUserId = null;  // 改為從伺服器端取得當前登入的用戶ID
let currentChatroomId = null;

// WebSocket 連接
function connectWebSocket() {
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.connect({}, function(frame) {
        console.log('Connected: ' + frame);
        loadChatRooms();
    });
}

// 初始化時先取得當前用戶ID
async function getCurrentUserId() {
    try {
      const response = await fetch('/api/chat/current-user');
      const data = await response.json();
      currentUserId = data.userId;
      connectWebSocket(); // 取得ID後再連接WebSocket
    } catch (error) {
      console.error('Error getting current user:', error);
    }
}

// 載入聊天室列表
async function loadChatRooms() {
    try {
        const response = await fetch(`/api/chat/rooms/${currentUserId}`);
        const chatrooms = await response.json();
        displayChatRooms(chatrooms);
    } catch (error) {
        console.error('Error loading chatrooms:', error);
    }
}

// 顯示聊天室列表
async function displayChatRooms(chatrooms) {
    const friendsList = document.getElementById('friendsList');
    friendsList.innerHTML = '';

    for (const room of chatrooms) {
        const otherUserId = room.membera === currentUserId ? room.memberb : room.membera;
        const otherUser = await fetchUserInfo(otherUserId);
        
        const friendItem = document.createElement('div');
        friendItem.className = 'friend-item';
        friendItem.onclick = () => selectChatRoom(room.chatroomid, otherUser);

        const avatar = document.createElement('div');
        avatar.className = 'friend-avatar';
        avatar.textContent = otherUser.membername.charAt(0).toUpperCase();

        const nameDiv = document.createElement('div');
        nameDiv.textContent = otherUser.membername;

        friendItem.appendChild(avatar);
        friendItem.appendChild(nameDiv);
        friendsList.appendChild(friendItem);
    }
}

// 獲取使用者資訊
async function fetchUserInfo(userId) {
    try {
        const response = await fetch(`/api/member/${userId}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching user info:', error);
        return { membername: 'Unknown User' };
    }
}

// 選擇聊天室
async function selectChatRoom(chatroomId, otherUser) {
    if (currentChatroomId) {
        stompClient.unsubscribe(`sub-${currentChatroomId}`);
    }

    currentChatroomId = chatroomId;
    
    // 更新聊天室標題
    document.getElementById('chatName').textContent = otherUser.membername;
    document.getElementById('chatAvatar').textContent = otherUser.membername.charAt(0).toUpperCase();

    // 訂閱新的聊天室
    stompClient.subscribe(`/topic/messages/${chatroomId}`, onMessageReceived, { id: `sub-${chatroomId}` });
    
    // 載入歷史訊息
    loadChatHistory(chatroomId);
}

// 載入聊天記錄
async function loadChatHistory(chatroomId) {
    try {
        const response = await fetch(`/api/chat/history/${chatroomId}`);
        const messages = await response.json();
        displayChatHistory(messages);
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

// 顯示聊天記錄
function displayChatHistory(messages) {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
    messages.forEach(message => {
        displayMessage(message);
    });
    scrollToBottom();
}

// 接收新訊息
function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);
    displayMessage(message);
    scrollToBottom();
}

// 顯示訊息
function displayMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.senderid === currentUserId ? 'sent' : 'received'}`;
    
    // 訊息內容
    messageDiv.textContent = message.roommessage;
    
    // 時間戳
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = formatTime(message.inputtime);
    messageDiv.appendChild(timeDiv);

    chatMessages.appendChild(messageDiv);
}

// 格式化時間
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-TW', { 
        hour: '2-digit', 
        minute: '2-digit'
    });
}

// 發送訊息
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (message && currentChatroomId) {
        const chatMessage = {
            chatroomid: currentChatroomId,
            senderid: currentUserId,
            roommessage: message
        };
        
        stompClient.send("/app/chat/" + currentChatroomId, {}, JSON.stringify(chatMessage));
        messageInput.value = '';
    }
}

// Enter 鍵發送訊息
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// 滾動到最底部
function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 修改初始化部分
document.addEventListener('DOMContentLoaded', function() {
    getCurrentUserId();
});