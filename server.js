const path = require("path");
const MESSAGES_FILE = path.join(__dirname, 'messages.json');
const POSTS_FILE = path.join(__dirname, 'posts.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const PRIVATE_MESSAGES_FILE = path.join(__dirname, 'private_messages.json');
const TRANSFERS_FILE = path.join(__dirname, 'transfers.json' );
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const cors = require('cors');
const http = require('http');
const {Server} = require('socket.io');
require('dotenv').config();
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();

app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN ?? '').split(',').filter(Boolean) || true,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  name: 'nestnest.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
app.use(['/login','/register'], authLimiter);
const PORT = process.env.PORT || 3000;
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const cron = require('node-cron');
const NEWS_API_KEY = '107153adbe4a4ab785f8e47963fd5226';
const multer = require('multer');
const upload = multer({dest: path.join(__dirname,'public/uploads')});
const server = http.createServer(app);
const io = new Server(server);
let users = [];
let posts = [];
let messages = [];
let private_messages = [];
let onlineUsers = {};
let transfers = [];
if(fs.existsSync(TRANSFERS_FILE)) {
    try { transfers = JSON.parse(fs.readFileSync(TRANSFERS_FILE, 'utf8'));}
    catch { transfers = [];}
}
else {
    fs.writeFileSync(TRANSFERS_FILE, '[]');
}
app.use(cors());
if(fs.existsSync(PRIVATE_MESSAGES_FILE)){
try{
    private_messages = JSON.parse(fs.readFileSync(PRIVATE_MESSAGES_FILE, 'utf8'));
}
catch {
console.error("Error");
private_messages = [];
}
}
else {
    fs.writeFileSync(PRIVATE_MESSAGES_FILE, '[]');
}


if(fs.existsSync(POSTS_FILE)) {
    try {
        posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
    }
    catch(err) {
        console.log('Error while reading posts.json',err);
        posts = [];
    }
}
    else {
        fs.writeFileSync(POSTS_FILE, '[]');
    }

if(fs.existsSync(MESSAGES_FILE)){
    try{
        messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
    } catch {
        console.log("Error while reading messages.json");
        messages = [];
    }
}
if(fs.existsSync(USERS_FILE)){
try{
    const file_data = fs.readFileSync(USERS_FILE, 'utf8');
    users = JSON.parse(file_data);
}
catch(err){
    console.log("Error while reading users.json");
    users = [];
}
}
 app.post('/posts/:id/comments' , (req,res) => {
    

        if(!req.session.user) return res.status(401).json({message : "You must be logged in to comment"});
        const {id} = req.params;
        const {text} = req.body;
        const user = users.find(u => u.email === req.session.user.email);
    if(user) {
        user.coins = (user.coins || 0) +5;
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }
        const post = posts.find( p => p.id === id);
        if(!post) return res.status(404).json({message : "Post not found"});
        const comment = {
            author : req.session.user.email,
            text: text.trim(),
            timestamp: new Date().toISOString()
        };
        if(!post.comments) post.comments = [];
        post.comments.push(comment);

        fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null , 2));
        res.json({message : "Comment added"});

 });


app.use(express.static(path.join(__dirname, 'public')));
require('./auth')(app,users,USERS_FILE);
app.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/chat/:login', (req,res)=> {
    if(!req.session.user) {
        return res.status(401).json({message:"Not authorized"});
    }

    const userA = req.session.user.email;
    const userB = req.params.login;

    const chat = private_messages.filter( msg => 
        (msg.from === userA && msg.to === userB) ||
        (msg.from === userB && msg.to === userA)
    );
    res.json(chat);
});
app.get('/api/profile' , (req,res)=> {
    if(!req.session.user) return res.sendStatus(401);

    const user = users.find(u => u.email === req.session.user.email);
    if(!user) return res.status(401).json({message:"User not found"});

    res.json({
        email:user.email,
        avatar: user.avatar || null,
        bio: user.bio || '',
        header: user.header || null,
        wallet: user.wallet || null,
        coins: user.coins || 0,
        unlockedThemes: user.unlockedThemes || []

    });
});
const OpenAI = require('openai');
const FormData = require('form-data');
const openai = new OpenAI({
    apiKey:process.env.OPENAI_API_KEY,
    baseURL:process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1',
});

async function generatePostwithAI() {
    const prompt = `
You are an intelligent and creative assistant who writes engaging, inspiring, and informative posts for a developer forum called "NestNest".

🎯 Your task:
- Choose a relevant topic from one of the following: programming tips, AI news, tech humor, developer motivation, open-source projects, or startup ideas.
- Come up with a **catchy and clear title** (first line).
- Write a **forum post under 200 words** using a friendly and natural tone, like talking to fellow developers.
- Use line breaks and short paragraphs to improve readability.
- Try to include a thoughtful insight, helpful tip, or interesting fact.
- Keep it **relatable** and free of buzzwords or vague phrases.

🖼 Additionally:
- At the end of the post, add a separate line starting with: Image idea: followed by a short visual concept that fits the post (example: *A clean minimalist laptop setup with glowing code on screen*).

⚠️ Format strictly:
Title
<blank line>
Body (up to 3 short paragraphs)
<blank line>
Image idea: <short description>

Do not include hashtags or emojis.
Respond only with the post content.
Do not write title twice and text like body!
for example Title: 🔌 Unleash the Power of Parallel Processing with Pyth
Title: 🔌 Unleash the Power of Parallel Processing with Python's concurrent.futures
second title is extra and does not have to be there!
`;
;
    try {
        const completion = await openai.chat.completions.create({
            model: 'mistralai/mistral-7b-instruct',
            messages:[{role:'user', content:prompt}],
            temperature:0.8,
            max_tokens:500,
        });
        const content = completion.choices[0].message.content.trim();
        const title = content.split('\n')[0].slice(0, 60).replace(/^#+\s*/, '').trim();
        const imagePromptRaw = content.split('Image idea:')[1]?.trim();
        let imageUrl = null;
        if(imagePromptRaw) {
            try {
                const imagePrompt = imagePromptRaw.replace(/[^a-zA-Z0-9\s.,-]/g, '').slice(0, 120);
                const form = new FormData();
                form.append('prompt', imagePrompt);
                form.append('model', 'stable-diffusion-xl-v1');
                form.append('output_format', 'png');
                form.append('aspect_ratio', '1:1');
                console.log('imagePrompt:', imagePrompt)
                const response = await axios.post(
                    'https://api.stability.ai/v2beta/stable-image/generate/core',
                    form,
                   
                    {
                        headers: {
                            ...form.getHeaders(),
                            Authorization:`Bearer ${process.env.STABILITY_API_KEY}`,
                            Accept: 'application/json',
                           
                        },
                    }
                );
                const imageBase64 = response.data?.image;
                if(imageBase64){
                    const fileName = `ai_post_${Date.now()}.png`;
                    const imagePath = path.join(__dirname, 'public', 'uploads', fileName);
                    fs.writeFileSync(imagePath, Buffer.from(imageBase64, 'base64'));
                    imageUrl = `/uploads/${fileName}`;
                }
            }
            catch(err) {
                console.error('Failed to generate image', err.message);
            }
        }
        const post = {
            id:Math.random().toString(36).substring(2,9),
            title,
            content,
            author: 'ai@nestnest.com',
            timestamp: new Date().toISOString(),
            image:imageUrl || null
        };
        posts.push(post);
        fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));

    }
    catch(error) {
        console.error('Error generating post with AI', error.message)
    }

}
async function injectNewPost() {
    const url = `https://newsapi.org/v2/top-headlines?category=technology&pageSize=10&apiKey=${NEWS_API_KEY}`;
    try{
        const res = await fetch(url);
        const data = await res.json();

        if(!data.articles || !data.articles.length) {
            console.log("No articles found from NewsApi");
            return;
        }
        let currentPosts =[];
        try{
            currentPosts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
        }
        catch(e){
            console.error("Error while reading posts file",e);
        }
        data.articles.forEach(article =>{
            const post = {
            id: Math.random().toString(36).substr(2,9),
            title: article.title || "Breaking News",
            content: `${article.description || article.content || 'Without description'}\n\n Source: ${article.url}`,
            author: 'news@nestnest.com',
            timestamp: new Date().toISOString()
        };
        currentPosts.push(post);
        console.log('[News] Post added:', post.title);
    });
        fs.writeFileSync(POSTS_FILE, JSON.stringify(currentPosts, null, 2));
        posts = currentPosts;
        }
        catch(err){
console.error("Error fetching news:",err);
        }
    }
    
cron.schedule('0 */12 * * *', injectNewPost); 
cron.schedule('0 */12 * * *', generatePostwithAI); 
app.get('/posts', (req,res)=>{
    const enrichedPosts = posts.map(post => {
        const user = users.find(u => u.email?.toLowerCase() === (post.author || '').toLowerCase());
        console.log(post.author, user?.wallet || 'No wallet');
        return{
            ...post,
            wallet: user?.wallet || null
        }
    });
    res.json(enrichedPosts);
});

app.get('/users', (req,res) => {
    if(!req.session.user){
        return res.status(401).json({message:"Not authorized"});
    }
    const usernames = users.map( u=> u.email).filter( u => u !== req.session.user.email);
    res.json(usernames);
});

app.post('/posts', upload.single('image'), (req,res)=>{
    if(!req.session.user) {
        return res.status(401).json({message:"You have not signed in"});
    }
    const user = users.find(u => u.email === req.session.user.email);
    if(user) {
        user.coins = (user.coins || 0) +10;
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }
    const {title, content} = req.body;
    const file = req.file;
    const imageUrl = file? `/uploads/${file.filename}` :null;
    if(!title || !content){
        return res.status(400).json({message:"Not enough data!"});
    }
    const post = {
        id:Math.random().toString(36).substr(2,9),
        title,
        content,
        author: req.session.user.email,
        timestamp:new Date().toISOString(),
        imageUrl
    };
    posts.push(post);
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
    res.json({message:'Post is published'});
});
app.get('/messages',(req,res)=>{
res.json(messages);
});
app.post('/messages',(req,res)=>{
    if(!req.session.user){
        return res.status(401).json({message:"You have not signed in"});
    }
    const {to,text} = req.body;
    const from = req.session.user.email;
    const time = new Date().toISOString();

    if(!text || !to){
        return res.status(401).json({message:"Not enough data"});
    }
    const message = {from,to,text: text.trim(),time};
    messages.push(message);

    fs.writeFile(MESSAGES_FILE,JSON.stringify(messages,null,2),err =>{
        if(err){
            return res.status(401).json({message:"Messages was not saved"});
        }
        res.json({message:"Message was sent"});
    });
});
app.post('/upload-avatar', upload.single('avatar'), (req,res) => {
    if(!req.session.user) return res.sendStatus(401);
    const file = req.file;

    if(!file) return res.status(400).json({message:"No file uploaded"});

    const user = users.find(u => u.email === req.session.user.email);
    if(user) {
        user.avatar = `/uploads/${file.filename}`;
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        res.json({message:"Avatar updated", avatar: user.avatar});
    }
    else {
        res.status(404).json({message : "User not found"});
    }
});
app.post('/follow/:email', (req,res) => {
    if(!req.session.user) return res.sendStatus(401);
    const current = req.session.user.email;
    const target = req.params.email;
    const currentUser = users.find(u => u.email === current);
    const targetUser = users.find(u => u.email === target);
    if(!targetUser || !currentUser || target === current) return res.json({message: "You can not follow yourself!"});
    if(!currentUser.following) currentUser.following = [];
    if(!targetUser.followers) targetUser.followers = [];
    if(!currentUser.following.includes(target)) {
        currentUser.following.push(target);
    }
        if(!targetUser.followers.includes(current)) {
        targetUser.followers.push(current);
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    res.json({message : "Followed"});
});
app.get('/followers/:email' , (req,res) => {
    const user = users.find(u => u.email === req.params.email);
    if(!user) return res.sendStatus(404);
    res.json({
        followers: user.followers?.length || 0,
        following: user.following?.length || 0
    });
});
app.post('/unfollow/:email', (req ,res)=> {
    if(!req.session.user) return res.sendStatus(401);
    const current = req.session.user.email;
    const target = req.params.email;
    const currentUser = users.find(u => u.email === current);
    const targetUser = users.find(u => u.email === target);
    if(!currentUser.following) currentUser.following = [];
    if(!targetUser.followers) targetUser.followers = [];
    if(!targetUser || !currentUser || current === target) return res.sendStatus(400);
    currentUser.following = (currentUser.following || []).filter(u => u !== target);
    targetUser.followers = (targetUser.followers || []).filter(u => u !== current);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    res.json({message: "Unfollowed"});
   
});
app.get('/avatar/:email' , (req, res) => {
    const user = users.find(u => u.email === req.params.email);
    if(user?.avatar) {
        const avatarPath = path.join(__dirname, 'public', user.avatar);
        if(fs.existsSync(avatarPath)) {
            res.sendFile(avatarPath);
        }
        else {
            res.sendStatus(404);
        }
    }
    else {
        res.sendStatus(404);
    }
});
app.get('/profile/:email' , (req,res) => {
    const {email} = req.params;
    const user = users.find(u => u.email === email);
    if(!user) return res.status(404).json({message:"User not found"});

    const userPosts = posts.filter(p => p.author === email);
    const publicMessages = messages.filter(m => m.from === email);

    res.json({
        email: user.email,
        nickname: user.nickname || email.split('@')[0],
        bio: user.bio || '',
        avatar: user.avatar || null,
        header: user.header || null,
        location: user.location || '',
        createdAt: user.createdAt || '',
        posts: userPosts,
        messages: publicMessages,
        followers: user.followers || [],
        following: user.following || []
    });
});
app.delete('/posts/:id', (req,res)=>{
    if(!req.session.user || req.session.user.email !== 'adminkarl'){
        return res.status(403).json({message:"Forbidden"});
    }
    const {id} = req.params;
    const index = posts.findIndex(p => p.id === id);
    if(index === -1){
        return res.status(404).json({message:"Post is not found"});
    }

    posts.splice(index,1);
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
    res.json({message:"Post was deleted"});
});
app.post('/posts/:id/like',(req ,res) => {
    if(!req.session.user) return res.sendStatus(401);
    
    const post = posts.find(p => p.id === req.params.id);
    if(!post) return res.status(404).json({message:"Post not found!"});
    const email = req.session.user.email;
    post.likes = post.likes || [];
    post.dislikes = post.dislikes || [];
    const isAlreadyLiked = post.likes.includes(email);
    if(!isAlreadyLiked) {
        post.likes.push(email);
        post.dislikes = post.dislikes.filter(e => e!== email);
        const author = users.find(u => u.email === post.author);
        if(author && author.email !== email) {
            author.coins = (author.coins || 0) +2;
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        }
    }

    else {
        post.likes = post.likes.filter(e => e !== email);
    }
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
    res.json({likes : post.likes.length, dislikes: post.dislikes.length});

});
app.post('/posts/:id/dislike',(req ,res) => {
    try {
    if(!req.session.user) return res.sendStatus(401);
    const post = posts.find(p => p.id === req.params.id);
    if(!post) return res.status(404).json({message:"Post not found!"});

    const email = req.session.user.email;
    post.likes = post.likes || [];
    post.dislikes = post.dislikes || [];
    if(!post.dislikes.includes(email)) {
        post.dislikes.push(email);
        post.likes = post.likes.filter(e => e !== email);
    }
    else {
        post.dislikes = post.dislikes.filter(e => e !== email);
    }
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
    res.json({likes : post.likes.length, dislikes: post.dislikes.length});
    } catch(err) {
        console.error("Dislike error", err);
    }
});
app.delete('/messages/:timestamp', (req,res)=>{
    if(!req.session.user || req.session.user.email !== 'adminkarl'){
        return res.status(403).json({message:"Forbidden"});
    }
    const {timestamp} = req.params;
    const index = messages.findIndex(m => m.time === timestamp);
    if(index === -1){
        return res.status(404).json({message:"Message is not found"});
    }

    messages.splice(index,1);
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
    res.json({message:"Message was deleted"});
});
app.post('/chat/:login' , (req,res) => {
     if(!req.session.user) {
        return res.status(401).json({message:"Not authorized"});
    }
    const {text} = req.body;
    const userA = req.session.user.email;
    const userB = req.params.login;

    if(!text) {
        return res.status(400).json({message:"Message is empty"});
    }
    const message = {
        from: userA,
        to : userB,
        text: text.trim(),
        time:new Date().toISOString(),
        read: false

    };

    private_messages.push(message);
    fs.writeFileSync(PRIVATE_MESSAGES_FILE, JSON.stringify(private_messages, null, 2));

    res.json({message : 'Message sent'});
});
app.post('/chat/:from/mark-read' ,async (req,res)=> {
    if(!req.session.user) return res.sendStatus(401);
    let messages = [];
    const user = req.session.user.email;
    const from = req.params.from;
    try {
    messages = JSON.parse(fs.readFileSync(PRIVATE_MESSAGES_FILE, 'utf8'));
    } catch(e) {
        console.error("Failed to read private messages", e);
        return res.sendStatus(500);
    }
    let updated = false;
    messages.forEach(msg => {
        if(msg.from === from && msg.to === user && msg.read === false) {
            msg.read = true;
            updated = true;
        }
    });
    if (updated) {
        fs.writeFileSync(PRIVATE_MESSAGES_FILE, JSON.stringify(messages,null,2));
        private_messages = messages;
    }
    
    res.sendStatus(200);
});
app.post('/chat/:login/:time/react', (req,res) => {
    if(!req.session.user) return res.sendStatus(401);
    const {emoji} = req.body;
    const {login, time} = req.params;
    const userEmail = req.session.user.email;
    const msg = private_messages.find(m => m.time === time && ((m.from === userEmail && m.to === login) || (m.from === login && m.to === userEmail)));
    if(!msg) return res.status(400).json({message:"Message not found"});
    msg.reactions = msg.reactions || [];
    const existing = msg.reactions.find(r => r.by === userEmail);
    if(existing){
        existing.emoji = emoji;

    }
    else {
        msg.reactions.push({emoji, by:userEmail});
    }
    fs.writeFileSync(PRIVATE_MESSAGES_FILE, JSON.stringify(private_messages, null, 2));
    res.json({message:"Reaction saved", reactions: msg.reactions});
});
app.post('/update-profile', upload.fields([
   {name: 'avatar', maxCount:1},
   {name: 'header', maxCount: 1}
]), (req,res) => {
    if(!req.session.user) return res.sendStatus(401);
    const {bio, wallet} = req.body;
    const file = req.file;
  
   
    const user = users.find(u => u.email === req.session.user.email);
    
    const avatarFile = req.files?.avatar?.[0];
    const headerFile = req.files?.header?.[0];
    if(avatarFile) user.avatar = `/uploads/${avatarFile.filename}`;
    if (headerFile) user.header = `/uploads/${headerFile.filename}`;
    user.bio = bio || '';
     if(wallet && wallet.trim().startsWith('0x')&& wallet.trim().length === 42) {
        user.wallet = wallet.trim();
    }
    if(user) {
        if(file) user.avatar =`/uploads/${file.filename}`;
        user.bio = bio || '';
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        res.json({message: "Profile updated"});
    }

    else {
        res.status(404).json({message:"User is not found!"});
    }
});
app.post('/generate-ai-post', async(req,res)=> {
    if(!req.session.user || req.session.user.email !== 'adminkarl') {
        return res.status(403).json({message:"Forbidden!"});
    }
    try {
        await generatePostwithAI();
        res.json({message:"AI post created successfully"});
    }
    catch(err){
        console.error('AI POST ERROR', err);
        res.status(500).json({message:"Failed to create AI post"});
    }
});
app.post('/buy-feature', (req,res)=>{
    if(!req.session.user.email) return res.sendStatus(401);
    const{feature, price} = req.body;
    const user = users.find(u => u.email === req.session.user.email);
    if(!user) return res.sendStatus(404).json({message:"User not found"});
    const cost = parseInt(price);
    if((user.coins || 0)<cost) return res.status(400).json({message:"Not enough NestCoins!"});
    user.coins -= cost;
    user.unlockedThemes = user.unlockedThemes || [];
    if(!user.unlockedThemes.includes('cyberpunk')) {
        user.unlockedThemes.push('cyberpunk');

    }
    else if(!user.unlockedThemes.includes('barbie')) {
        user.unlockedThemes.push('barbie');

    }
    else if(!user.unlockedThemes.includes('sunset')) {
        user.unlockedThemes.push('sunset');

    }
    else if(!user.unlockedThemes.includes('matrix')) {
        user.unlockedThemes.push('matrix');

    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    res.json({message:"Feature purchased", coins:user.coins});
});
app.post('/casino/bet', (req, res) => {
    const {game, bet, result, winAmount } = req.body;
    const user = users.find(u => u.email === req.session.user.email);
    if(!user) return res.status(401).json({message: "Unauthorized"});
    if((user.coins || 0)< bet) return res.status(400).json({message:"Not enough NestCoins!"});
    user.coins -= bet;
    if(winAmount > 0) {
        user.coins += winAmount;

    }
    const gamelog = {
        email: user.email,
        game,
        bet,
        result,
        winAmount,
        date: new Date().toISOString()
    };
    const logPath = path.join(__dirname, 'casino_history.json');
    let logs = [];
    if(fs.existsSync(logPath)) logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    logs.push(gamelog);
    fs.writeFileSync(logPath, JSON.stringify(logs , null, 2));
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    res.json({balance: user.coins, winAmount});
});
function saveUsers() {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}
function saveTransfers() {
    fs.writeFileSync(TRANSFERS_FILE, JSON.stringify(transfers, null, 2));
}
app.post('/api/buy-ai-avatar', (req, res) => {
    if(!req.session.user) return res.status(401).json({message: "Unauthorized"});
    const user = users.find(u => u.email === req.session.user.email);
    if(!user) return res.status(401).json({message: "Unauthorized"});
    if((user.coins || 0) < 40){
        return res.status(400).json({message:"Not enough NestCoins!"});
    }
    user.coins -= 40;
    user.aiAvatarPurchased = true;
    saveUsers();
    res.json({success: true, message:"Ai avatar has been purchased!"});

});
const STABILITY_ENGINE = "stable-diffusion-xl-1024-v1-0";
app.post('/api/ai-avatar', async(req, res) => {
    if(!req.session.user) return res.status(401).json({message: "Unauthorized"});
    const user = users.find(u => u.email === req.session.user.email);
    if(!user || !user.aiAvatarPurchased) {
        return res.status(403).json({message:"You have to buy AI avatar!"});
    }
    const {prompt, style} = req.body;
    if(!prompt) return res.status(400).json({message:"Write the description for your avatar!"});
    try {
        const response = await fetch(`https://api.stability.ai/v1/generation/${STABILITY_ENGINE}/text-to-image`,{
                    
                    method: 'POST',
                        headers: {
                            'Content-Type' : 'application/json',
                            Authorization:`Bearer ${process.env.STABILITY_API_KEY}`
                          
                           
                        },
                        body: JSON.stringify({
                            text_prompts:[{text:`${prompt}, style ${style}, avatar, high quality`}],
                            cfg_scale:7,
                            height:1024,
                            width:1024,
                            samples:1
                        })

                    });
                    if(!response.ok) {
                        const errData = await response.json();
                        throw new Error(errData.message || 'Error generating via Stability');
                    }
                const data = await response.json();
                const imageBase64 = data.artifacts[0].base64;
                const imageUrl = `data:image/png;base64,${imageBase64}`;
                res.json({imageUrl});
             
    }
    catch(err) {
        console.error(err);
        res.status(500).json({message:"Error generating AI avatar"});
    }

});
app.post('/api/save-ai-avatar', (req,res) => {
    if(!req.session.user) return res.status(401).json({message: "Unauthorized"});
    const {imageUrl} = req.body;
    if(!imageUrl) return res.status(400).json({meesage:"Avatar is not available"});
    const user = users.find(u => u.email === req.session.user.email);
    if(!user) return res.status(400).json({message:"User is not found!"});
    try {
        const fileName = `ai_avatar_${Date.now()}.png`;
        const base64Data = imageUrl.replace(/^data:image\/png;base64,/, "");
        const filePath = path.join(__dirname, 'public', 'uploads', fileName);
        fs.writeFileSync(filePath, base64Data, 'base64');
        user.avatar = `/uploads/${fileName}`;
         saveUsers();
    res.json({success: true, message:"Avatar was saved!", avatar: user.avatar});
    }
    catch(err) {
        console.error(err);
    }

   

});
app.post('/api/transfer', (req, res) => {
    if(!req.session.user) return res.status(401).json({message: "Unauthorized"});
    const fromEmail = typeof req.session.user === 'string' ?
    req.session.user :
    req.session.user.email;
    const{to, amount} = req.body || {};
    const amt = parseInt(amount,10);
    if(!to || !Number.isFinite(amt) || amt<= 0) {
        return res.status(400).json({message:"Invalid recipient or amount"});
    }
    if(to.toLowerCase() === fromEmail.toLowerCase()) {
        return res.status(400).json({message:"You cannot transfer to yourself!"});
    }
    const fromUser = users.find(u => (u.email || '').toLowerCase() === fromEmail.toLowerCase());
    const toUser = users.find(u => (u.email || '').toLowerCase() === to.toLowerCase());
    if(!fromUser) return res.status(404).json({message:'Sender not found'});
    if(!toUser) return res.status(404).json({message:'Recipient not found'});
    const balance = fromUser.coins || 0;
    if(balance < amt) {
        return res.status(400).json({message:"Not enough NestCoins!"});
    }
    fromUser.coins = balance - amt;
    toUser.coins = (toUser.coins || 0) + amt;
    const tx = {
        id: Math.random().toString(36).slice(2,10),
        from: fromUser.email,
        to:toUser.email,
        amount:amt,
        time: new Date().toISOString()
    };
    transfers.push(tx);
    saveUsers();
    saveTransfers();
    res.json({
        success:true,
        message: `Transferred ${amt} to ${toUser.email}`,
        balance: fromUser.coins,
        tx
    });
});
app.get('/leaderboard', (req ,res)=> {
    const sorted = [...users]
    .sort((a, b) => (b.coins || 0) - (a.coins || 0))
    .slice(0,10)
    .map(u => ({email:u.email, coins: u.coins || 0}));
    res.json(sorted);
});
app.use((req,res,next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
})
app.delete('/chat/:login/:time', (req,res) => {
    console.log(req.body);
    if(!req.session.user) return res.sendStatus(401);
    const {time} = req.params;
    const email = req.session.user.email;
    const index = private_messages.findIndex( m => m.time === time && m.from === email);
    if(index === -1) return res.status(404).json({message :"Message not found"});
    private_messages.splice(index,1);
    fs.writeFileSync(PRIVATE_MESSAGES_FILE, JSON.stringify(private_messages, null,2));
    res.json({message: "Message deleted"});
});
app.put('/chat/:login/:time', (req,res) => {
    
    if(!req.session.user) return res.sendStatus(401);
    const {time} = req.params;
    const email = req.session.user.email;
    const {text} = req.body;
    const msg = private_messages.find( m => m.time === time && m.from === email);
    if(!msg) return res.status(404).json({message :"Message not found"});
    msg.text = text.trim();
    fs.writeFileSync(PRIVATE_MESSAGES_FILE, JSON.stringify(private_messages, null,2));
    res.json({message: "Message updated"});
});
io.on('connection', (socket) => {
     socket.on('join', (email) => {
        socket.email = email;
        onlineUsers[email] = socket.id;
        console.log(`${email} connected`);
        io.emit('online-users', Object.keys(onlineUsers));
        
    });
    socket.on('private message',({from,to}) => {
            const receiverSocketId = onlineUsers[to];
            if(receiverSocketId){
                io.to(receiverSocketId).emit('new-private-message', {from});
            }
        });
    console.log("New user connected");
  socket.on('mark-read' ,({from,to}) => {
    const receiverSocketId = onlineUsers[from];
    if(receiverSocketId){
        io.to(receiverSocketId).emit('messages-mark-read', {from:to});
    }
  });
   socket.on('disconnect' , () => {
    if(socket.email) {
        console.log(`${socket.email} disconnected`);
        delete onlineUsers[socket.email];
        io.emit('online-users', Object.keys(onlineUsers));
    }
   });

});

//app.listen(PORT, '0.0.0.0', ()=>{
//app.listen(PORT, ()=>{
//console.log('Server is working on http://localhost:3000');
server.listen(PORT, () =>{
    console.log("Server is working on http://localhost:3000");
});

