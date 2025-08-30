let currectUserEmail = null;
let selectedUser = null;
let savedUsers = [];
 let originalTitle = '';
let hasFocus = true;
const socket = io();

function loadSavedUsers(email) {
    const key = `savedUsers_${email}`;
    return JSON.parse(localStorage.getItem(key)) || [];
}
function saveUsers(email,users) {
     const key = `savedUsers_${email}`;
     localStorage.setItem(key, JSON.stringify(users));
}
async function loadUsers() {
    if(currectUserEmail === 'adminkarl') {
        const res = await fetch('/users');
        if(!res.ok) return;
        const users = await res.json();
        renderUserList(users);
    }
    else {
        renderUserList(savedUsers);
    }
}
function renderUserList(users) {
    const userList = document.getElementById('chat-users');
    userList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.className = `p-2 rounded cursor-pointer transition ${user === selectedUser ? 
            'bg-blue-100 dark:bg-gray-700 font-bold text-blue-700 dark:text-white' : 
            'hover:bg-gray-100 dark:hover:bg-gray-800'}`;
        li.textContent = user === selectedUser ? `💬 <strong>${user}</strong>`: user;
        li.addEventListener('click', () => {
            selectedUser = user;
            if(!savedUsers.includes(user) && currectUserEmail !== 'adminkarl') {
                savedUsers.push(user);
                renderUserList(savedUsers);
                saveUsers(currectUserEmail, savedUsers);

            }
            loadChat(user);
            updateChatHeader(user);
        });
        userList.appendChild(li);
    });
}
async function loadChat(login) {
    const res = await fetch(`/chat/${login}`);
    if(!res.ok) return;

    const messages = await res.json();
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = '';
    let lastDate = null;
    messages.forEach(msg => {
        const isUnread = msg.read === false && msg.to === currectUserEmail;
       const isOwn = msg.from === currectUserEmail;
        const sender = msg.from === currectUserEmail? 'You' : msg.from;
        const msgDate = new Date(msg.time);
        const msgDay = msgDate.toDateString();
        if(msgDay !== lastDate) {
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate()-1);
            let label = msgDay;
            if(msgDate.toDateString() === today.toDateString()) {
                label = 'Today';
            }
            else if(msgDate.toDateString() === yesterday.toDateString()) {
                label = 'Yesterday';
            }
            else {
                label = msgDate.toLocaleDateString();
            }
            const datelabel = document.createElement('div');
            datelabel.className = 'text-center text-xs text-gray-500 mb-2 mt-4';
            datelabel.textContent = label;
            chatBox.appendChild(datelabel);

            lastDate = msgDay;
        }
        const li = document.createElement('li');
        li.dataset.text = msg.text;
        li.className = `flex flex-col group ${isOwn ? 'items-end' : 'items-start'} mb-2`;
        li.dataset.time = msg.time;
        li.classList.add('animate-scale');
        const avatarUrl = isOwn
        ? document.getElementById('avatar-img')?.src
        : `/avatar/${msg.from}`;
        const bubble = document.createElement('div');
        bubble.className = `max-w-[85%] px-4 py-2 rounded-xl shadow relative transition-all duration-300 ${isOwn
            ? 'bg-gradient-to-br from-blue-600 to-cyan-500 text-white' : 
            'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
        }`;
        const controls = 
        `<div class = "absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition flex gap-1">
        ${isOwn ? 
         ` <button class = "px-1 py-0.5 text-[10px] leading-none text-xs text-white edit-chat-msg mr-1">✎</button>
        <button class = " px-1 py-0.5 text-[10px] leading-none text-xs text-red-200 delete-chat-msg mr-1">🗑</button>` 
        : ''
        }
        <button class = " px-1 py-0.5 text-[10px] leading-none text-xs text-yellow-400 reply-chat-msg">💬</button>
        </div>`;
      
        const status = isOwn
        ? (msg.read ? '✔✔' : '✔')
        : '';
        bubble.innerHTML = `<div class = "flex items-center gap-2 mb-1">
        <img src = "${avatarUrl}" data-user = "${msg.from}" class = "chat-avatar w-6 h-6 rounded-full border border-gray-300 cursor-pointer">
        <strong class = "chat-nick text-sm text-blue-600 hover:underline cursor-pointer" data-user = "${msg.from}">${sender}</strong>
        </div>
        <div class = "text-sm">${msg.text}</div>
        <div class = "text-xs opacity-70 mt-1 text-right">${new Date(msg.time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} ${status}</div>
        ${controls}
        <div class = "mt-1 flex items-center gap-2 text-xs reaction-bar hidden group-hover:flex">
        <button class = "add-reaction text-gray-500 hover:text-yellow-500">➕</button>
        </div>
        `;
        li.appendChild(bubble);
        chatBox.appendChild(li);
        if(msg.reactions?.length) {
            const reactionWrap = document.createElement('div');
            reactionWrap.className = 'flex gap-1 mt-1 text-xl';
            msg.reactions.forEach(r => {
                const span = document.createElement('span');
                span.textContent = r.emoji;
                span.title = r.by;
                reactionWrap.appendChild(span);
            });
            bubble.appendChild(reactionWrap);
        }
    });
    await fetch(`/chat/${selectedUser}/mark-read` , {method : 'POST'});
    socket.emit('mark-read',{
        from:login,
        to:currectUserEmail
    });
}
async function loadProfile(){
    const res = await fetch("/api/profile");
    const info = document.getElementById("profile-info");
    if(res.ok){
        const data = await res.json();
        document.getElementById('profile-email').textContent = data.email;
        document.getElementById('profile-coins').textContent = `🪙${data.coins} NestCoins`;
        currectUserEmail = data.email;
        if(currectUserEmail === 'adminkarl'){
            document.getElementById('generate-ai-btn')?.classList.remove('hidden');
        }
        socket.emit('join', currectUserEmail);
         savedUsers = loadSavedUsers(currectUserEmail);
         try {
         const fRes = await fetch(`/followers/${data.email}`);
    const fData = await fRes.json();
    const followEl = document.getElementById('menu-follow-count');
    if (followEl) {
        followEl.textContent = `↑ ${fData.followers} ↓ ${fData.following}`;
    }
}
    catch (err) {
        console.error("Error loading follow data", err);
    }

        loadPosts();
        loadMessages();
        loadUsers();
    
    try {
        const avatarRes = await fetch(`/avatar/${data.email}`);
        if(avatarRes.ok) {
            const blob = await avatarRes.blob();
            const imgUrl = URL.createObjectURL(blob);
            const img = document.getElementById('avatar-img');
            img.src = imgUrl;
            img.classList.remove('hidden');
            const menuImg = document.getElementById('menu-avatar');
            if (menuImg) menuImg.src = imgUrl;
           
        } 
        else {
            console.warn('No awatar found');
        }
    }
    catch(e) {
        console.error("Avatar fetch error",e)
    }
} 
else {
    info.textContent = "You are not signed in";
    
}
    
}
async function loadMessages(){
    const res = await fetch("/messages");
    const list = document.getElementById("messages");
    list.innerHTML = '';

    const data = await res.json();

    data.forEach( msg =>{
        const li = document.createElement('li');
        li.className = "bg-white dark:bg-gray-800 p-3 rounded shadow";
        let delBtn = '';
    if(currectUserEmail === 'adminkarl') {
        delBtn = `<button data-time = "${msg.time}" class = "text-red-600 text-xs float-right delete-msg hover:underline">🗑 Delete</button>`;
    }
        li.innerHTML = `${delBtn} <strong>${msg.from}</strong> ➜ <em>${msg.to}</em> <br> ${msg.text}<br> <small> ${new Date(msg.time).toLocaleString()} </small>`;
        list.appendChild(li);
    });
}
function updateChatHeader(user) {
    if(!user || user === currectUserEmail) {
        document.getElementById('chat-header').classList.add('hidden');
        return;

    }
    const avatarEl = document.getElementById('chat-header-avatar');
    const nameEl = document.getElementById('chat-header-name');
    avatarEl.src = `/avatar/${user}`;
    nameEl.textContent = user;
    document.getElementById('chat-header').classList.remove('hidden');
    avatarEl.onclick = () => {
        const preview = document.getElementById('avatar-preview');
        const modal = document.getElementById('avatar-modal');
        preview.src = `/avatar/${user}`;
        modal.classList.remove('hidden');
    };
    nameEl.onclick = () => showProfile(user);
}
async function loadPosts(){
    const res = await fetch('/posts');
    const posts = await res.json();
    const list = document.getElementById('post-list');
    list.innerHTML = '';
        console.log(posts);
posts.reverse().forEach(post => {
const li = document.createElement("li");
li.className = 'post-card relative bg-white/80 dark:bg-gray-800/70 border border-gray-200 rounded-2xl shadow-md hover:shadow-2xl transition transform hover:-translate-y-1 hover:scale-[1.02] backdrop-blur-md p-6 mb-6';
let delBtn = '';
if(currectUserEmail === 'adminkarl') {
        delBtn = `<button data-id = "${post.id}" class = "text-red-600 text-xs float-right delete-post hover:underline">🗑 Delete</button>`;
    }
    let commentsHTML = '';
    if(post.comments?.length) {
        commentsHTML = `<div class = "mt-3 space-y-2">`;
        post.comments.forEach(c => {
            commentsHTML += `<p class = "text-sm text-gray-700 dark:text-gray-300"><strong>${c.author}</strong> : ${c.text}</p>`;
        });
        commentsHTML += `</div>`;
    }
    const commentForm = `<div class = "mt-3">
    <input type = "text" class = "comment-input border p-2 text-sm w-full rounded-lg focus:outline:none focus:ring-2 focus:ring-blue-400" data-id = "${post.id}" placeholder = "Write a comment">
    <button class = "submit-comment text-blue-600 text-xs mt-2" data-id = "${post.id}">💬 Comment </button>
    <div class = "comment-msg text-xs text-red-500" id = "comment-msg-${post.id}"</div>
    `;
li.innerHTML = `${delBtn} <h3 class = "text-lg font-bold">${post.title}</h3> <p class = "text-sm text-gray-700 mb-2 dark:text-gray-200">${post.content.replace(/\n/g, '<br>')}</p> 
    ${post.image ? `<img src = "${post.image}" class = "w-full rounded shadow mb-3">` : ''}
    ${post.imageUrl ? `<img src = "${post.imageUrl}" class = "w-full rounded mb-3">` : ''}
    <div class = "text-xs text-gray-500 dark:text-gray-400"> Author: ${post.author} • ${new Date(post.timestamp).toLocaleString()} </div>
    ${commentsHTML}
    ${commentForm}
    `;
const likeSection = document.createElement('div');
likeSection.className = 'text-sm text-gray-600 flex items-center gap-2 mt-2';
likeSection.innerHTML = `<button class = "like-btn text-green-600" data-id = "${post.id}">👍${post.likes?.length || 0}</button>
<button class = "dislike-btn text-red-600" data-id = "${post.id}">👎 ${post.dislikes?.length || 0}</button>`;

if(post.wallet && /^0x[a-fA-F0-9]{40}$/.test(post.wallet)) {
    const tipBtn = document.createElement('button');
    tipBtn.className = 'tip-btn text-yellow-500 text-xs underline';
    tipBtn.dataset.wallet = post.wallet;
    tipBtn.textContent = '💰 Send Tip';
    tipBtn.addEventListener('click', async () => {
        if(typeof window.ethereum === 'undefined') {
            alert('Wallet is not installed');
            return;
        }
        const to = tipBtn.dataset.wallet;
        const amountEth = '0.0001';
        if(!/^0x[a-fA-F0-9]{40}$/.test(to)) {
            console.error('[Wallet Error] Invalid ETH adress, to');
            alert('Invalid wallet adress');
        }
        try {
            const accounts = await window.ethereum.request({method:"eth_requestAccounts"});
            const sender = accounts[0];
            const tx = {
                from:sender,
                to,
                value: (BigInt(parseFloat(amountEth*1e18))).toString(16),
            };
            await window.ethereum.request({
                method: 'eth_sendTransaction',
                params:[tx],
            });
            alert('Tip sent!');
        }
        catch(err) {
            console.error(err);
            console.log("Transaction failed");
        }
    });
    likeSection.appendChild(tipBtn);
}
li.appendChild(likeSection);
list.appendChild(li);
});

}
async function showProfile(email) {

    const modal = document.getElementById('view-profile-modal');
    modal.classList.remove('hidden');
       
   
    try {
        const res = await fetch(`/profile/${email}`);
        if(!res.ok) throw new Error("Profile fetch failed");
        const data = await res.json();
        const profileHeader = document.getElementById('profile-header');
    profileHeader.className = 'relative w-full h-32 bg-gray-200 rounded overflow-hidden mb-4';
    if (data.header) {
        profileHeader.innerHTML = `<img src = "${data.header}" alt = "header" class = "object-cover w-full h-full rounded">`;
    }
       document.getElementById('view-avatar').src = `/avatar/${email}`;
   
   document.getElementById('view-email').textContent = data.nickname || email;
   document.getElementById('view-email').dataset.email = email;
   document.getElementById('view-bio').textContent = data.bio || 'No bio yet';
   document.getElementById('view-location').textContent = data.location || '';


         const followersBlock = document.getElementById('followers-block');
         
         followersBlock.innerHTML = `<h3 class = "font-bold text-sm mb-1">Followers</h3>`;
         const uniqueFollowers = [... new Set(data.followers || [])].filter(f => f !== email);

         if(uniqueFollowers.length) {
            const ul = document.createElement('ul');
            ul.className = `text-sm text-blue-600 space-y-1`;
            uniqueFollowers.forEach(f => {
                const li = document.createElement('li');
                li.className = 'cursor-pointer hover:underline';
                li.textContent = f;
                li.addEventListener('click', () => showProfile(f));
                ul.appendChild(li);
            });
            followersBlock.appendChild(ul);
         }
         else {
            followersBlock.insertAdjacentHTML('beforeend',`<p class = "text-gray-500 text-sm">No followers yet.</p>`);
         }


         const followingBlock = document.getElementById('following-block');
          followingBlock.innerHTML = `<h3 class = "font-bold text-sm mb-1">Following</h3>`;
         
         
         const uniqueFollowing = [... new Set(data.following || [])].filter(f => f !== email);
         if(uniqueFollowing.length) {
            const ul = document.createElement('ul');
            ul.className = `text-sm text-blue-600 space-y-1`;
            uniqueFollowing.forEach(f => {
                const li = document.createElement('li');
                li.className = 'cursor-pointer hover:underline';
                li.textContent = f;
                li.addEventListener('click', () => showProfile(f));
                ul.appendChild(li);
            });
            followingBlock.appendChild(ul);
         }
         else {
            followingBlock.insertAdjacentHTML('beforeend',`<p class = "text-gray-500 text-sm">No following anyone yet.</p>`);
         }
       const followBtn = document.getElementById('profile-follow-btn'); 
   if(email !== currectUserEmail) {    
   followBtn.textContent = data.followers?.includes(currectUserEmail) ? "Unfollow" : "Follow";
    followBtn.onclick = async() => {
         const isCurrentlyFollowing = followBtn.textContent === "Unfollow";
    const endPoint = isCurrentlyFollowing? '/unfollow' : '/follow';
    const res = await fetch (`${endPoint}/${email}`, {method: 'POST'});
     if(res.ok) {
        followBtn.textContent =  isCurrentlyFollowing ? 'Follow' : 'Unfollow';
        const fRes = await fetch(`/followers/${email}`);
        const fData = await fRes.json();
        document.getElementById('menu-follow-count').textContent =  `↑ ${fData.followers} ↓ ${fData.following}`;
        
        
            
        try {
            const ownRes = await fetch(`/followers/${currectUserEmail}`);
            const ownData = await ownRes.json();
            document.getElementById('menu-follow-count').textContent = `↑ ${ownData.followers} ↓ ${ownData.following}`;
        }
        
        catch(e) {
            console.error('Failed to update followers and follwoing data', e);
        }
        showProfile(email);
        }
    };
    followBtn.classList.remove('hidden');
   }
   else {
    followBtn.classList.add('hidden');
   }


    const postsList = document.getElementById('profile-posts');
    postsList.innerHTML = '';
    const msgCon = document.getElementById('profile-messages');
    msgCon.innerHTML = '';
    if(data.posts?.length) {
        data.posts.forEach(post => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${post.title}</strong><br><small>${new Date(post.timestamp).toLocaleString()}`;
        
            postsList.appendChild(li);
        });

    }
    else {
        postsList.innerHTML = `<li> No posts yet.</li>`
    }
    const messagesList = document.getElementById('profile-messages');
    messagesList.innerHTML = '';
    const publicMsgs = data.messages || [];
    

    if(publicMsgs.length) {
        publicMsgs.forEach(msg => {
            const li = document.createElement('li');
            li.innerHTML = `<strong> To: ${msg.to}</strong> <br>${msg.text}<br><small>${new Date(msg.time).toLocaleString()}</small>`;
                
            messagesList.appendChild(li);
        });
    }
    else {
        messagesList.innerHTML = '<li> No public messages.</li>';
    }
    
    }
    catch(err) {
        console.error(err);
    }
    const openTransferBtn = document.getElementById('open-transfer');
    if(openTransferBtn) {
        openTransferBtn.dataset.email = email;
    }
}
document.getElementById('create-post').addEventListener('click', async() => {
const title = document.getElementById('post-title').value.trim();
const content = document.getElementById('post-content').value.trim();
const msg = document.getElementById('post-response');
const imageInput = document.getElementById("post-image");   


if(!title || !content) {
    msg.textContent = "Write title and text.";
    return;
}
const formData = new FormData();
formData.append('title',title);
formData.append('content',content);
if(imageInput.files[0]) {
    formData.append('image',imageInput.files[0]);
}
const res = await fetch('/posts', {
    method:'POST',
    body: formData
});

const data = await res.json();
msg.textContent = data.message || 'Error';
if(res.ok) {
    document.getElementById('post-title').value = '';
    document.getElementById('post-content').value = '';
    loadPosts();
}
});
loadPosts();
document.getElementById('send').addEventListener('click', async() => {
    const to = document.getElementById('to').value.trim();
    const text = document.getElementById('text').value.trim();
    const response = document.getElementById('response');

    if(!to || !text){
        response.textContent = "Please enter recipient and message. ";
        return;
    }
    const res = await fetch('/messages',{
        method:'POST',
        headers:{'Content-Type' : 'application/json'},
        body: JSON.stringify({to , text})
    });
    const data = await res.json();
    response.textContent = data.message;
    
    if(res.ok){
        document.getElementById('text').value = '';
        loadMessages();
    }
});

document.addEventListener('click', async(e) => {
    if(e.target.classList.contains('like-btn')) {
        const id = e.target.dataset.id;
        const res = await fetch(`/posts/${id}/like`, {method : 'POST'});
        const data = await res.json();
        if(res.ok) loadPosts();
    }
    if(e.target.classList.contains('dislike-btn')) {
        const id = e.target.dataset.id;
        const res = await fetch(`/posts/${id}/dislike`, {method : 'POST'});
        const data = await res.json();
        if(res.ok) loadPosts();
    }
    if(e.target.classList.contains('close-modal')){
        e.target.closest('div.fixed').remove();
    }
    if(e.target.classList.contains('submit-comment')) {
        const id = e.target.dataset.id;
        const input = document.querySelector(`input.comment-input[data-id = "${id}"]`);
        const msg = document.getElementById(`comment-msg-${id}`);
        const text = input?.value.trim();

        if(!text) {
            msg.textContent = "Comment can not be empty!";
            return;
        }
        const res = await fetch(`/posts/${id}/comments`, {
            method: 'POST',
            headers : {'Content-Type': 'application/json'},
            body: JSON.stringify({text})
        });
        const data = await res.json();
        if(res.ok) {
            input.value = '';
            msg.textContent = '';
            loadPosts();
        }
        else {
            msg.textContent = data.message || "Error adding a comment.";
        }
    }
    if(e.target.classList.contains('delete-post')) {
        const id = e.target.dataset.id;
        if(confirm("Delete this post?")){
            const res = await fetch(`/posts/${id}`, {method:'DELETE'});
            if (res.ok) loadPosts();
        }
    }

    if(e.target.classList.contains('delete-msg')) {
        const time = e.target.dataset.time;
        if(confirm("Delete this message?")){
            const res = await fetch(`/messages/${time}`, {method:'DELETE'});
            if (res.ok) loadMessages();
        }
    }
});

document.getElementById('logout').addEventListener('click',async() => {
await fetch('/logout' , {method:'POST'});
location.href = '/';
});

document.getElementById('send-chat').addEventListener('click', async() => {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if(!text || !selectedUser) return;

    const res = await fetch(`/chat/${selectedUser}`,{
        method : 'POST' ,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text})
    });
    if(res.ok) {
        input.value = '';
        loadChat(selectedUser);
        socket.emit('private message',{
            from:currectUserEmail,
            to: selectedUser

        });
    }
});


document.getElementById('user-search')?.addEventListener('keypress', async(e) => {
    if(e.key === 'Enter') {
        const login = e.target.value.trim();
        if(!login || login === currectUserEmail) return;
        try {
            const res = await fetch('/users');
            const allUsers = await res.json();
            if(allUsers.includes(login)) {
                selectedUser = login;
                if(!savedUsers.includes(login)) {
                    savedUsers.push(login);
                    saveUsers(currectUserEmail, savedUsers);
                    renderUserList(savedUsers);
                }
                loadChat(login);
                e.target.value = '';
            }
            else {
                alert("User not found!");
            }
        }
        catch(err) {
            console.error("User search failed" ,err)
        }
    }
});
socket.on('online-users' ,(users) => {
    if(currectUserEmail === 'adminkarl'){
        const list = document.getElementById('online-users');
        list.innerHTML = '';
        users.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user;
            list.appendChild(li);
        });
    }    
});
socket.on('new-private-message' ,({from}) => {

    const sound = document.getElementById('notif-sound');
    if (from === selectedUser) {
        loadChat(from);

    }
    else {
        alert(`New message from ${from}`);
        if(sound) sound.play().catch(()=> {});
        if(!hasFocus) {
            document.title = `💬 New message from ${from}`;
        }
    }
});
const themeBtn = document.getElementById('theme-toggle-btn');
const themeMenu = document.getElementById('theme-options');
themeBtn?.addEventListener('mouseenter', ()=> {
    themeMenu.classList.remove('hidden');
});
themeBtn?.addEventListener('mouseleave', () => {
    setTimeout(()=> {
        if(!themeMenu.matches(':hover')) {
            themeMenu.classList.add('hidden');
        }
    },150);
});
themeMenu?.addEventListener('mouseleave', () => {
    themeMenu.classList.add('hidden');
});

document.querySelectorAll('#theme-options button').forEach(btn => {
    btn.addEventListener('click', async(e) => {
        const selected = btn.dataset.theme;
        const html = document.documentElement;

        if(selected === 'barbie' || selected === 'cyberpunk' || selected === 'matrix' || selected === 'sunset') {
        const res = await fetch('/api/profile');
        const user = await res.json();
        if(!user.unlockedThemes?.includes(selected) && user.email !== 'adminkarl') {
            alert('This theme is locked. Buy it from shop');
            return;
        }
    }
    localStorage.setItem('theme', selected);
    setTimeout(() => {
        const html = document.documentElement;
        const body = document.body;
        html.classList.remove('dark');
        body.classList.remove('cyberpunk-theme', 'barbie-theme', 'dark', 'matrix-theme', 'sunset-theme');

        if(selected === 'cyberpunk') {
        html.classList.add('dark');
        body.classList.add('cyberpunk-theme');

    }
        else if(selected === 'barbie') {
        body.classList.add('barbie-theme');
    }
    else if(selected === 'matrix') {
        html.classList.add('dark');
        body.classList.add('matrix-theme');
    }
    else if(selected === 'sunset') {
        body.classList.add('sunset-theme');
    }
        else if(selected === 'dark') {
        html.classList.add('dark');
        body.classList.add('dark');
    }
    

    },50);
    });
});
window.addEventListener('DOMContentLoaded', () => {
    (async function loadLeaderboard() {
        try {
            const res = await fetch('/leaderboard');
            if(!res.ok) throw new Error('Failed to load leaderboard');
            const data = await res.json();
            const list = document.getElementById('leaderboard-list');
            list.innerHTML = '';
            if(!data.length) {
                list.innerHTML = `<li class = 'text-gray-500'>No data </li>`;
                return;
            }
            data.forEach((user, index) => {
                const li = document.createElement('li');
                li.innerHTML = `<span class = 'font-bold'>${index + 1}.</span> ${user.email} - 🪙${user.coins}`;
                list.appendChild(li);
            });
        }
        catch(err) {
            console.error(err);
            document.getElementById('leaderboard-list').innerHTML = `<li class = 'text-red-500'> Error loading</li>`;
        }
    })();
    document.getElementById('expand-chat')?.addEventListener('click', () => {
    const chatSection = document.querySelector('section.col-span-4, section.col-span-10');
    const postsSection = document.getElementById('posts-section');
    const btn = document.getElementById('expand-chat');
    const body = document.body;
    const isExpanded = chatSection.classList.contains('col-span-10');   
    if(isExpanded) {
        chatSection.classList.remove('col-span-10');
        chatSection.classList.add('col-span-4');
        postsSection.classList.remove('hidden');
        document.getElementById('chat-box-wrapper').style.height = '50vh';
        body.classList.remove('expanded-chat');
        btn.textContent = '🖥 Expand';
    }
    else {
        chatSection.classList.remove('col-span-4');
        chatSection.classList.add('col-span-10');
        postsSection.classList.add('hidden');
        document.getElementById('chat-box-wrapper').style.height = 'calc(100vh - 10rem)';
        body.classList.add('expanded-chat');
         btn.textContent =  '🔙 Collapse';
    }
});
        
    (async () => {

const res = await fetch('/api/profile');
if(!res.ok) return;
const loginBtn = document.getElementById('login');
if(loginBtn && registerBtn) {
    loginBtn.classList.add('hidden');
    registerBtn.classList.add('hidden');
    
}
const data = await res.json();
if(data?.avatar) {
    document.getElementById('menu-avatar').src = data.avatar + '?t=' + Date.now();
}
else {
    document.getElementById('menu-avatar').src = 'default.png';
}
    

})();
    document.getElementById('upload-btn')?.addEventListener('click', () => {
    document.getElementById('avatar-upload')?.click();
});

    document.title = originalTitle;

    let cropper = null;
document.getElementById('avatar-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const url = URL.createObjectURL(file);
    const img = document.getElementById('cropper-image');
    img.src = url;
    document.getElementById('cropper-modal').classList.remove('hidden');

    setTimeout(()=> {
        if(cropper) cropper.destroy();
        cropper = new Cropper(img, {
            aspectRatio:1,
            viewMode:1,
            dragMode: 'move',
            background:false,
            zoomOnWheel:true,
        });
    },100);
});
document.getElementById('crop-cancel').addEventListener('click' , () => {
    document.getElementById('cropper-modal').classList.add('hidden');
    cropper?.destroy();
    cropper = null;
    document.getElementById('avatar-upload').value = '';
});
document.getElementById('crop-confirm').addEventListener('click', async() => {
    if(!cropper) return;
    const canvas = cropper.getCroppedCanvas({
    width:300,
    height:300

    });
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
    const formData = new FormData();
    formData.append('avatar', blob, 'avatar.jpg');
    const res = await fetch('/upload-avatar',{
        method: 'POST',
        body:formData

    });
    const data = await res.json();
    if(res.ok && data.avatar) {
        const img = document.getElementById('avatar-img');
        img.src = data.avatar + '?t=' + Date.now();
        img.classList.remove('hidden');

        const menuImg = document.getElementById('menu-avatar');
        if(menuImg) menuImg.src = data.avatar + '?t=' + Date.now();
    }
    document.getElementById('cropper-modal').classList.add('hidden');
    cropper?.destroy();
    cropper = null;
    document.getElementById('avatar-upload').value = '';


});
});

window.addEventListener('focus', () => {
    hasFocus = true;
    document.title = originalTitle;
});
window.addEventListener('blur',()=>{
    hasFocus = false;
});
socket.on('messages-mark-read',({from}) => {
    if(from === selectedUser){
        loadChat(from);
    }
});
document.getElementById('chat-box').addEventListener('click', async(e) => {
    const li = e.target.closest('li');
    const time = li?.dataset.time;
    if (e.target.classList.contains('reply-chat-msg')) {
        const li = e.target.closest('li');
        const originalText = li?.dataset.text || '';
        const replyInput = document.getElementById('chat-input');
        if(replyInput) {
            replyInput.value = `> ${originalText}\n`;
            replyInput.focus();
        }
    }
    if(e.target.classList.contains('add-reaction')) {
        const bar = e.target.closest('.reaction-bar');
        bar.innerHTML = `
        <button class = "reaction-btn">😄</button>
        <button class = "reaction-btn">❤️</button>
        <button class = "reaction-btn">🔥</button>
        <button class = "reaction-btn">💩</button>`;    
    }
    if(e.target.classList.contains('reaction-btn')) {
        const emoji = e.target.textContent;
        const li = e.target.closest('li');
        const bar = li.querySelector('.reaction-bar');
        const time = li.dataset.time;
        try {
            await fetch(`/chat/${selectedUser}/${encodeURIComponent(time)}/react`, {
                method: 'POST',
                headers: {'Content-Type' : 'application/json'},
                body:JSON.stringify({emoji}),
            });
        }
        catch(err) {
            console.error('Failed to save reactions', err);
        }
        bar.innerHTML = `<span class = "text-xl">${emoji}</span>`;
    }
    if(e.target.classList.contains('delete-chat-msg')) {
        if(confirm("Delete this message?")) {
            const encodedTime = encodeURIComponent(time);
            const res = await fetch(`/chat/${selectedUser}/${encodeURIComponent(time)}`, {method :'DELETE'});
            if(!res.ok) {
                console.log("Error 501");
            }
            if(res.ok) loadChat(selectedUser);
        }
    }
    if(e.target.classList.contains("edit-chat-msg")) {
        const oldText = li.dataset.text || '';
        const newText = prompt("Edit your message:", oldText);
        if(newText && newText.trim()) {
            const res = await fetch(`/chat/${selectedUser}/${time}`, {
                method:'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({text:newText})
            });
            if(res.ok) loadChat(selectedUser);
        }
    }
});

document.getElementById('menu-avatar').addEventListener('click', ()=> {
    const avatarSrc = document.getElementById('menu-avatar').src;
    const modal = document.getElementById('avatar-modal');
    const preview = document.getElementById('avatar-preview');
    preview.src = avatarSrc;
    modal.classList.remove('hidden');
});
document.getElementById('close-avatar').addEventListener('click', () => {
    document.getElementById('avatar-modal').classList.add('hidden');
});

document.getElementById('avatar-modal').addEventListener('click', (e) => {
    if(e.target.id === 'avatar-modal'){
        document.getElementById('avatar-modal').classList.add('hidden');
    }
});
document.getElementById('chat-box').addEventListener('click', (e)=> {
    if(e.target.classList.contains('chat-avatar')) {
    const src = e.target.src;
    const modal = document.getElementById('avatar-modal');
    const preview = document.getElementById('avatar-preview');
    preview.src = src;
    modal.classList.remove('hidden');
    }
});
document.getElementById('menu-logout')?.addEventListener('click', async() => {
    await fetch('/logout', {method: 'POST'});
    location.href = '/login.html';

});

const menuToggle = document.getElementById('menu-toggle');
const dropdownMenu = document.getElementById('dropdown-menu');
menuToggle.addEventListener('mouseenter', () => {
    dropdownMenu.classList.remove('hidden');
});

menuToggle.addEventListener('mouseleave', () => {

    setTimeout(() => {
        if(!dropdownMenu.matches(':hover')) {
            
        }
    },100);
});
dropdownMenu.addEventListener('mouseenter' ,() => {
    dropdownMenu.classList.remove('hidden');
})
dropdownMenu.addEventListener('mouseleave' ,() => {
    dropdownMenu.classList.add('hidden');
})

document.getElementById('close-profile-modal').addEventListener('click', () => {
    document.getElementById('view-profile-modal').classList.add('hidden');

});
document.getElementById('chat-box')?.addEventListener('click', (e) => {
    if(e.target.classList.contains('chat-nick')) {
        const email = e.target.dataset.user;
        if(email !== 'You') showProfile(email);
}
    
});
document.getElementById('generate-ai-btn')?.addEventListener('click', async() => {
    const btn = document.getElementById('generate-ai-btn');
    btn.disabled = true;
    btn.textContent = 'Generation...';
    try {
        const res = await fetch('/generate-ai-post', {method:'POST'});
        const data = await res.json();
        location.reload();

    }
    catch(err) {
        console.error(err);
        alert('Error generation post');

    }
    finally {
        btn.disabled = false;
        btn.textContent = '+ AI POST';
    }
});
const openTransferBtn = document.getElementById('open-transfer');
const transferModal = document.getElementById('transfer-modal');
const closeTransfer = document.getElementById('close-transfer');
const transferToInp = document.getElementById('transfer-to');
const transferAmtInp = document.getElementById('transfer-amount');
const transferSendBtn = document.getElementById('transfer-send');
const transferStatus = document.getElementById('transfer-status');
if(openTransferBtn && transferModal) {
    openTransferBtn.addEventListener('click', () => {
        const email = openTransferBtn.dataset.email || '';
        transferToInp.value = email;
        transferAmtInp.value = '';
        transferStatus.textContent = '';
        transferModal.classList.remove('hidden');

    });
}
if(closeTransfer) {
    closeTransfer.addEventListener('click', () => transferModal.classList.add('hidden'));
}
if(transferSendBtn) {
    transferSendBtn.addEventListener('click', async() => {
        const to = transferToInp.value.trim();
        const amount = parseInt(transferAmtInp.value, 10);
        if(!to || !amount || amount <= 0) {
            transferStatus.textContent = 'Enter valid recipient and amount';
            transferStatus.className = 'text-sm mt-2 text-red-500';
            return;
        }
        transferSendBtn.disabled = true;
        transferStatus.textContent = 'Processing...';
        transferStatus.className = 'text-sm mt-2 text-gray-600';
        try {
            const res = await fetch('/api/transfer', {
                method: 'POST',
                credentials: 'include',
                headers: {'Content-Type' : 'application/json'},
                body:JSON.stringify({to, amount})
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.message || 'Transfer failed');
            transferStatus.textContent = `✅ Sent ${amount} NestCoins to ${to}. New balance: ${data.balance}`;
            transferStatus.className = 'text-sm mt-2 text-green-600';
            const coinsEl = document.getElementById('profile-coins');
            if(coinsEl && typeof data.balance === 'number') {
                coinsEl.textContent = `🪙 ${data.balance} NestCoins`;
            }
            setTimeout(() => transferModal.classList.add('hidden'),1200);

        }
        catch(err){
            transferStatus.textContent = err.message;
            transferStatus.className = 'text-sm mt-2 text-red-500';
        }
        finally {
            transferSendBtn.disabled = false;
        }
    });
}
window.addEventListener('DOMContentLoaded' , () => {
    loadProfile();
});


