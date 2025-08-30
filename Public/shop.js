document.querySelectorAll('.buy-feature').forEach(btn => {
    btn.addEventListener('click', async() => {
        const feature = btn.dataset.feature;
        const price = btn.dataset.price;
        const res = await fetch('/buy-feature', {
            method:'POST',
            credentials: 'include',
            headers:{'Content-type' : 'application/json'},
            body: JSON.stringify({feature, price})
        });
        const data = await res.json();
        if(res.ok) {
            alert("Purchased successfully");
            location.reload();
        }
        else{
            alert(data.message || 'Purchase failed!');
        }
    });
});

window.addEventListener('DOMContentLoaded', async() => {
    let selectedStyle = 'realistic';
document.querySelectorAll('.avatar-style-btn').forEach(btn => {
    btn.classList.add('px-3', 'py-1', 'border', 'rounded', 'dark:bg-gray-700', 'dark:text-white', 'hover:bg-green-600', 'hover:text-white');
    btn.addEventListener('click', () => {
        selectedStyle = btn.dataset.style;
        document.querySelectorAll('.avatar-style-btn').forEach(b => b.classList.remove('bg-green-600', 'text-white'));
        btn.classList.add('bg-green-600', 'text-white');
    });
});
document.getElementById('buy-ai-avatar').addEventListener('click', async() => {
    if(!confirm('Do you want to continue?')) return;
    try {
        const res = await fetch('/api/buy-ai-avatar', {method: 'POST' , credentials: 'include'});
        const data = await res.json();
        if(!res.ok) throw new Error('Error buying ai avatar' || data.message);
        alert('Purchase is complete!');
        document.getElementById('ai-avatar-generator').classList.remove('hidden');

    }
    catch(err) {
        alert(err.message);
    }
});
document.getElementById('generate-avatar').addEventListener('click', async() => {
    console.log(selectedStyle);
    const prompt = document.getElementById('avatar-prompt').value.trim();
    if(!prompt) {
        alert('Write prompt for your avatar!');
        return;
    }
    try {
        const res = await fetch('/api/ai-avatar', {
            method: 'POST',
            credentials: 'include',
            headers: {'Content-type' : 'application/json'},
            body: JSON.stringify({prompt, style:selectedStyle})
        });
        const data = await res.json();
        if(!res.ok) throw new Error('Error generating ai avatar' || data.message);
        document.getElementById('generated-avatar').src = data.imageUrl;
        document.getElementById('avatar-preview').classList.remove('hidden');

    }
    catch(err) {
        alert(err.message);
    }
});
document.getElementById('save-avatar').addEventListener('click', async() => {
    try {
        const res = await fetch('/api/save-ai-avatar', {
            method: 'POST',
            credentials: 'include',
            headers: {'Content-type' : 'application/json'},
            body: JSON.stringify({imageUrl: document.getElementById('generated-avatar').src})
        });
        const data = await res.json();
        if(!res.ok) throw new Error('Error saving ai avatar' || data.message);
        alert('Avatar saved ✅');
        location.reload();

    }
    catch(err) {
        alert(err.message);
    }
});
    try {
        const res = await fetch('/api/profile');
        if(!res.ok) throw new Error('Failed to load profile');
        const data = await res.json();
        document.getElementById('profile-coins').textContent = `🪙 ${data.coins || 0} NestCoins`;
    
    }
    catch (err) {
        console.error('Error loading coins:', err);
    }
});