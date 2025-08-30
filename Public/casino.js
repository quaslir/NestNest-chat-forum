
async function loadBalance() {
    try {
        const res = await fetch('/api/profile');
        if (!res.ok) throw new Error('Error loading profile!');
        const data = await res.json();
        document.getElementById('balance').textContent = `🪙 ${data.coins || 0}`;
    } catch (err) {
        console.error(err);
        document.getElementById('balance').textContent = 'Error';
    }
}

async function placeBet(choice) {
    const betAmount = parseInt(document.getElementById('bet-amount').value);
    if (!betAmount || betAmount <= 0) {
        alert('Enter a valid bet amount');
        return;
    }
    const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
    const win = choice === outcome;
    const winAmount = win ? betAmount * 2 : 0;
    try {
        const res = await fetch('/casino/bet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                game: 'coinflip',
                bet: betAmount,
                result: outcome,
                winAmount
            })
        });
        const data = await res.json();
        if (!res.ok) {
            alert(data.message || 'Error placing bet');
            return;
        }
        document.getElementById('balance').textContent = `🪙 ${data.balance}`;
        document.getElementById('result').textContent = win
            ? `🎉 You won! It was ${outcome.toUpperCase()} (+${winAmount}🪙)`
            : `😢 You lost! It was ${outcome.toUpperCase()}`;
        betHistory.unshift({
            time: new Date().toLocaleTimeString(),
            choice,
            bet: betAmount,
            resultText: win ? `Won +${winAmount}🪙` : `Lost - ${betAmount}🪙`
        });
        if (betHistory.length > 10) betHistory.pop();
        renderHistory();
    } catch (err) {
        console.error(err);
        alert('Connection error');
    }
}

document.querySelectorAll('#coinflip-game .choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        placeBet(btn.dataset.choice);
    });
});

let betHistory = [];
function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    if (betHistory.length === 0) {
        list.innerHTML = '<li class="text-gray-500">No bets yet.</li>';
        return;
    }
    betHistory.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.time} | ${item.choice.toUpperCase()} | Bet: ${item.bet}🪙 ${item.resultText}`;
        list.appendChild(li);
    });
}

let gameRunning = false;
let userCashed = false;
let crashHistory = [];
let crashInterval;
let multiplier = 1.00;
let crashed = false;
let crashBetAmount = 0;
let particles = [];
let historySaved = false;
let crashX = 0;
let crashY = 0;
let rocketX, rocketY;
const rocketImg = new Image();
rocketImg.src = '/rocket.png';
let rocketLoaded = false;
let lastRocketSize = null;
const CASHOUT = {
    decimals:2
};
const roundDown = (x,d = CASHOUT.decimals) => {
    const p = 10 ** d;
    return Math.floor(x * p) / p;
};

rocketImg.onload = () => {
    rocketLoaded = true;
};
document.getElementById('start-crash').addEventListener('click', async () => {
    if (gameRunning) return;
    const startBtn = document.getElementById('start-crash');
    const cashoutBtn = document.getElementById('cashout-crash');
    const betInput = document.getElementById('bet-amount-crash');
    const resultDisplay = document.getElementById('result-crash');
    crashBetAmount = parseInt(betInput.value);
    if (!crashBetAmount || crashBetAmount <= 0) {
        alert('Enter a valid bet amount!');
        return;
    }
    historySaved = false;
    userCashed = false;
    gameRunning = true;
    startBtn.disabled = true;
    betInput.disabled = true;
    try {
        const res = await fetch('/casino/bet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                game: 'crash',
                bet: crashBetAmount,
                result: 'start',
                winAmount: 0
            })
        });
        const data = await res.json();
        if (!res.ok) {
            alert(data.message || 'Error placing bet');
            gameRunning = false;
            startBtn.disabled = false;
            betInput.disabled = false;
            return;
        }
        const balanceEl = document.getElementById('balance');
        const prevBalance = parseInt(balanceEl.textContent.replace(/[^0-9]/g, '')) || 0;
        balanceEl.textContent = `🪙 ${data.balance}`;
        if (data.balance < prevBalance) {
            balanceEl.classList.add('text-red-500');
            setTimeout(() => balanceEl.classList.remove('text-red-500'), 1000);
        }
        resultDisplay.textContent = `🚀 Bet placed: - ${crashBetAmount} 🪙 | Game starting...`;
    } catch (err) {
        console.error(err);
        gameRunning = false;
        startBtn.disabled = false;
        betInput.disabled = false;
        return;
    }
    userCashed = false;
    const crashPoint = parseFloat(getCrashPoint().toFixed(2));
    console.log(crashPoint);
    multiplier = 1.00;
    crashed = false;
    document.getElementById('multiplier-display').textContent = multiplier.toFixed(2) + 'x';
    cashoutBtn.disabled = false;
    const canvas = document.getElementById('crash-canvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const marginTop = 10, marginBottom = 10, marginLeft = 10, marginRight = 10;
    const maxY = Math.max(crashPoint, 5) * 1.1;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const points = [];
    points.push({ x: marginLeft, y: height - marginBottom });
    rocketX = marginLeft;
    rocketY = height - marginBottom;

    const baseSpeed = 60;
    const travelDist = width - marginRight - 30 - marginLeft;
    let rocketVX;
    if (crashPoint <= 1) {
        rocketVX = 0;
    } else {
        const crashTime = Math.log((crashPoint + 1.5) / 2.5) / 0.04;
        rocketVX = Math.min(baseSpeed, travelDist / crashTime);
    }
    let tElapsed = 0;
    function getColorByMultiplier(mult) {
        if (mult < 1.5) return '#00ff00';
        if (mult < 3) return '#ffff00';
        if (mult < 5) return '#ffa500';
        if (mult < 10) return '#ff0000';
        if (mult < 25) return '#8000ff';
        return '#00ffff';
    }
    particles = [];
    let lastTime = null;
    function crashLoop(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const delta = (timestamp - lastTime) / 1000;
        lastTime = timestamp;
        tElapsed += delta;
      
        const increment = (0.06 + multiplier * 0.04) * delta;
        const next = multiplier + increment;


        const autoTarget = parseFloat(document.getElementById('autocashout').value);
        if (!userCashed && autoTarget > 0) {
            const vis = roundDown(multiplier);
            const visNext = roundDown(next);
            if (vis < autoTarget && visNext >= autoTarget) {
                multiplier = autoTarget;
                
                document.getElementById('cashout-crash').click();
         
            } 
        }
        multiplier = next;
        const displayEl = document.getElementById('multiplier-display');
        displayEl.textContent = roundDown(multiplier).toFixed(2) + 'x';
        displayEl.style.color = getColorByMultiplier(multiplier);
        let newX = marginLeft + rocketVX * tElapsed;
        const fractionY = (multiplier - 1) / (maxY - 1);
        const newY = height - marginBottom - fractionY * (height - marginTop - marginBottom);
  
        if (newX > marginLeft + travelDist) {
            newX = marginLeft + travelDist;
        }
        points.push({ x: newX, y: newY });
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const gridLevels = [2, 5, 10, 20, 50, 100];
        for (let level of gridLevels) {
            if (level > maxY) break;
            const ly = height - marginBottom - ((level - 1) / (maxY - 1)) * (height - marginTop - marginBottom);
            ctx.moveTo(marginLeft, ly);
            ctx.lineTo(width - marginRight, ly);
        }
        ctx.moveTo(marginLeft, height - marginBottom);
        ctx.lineTo(width - marginRight, height - marginBottom);
        ctx.stroke();
        const color = getColorByMultiplier(multiplier);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        ctx.restore();
        function renderParticles() {
            const canvas = document.getElementById('crash-canvas');
            const ctx = canvas.getContext('2d');
            ctx.save();
            particles.forEach(p => {
                p.x += p.dx;
                p.y += p.dy;
                p.opacity -= p.decay;
            });
            particles = particles.filter(p => p.opacity > 0);
            particles.forEach(p => {
                ctx.beginPath();
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = p.color;
                ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
            ctx.restore();
            if (particles.length > 0) {
                requestAnimationFrame(renderParticles);
            }
        }

        rocketX = newX;
        rocketY = newY;
        rocketY = Math.min(Math.max(rocketY, marginTop + 20), height - marginBottom - 20);
        const progress = (multiplier - 1) / (maxY - 1);
        const rocketScale = 1 - 0.5 * progress;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.font = `${24 * rocketScale}px sans-serif`;
        

        ctx.restore();
        crashX = rocketX;
        crashY = rocketY;
        if (multiplier >= crashPoint && !historySaved) {
            function triggerCrash() {
                historySaved = true;
                multiplier = crashPoint;
                crashed = true;
                gameRunning = false;
                cashoutBtn.disabled = true;
                startBtn.disabled = false;
                betInput.disabled = false;
             
                canvas.style.filter = 'brightness(2)';
                setTimeout(() => { canvas.style.filter = 'brightness(1)'; }, 100);
                canvas.style.position = 'relative';
                setTimeout(() => { canvas.style.left = '5px'; }, 50);
                setTimeout(() => { canvas.style.left = '-5px'; }, 100);
                setTimeout(() => { canvas.style.left = '3px'; }, 150);
                setTimeout(() => { canvas.style.left = '-3px'; }, 200);
                setTimeout(() => { canvas.style.left = '0px'; }, 250);
                displayEl.textContent = `${multiplier.toFixed(2)}x`;
                displayEl.style.color = '';
                let i = 0;
                const spawnParticles = setInterval(() => {
                    particles.push({
                        x: points.at(-1).x,
                        y: points.at(-1).y,
                        dx: (Math.random() - 0.5) * 8,
                        dy: (Math.random() - 0.5) * 8,
                        radius: Math.random() * 8 + 4,
                        opacity: 1,
                        decay: Math.random() * 0.02 + 0.01,
                        color: `hsl(${Math.random() * 360}, 100%, 50%)`
                    });
                    i++;
                    if (i >= 30) clearInterval(spawnParticles);
                }, 20);
                setTimeout(() => {
                    requestAnimationFrame(renderParticles);
                }, 50);
                resultDisplay.textContent = '💥 Crashed at ' + multiplier.toFixed(2) + 'x';
                resultDisplay.classList.add('text-red-500');
            }
            triggerCrash();
            crashHistory.unshift(multiplier.toFixed(2));
            if (crashHistory.length > 10) crashHistory.pop();
            const historyList = document.getElementById('crash-history-list');
            if (historyList.firstChild && historyList.firstChild.classList.contains('text-gray-500')) {
                historyList.innerHTML = '';
            }
            const li = document.createElement('li');
            li.textContent = `${multiplier.toFixed(2)}x`;
            const val = multiplier;
            if (val < 2) {
                li.classList.add('text-red-500');
            } else if (val >= 10) {
                li.classList.add('text-purple-500');
            } else {
                li.classList.add('text-green-500');
            }
            historyList.prepend(li);
            if (historyList.children.length > 10) {
                historyList.removeChild(historyList.lastChild);
            }
            setTimeout(() => {
                historySaved = false;
            }, 200);
            setTimeout(() => {
                particles = [];
            }, 1500);
        }
        if (gameRunning) {
            requestAnimationFrame(crashLoop);
        }
          if(rocketLoaded) {
            const maxSize = 60;
            const minSize = 30;
            let currentSize;
            if(crashed) {
                currentSize = lastRocketSize ?? maxSize;
            }
            else {
            const progress = Math.min((multiplier - 1)/ (maxY - 1), 1);
            currentSize = maxSize - (maxSize - minSize) * progress;
            lastRocketSize = currentSize;
            }
            let angle = 0;
            if(points.length > 1) {
                const prev = points[points.length - 2];
                const curr = points[points.length - 1];
                angle = Math.atan2(curr.y - prev.y, curr.x - prev.x) + Math.PI / 2;
            }
            ctx.save();
            ctx.translate(rocketX, rocketY);
            ctx.rotate(angle);


            ctx.drawImage(
                rocketImg,
                - currentSize / 2,
                -currentSize / 2,
               currentSize,
               currentSize
            );
            ctx.restore();
        }
    }
    requestAnimationFrame(crashLoop);
});

function getCrashPoint() {
    let r = Math.random();
    if (r < 0.65) return 1 + Math.random() * 0.8;
    if (r < 0.92) return 2 + Math.random() * 8;
    if (r < 0.99) return 10 + Math.random() * 40;
    return 50 + Math.random() * 50;
}

document.getElementById('cashout-crash').addEventListener('click', async () => {
    if (!gameRunning || crashed) return;
    userCashed = true;
    const startBtn = document.getElementById('start-crash');
    const cashoutBtn = document.getElementById('cashout-crash');
    startBtn.disabled = true;
    cashoutBtn.disabled = true;
    const winAmount = crashBetAmount * multiplier;
    try {
        const res = await fetch('/casino/bet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                game: 'crash',
                bet: 0,
                result: 'cashout',
                winAmount
            })
        });
        const data = await res.json();
        if (res.ok) {
            const balanceEl = document.getElementById('balance');
            const prevBalance = parseInt(balanceEl.textContent.replace(/[^0-9]/g, '')) || 0;
            balanceEl.textContent = `🪙 ${data.balance}`;
            if (data.balance > prevBalance) {
                balanceEl.classList.add('text-green-500');
                setTimeout(() => balanceEl.classList.remove('text-green-500'), 1000);
            }
        } else {
            alert(data.message || 'Error updating balance!');
        }
    } catch (err) {
        console.error(err);
    }
    const resultDisplay = document.getElementById('result-crash');
    resultDisplay.classList.remove('text-red-500', 'text-green-500');
    const cashMult = roundDown(multiplier);
    const winDown = Math.floor(crashBetAmount * cashMult * 100) / 100;

    resultDisplay.textContent = `💰 Cashed out at ${cashMult.toFixed(2)}x (+${winDown.toFixed(2)}🪙)`;
    resultDisplay.classList.add('text-green-500');
    return;
});





const lobby = document.getElementById('lobby');
const coingame = document.getElementById('coinflip-game');
const crashGame = document.getElementById('crash-game');
document.getElementById('play-coin').addEventListener('click', () => {
    lobby.classList.add('hidden');
    coingame.classList.remove('hidden');
});
document.getElementById('back-to-lobby').addEventListener('click', () => {
    lobby.classList.remove('hidden');
    coingame.classList.add('hidden');
});
document.getElementById('play-crash').addEventListener('click', () => {
    lobby.classList.add('hidden');
    crashGame.classList.remove('hidden');
    if (crashHistory.length === 0) {
        document.getElementById('crash-history-list').innerHTML = `<li class="text-gray-500">No rounds yet.</li>`;
    }
});
document.getElementById('back-from-crash').addEventListener('click', () => {
    if (gameRunning) {
        gameRunning = false;
        crashed = true;
        document.getElementById('cashout-crash').disabled = true;
        document.getElementById('start-crash').disabled = false;
        document.getElementById('bet-amount-crash').disabled = false;
    }
    lobby.classList.remove('hidden');
    crashGame.classList.add('hidden');
});
document.getElementById('play-roulette').addEventListener('click', () => {
    lobby.classList.add('hidden');
    document.getElementById('roulette-game').classList.remove('hidden');
    if(typeof drawRouletteWheel === 'function') drawRouletteWheel();

});
document.getElementById('back-from-roulette').addEventListener('click', () => {
    document.getElementById('roulette-game').classList.add('hidden');
    lobby.classList.remove('hidden');
});
document.getElementById('play-slots').addEventListener('click', () => {
    lobby.classList.add('hidden');
    document.getElementById('slots').classList.remove('hidden');
});
document.getElementById('back-from-slots').addEventListener('click', () => {
    lobby.classList.remove('hidden');
    document.getElementById('slots').classList.add('hidden');
});

loadBalance();
