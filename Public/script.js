async function register() {
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const msg = document.getElementById('reg-message');
    if(!email || !password){
        msg.textContent = "Enter your email and password";
        return;
    }
    const res = await fetch('/register',{
        method:'POST',
        headers: {'Content-Type':'application/json'},
        body:JSON.stringify({email,password})
        
    });
    const data = await res.json();
    if(res.ok){
        window.location.href = '/forum.html';
    }
    else {
    msg.textContent = data.message || 'Error';
    }
}
async function login(){
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const msg = document.getElementById('login-message'); 
    if(!email || !password){
        msg.textContent = "Enter your email and password";
        return;
    }
    const res = await fetch('/login',{
        method:'POST',
        headers: {'Content-Type':'application/json'},
        body:JSON.stringify({email,password})
        
    });
    const data = await res.json();
    msg.textContent = data.message || 'Eror';
    if(res.ok){
        window.location.href = '/forum.html';
        loadProfile();
    }

}
async function loadProfile(){
    const profileDiv = document.getElementById('profile-info');
    const res = await fetch('/profile');
    if(res.ok){
        const data = await res.json();
        profileDiv.textContent = "You have signed in as" + ' ' + data.email;
    }
    else{
        profileDiv.textContent = "You have not signed in";
    }
}
async function logout() {
    await fetch('/logout',{method:'POST'});
    document.getElementById('profile-info').textContent = "You have log out";
}
document.addEventListener("DOMContentLoaded",()=>{
    const regBtn = document.getElementById("btn-register");
    if(regBtn) regBtn.onclick = register;
    const loginBtn = document.getElementById("btn-login");
    if(loginBtn) loginBtn.onclick = login;
    const logoutBtn = document.getElementById("btn-logout");
    if(logoutBtn) logoutBtn.onclick = logout;


loadProfile();
});
