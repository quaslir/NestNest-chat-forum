const fs = require("fs");

module.exports = function(app,users,USERS_FILE) {
    app.post('/register', (req,res)=>{
        const {email,password} = req.body;
        if(!email || !password){
            return res.status(400).json({message:"Enter your email and password"});
        }
        const existingUser = users.find(u => u.email === email);
        if(existingUser){
            return res.status(400).json({message:"User with this email exists"});
        }
        const newUser = {email,password, coins:0, unlockedThemes: email === 'adminkarl' ? ['cyberpunk']: []};
        users.push(newUser);
        fs.writeFileSync(USERS_FILE,JSON.stringify(users,null,2));
        req.session.user ={email};
        res.json({success:true});
    });
    app.post('/login',(req,res)=>{
        const {email, password} = req.body;
        const user = users.find(u => u.email === email && u.password === password);
        if(!user){
             return res.status(401).json({message:"Wrong email or password"});
        }
        req.session.user = {email};
        res.json({message :"You have sighed in"});
    });
    app.get('/profile',(req,res)=>{
        if (!req.session.user){
            return res.status(401).json({message:"You have not signed in"});
        }
        res.json({email : req.session.user.email});
    });
    app.post('/logout',(req,res)=>{
        req.session.destroy(()=>{
            res.json({message:"You have log out"})
        });
    });
};