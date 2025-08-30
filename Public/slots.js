(() => {
    const SYMBOLS = [
        {k: 'W', emoji:'⭐', w:4, pay3:50},
        {k: '7', emoji:'7️⃣', w:2, pay3:100},
        {k: 'D', emoji:'💎', w:5, pay3:40},
        {k: 'B', emoji:'🔔', w:10, pay3:12},
        {k: 'L', emoji:'🍋', w:18, pay3:8},
        {k: 'C', emoji:'🍒', w:24, pay3:5},
    ];
    const LINES = [
        [[0,0], [1,0], [2,0]],
        [[0,1], [1,1], [2,1]],
        [[0,2], [1,2], [2,2]],
    ];
    const UI = {
        section: document.getElementById('slots'),
        balance: document.getElementById('balance'),
        bet: document.getElementById('bet'),
        lines: document.getElementById('lines'),
        spin: document.getElementById('spin-slots'),
        fast: document.getElementById('fast'),
        auto: document.getElementById('auto'),
        stopAuto: document.getElementById('stop-auto'),
        status: document.getElementById('status-slots'),
        history: document.getElementById('history-slots'),
        board: document.getElementById('board'),
        reels: () => Array.from(UI.board.querySelectorAll(':scope > div')),
        lineEls: [0,1,2].map(i => document.getElementById(`line-${i}`)),
    };
    
    const state = {
        balance:0,
        spinning: false,
        fast:false,
        auto:false,
    };

const formatCoins = n => (Math.floor(n*100)/100).toLocaleString('en-US', {maximumFractionDigits:2});
const setStatus = (msg, ok = true) => {
    UI.status.textContent = msg;
    UI.status.classList.toggle('text-emerald-400', ok);
    UI.status.classList.toggle('text-rose-400', !ok);

};
const rndWeighedIndex = (weights) => {
    const total = weights.reduce((a,b) => a+ b, 0);
    let r = Math.random()* total;
    for(let i = 0;i<weights.length;i++) {
        if(r < weights[i]) return i;
        r -= weights[i];
    }
    return weights.length-1;
};
const pickSymbolKey = () => {
    const idx = rndWeighedIndex(SYMBOLS.map(s=>s.w));
    return SYMBOLS[idx].k;

};
const emoji0f = k => SYMBOLS.find(s => s.k === k)?.emoji ?? '❓';
const pays = k => SYMBOLS.find(s => s.k === k)?.pay3 ?? 0;

function highlight(lines) {
UI.lineEls.forEach(el => el && el.classList.replace('bg-emerald-400/80', 'bg-emerald-400/0'));
lines.forEach(i => {
    const el = UI.lineEls[i];
    if(el) {
        el.classList.replace('bg-emerald-400/0','bg-emerald-400/80');
        setTimeout(() => el.classList.replace('bg-emerald-400/80', 'bg-emerald-400/0'),1200);
    }
});
}


const generateGrid = () => {
    const g = [];
    for(let y =0; y<3;y++){
        const row = [];
        for(let x = 0; x<3;x++) row.push(pickSymbolKey());
        g.push(row);
    }
    return g;
};
    function evaluate(grid, betPerLine, selectedLines) {
        let totalWin = 0;
        const winners = [];
        const maxLines = Math.min(selectedLines, 3);
        for(let i = 0; i < maxLines; i++) {
            const coords = LINES[i];
            const keys = coords.map(([x, y]) => grid[y][x]);
            const wilds = keys.filter(k => k==='W').length;
            let baseKey = null;

        if(wilds === 0) {
            if(keys[0] === keys[1] && keys[1] === keys[2]) baseKey = keys[0];
        }
        else if(wilds === 1) {
            const nonW = keys.filter(k => k!== 'W');
            if(nonW.length === 2 && nonW[0] === nonW[1]) baseKey = nonW[0];
        }
        else if(wilds === 2) {
            baseKey = keys.find(k => k!== 'W') ?? 'W';
        }
        else {
            baseKey = 'W';
        }
        if(baseKey) {
            const linePay = betPerLine * (wilds === 1 ? pays(baseKey)/2 : pays(baseKey));
            if(linePay > 0) {
                totalWin += linePay;
                winners.push(i);
            }
        }
        }
        return {totalWin, winners};
    }

    function renderFinalGridToBoard(grid) {
        const reels = UI.reels();
        for(let x = 0; x<3;x++) {
            const colCells = reels[x].querySelectorAll('.grid-rows-3 > div');
            for(let y = 0;y<3;y++) {
                colCells[y].textContent = emoji0f(grid[y][x]);
            }
        }
    }

    function animateReel(reelEl, duration, fast) {
        const cells = reelEl.querySelectorAll('.grid-rows-3 > div');
        let tick = 0;
        const step = fast ? 45 : 90;
        return new Promise(resolve => {
            const timer = setInterval(() => {
                cells.forEach(c => {
                    c.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].emoji;
                });
                tick += step;
                if(tick >= duration) {
                    clearInterval(timer);
                    resolve();
                }
            }, step);
        });
    }
    async function spinOnce() {
        if(state.spinning) return;
        const betPerLine = Math.max(1, parseInt(UI.bet.value || '1', 10));
        const linesCount = Math.max(1, parseInt(UI.lines.value || '1', 10));
        const usedLines = Math.min(linesCount, 3);
        const cost = betPerLine * usedLines;
        if(state.balance < cost) {
            setStatus('Not enough NestCoins!',false);
            return;
        }
        state.spinning = true;
        highlight([]);
        state.balance -= cost;
        UI.balance.textContent = `🪙 ${formatCoins(state.balance)}`;
        setStatus(`Bet ${betPerLine} x ${usedLines} (= ${formatCoins(cost)})`);
        const reels = UI.reels();
        const baseDur = state.fast ? 500 : 1200;
        await animateReel(reels[0], baseDur + 0, state.fast);
        await animateReel(reels[1], baseDur + (state.fast?100:250), state.fast);
        await animateReel(reels[2], baseDur + (state.fast?200:500), state.fast);

        const grid = generateGrid();
        renderFinalGridToBoard(grid);
        const {totalWin, winners} = evaluate(grid, betPerLine, usedLines);
        if(totalWin > 0) {
            state.balance += totalWin;
            setStatus(`+ ${formatCoins(totalWin)}`, true);
            highlight(winners);
        }
        else {
            setStatus('You lost' , false);
        }
        UI.balance.textContent = `🪙 ${formatCoins(state.balance)}`;

        const row = document.createElement('div');
        row.className = 'flex justify-between text-sm border-b border-slate-800/60 pb-1';
        row.innerHTML = `
        <span class = "text-slate-400">${new Date().toLocaleTimeString()}</span>
        <span> Bet: ${betPerLine} x ${usedLines} (= ${formatCoins(cost)})</span>
        <span>${totalWin > 0 ? 'Win' + formatCoins(totalWin): 'Lose'}</span>`;
        UI.history.prepend(row);
        state.spinning = false;

        
    }
    async function autoLoop() {
        if(!state.auto) return;
        if(!state.spinning) await spinOnce();
        if(!state.auto) return;

        setTimeout(autoLoop, state.fast ? 250 : 700);
    }

    async function initBalance() {

        try {
            const res = await fetch('/api/profile');
            if(res.ok) {
                const data = await res.json();
                state.balance = typeof data.coins === 'number' ? data.coins : 0;
            }
        }
        catch(err) {
            alert('You are not authorized', err)
            return;
        }
        UI.balance.textContent = `🪙 ${formatCoins(state.balance)}`;
        
    }
    function initOpenButtonIfExists(){
        const btn = document.getElementById('open-slots');
        if(btn && UI.section) {
            btn.addEventListener('click', () => {
                UI.section.classList.remove('hidden');
                UI.section.scrollIntoView({behavior:'smooth', block:'start'});
            });
        }
    }

    function bindControls() {
        UI.spin?.addEventListener('click',spinOnce);
            UI.fast?.addEventListener('click', () => {
            state.fast = !state.fast;
            UI.fast.textContent = `Fast: ${state.fast ? 'ON' : 'OFF'}`;
        });

       
            UI.auto?.addEventListener('click', () => {
            state.auto = !state.auto;
            UI.auto.textContent = `Auto: ${state.auto ? 'ON' : 'OFF'}`;
            UI.stopAuto.disabled = !state.auto;
            if(state.auto) autoLoop();
        });

        UI.stopAuto.addEventListener('click', () => {
            state.auto = false;
            UI.auto.textContent = 'AUTO:OFF';
            UI.stopAuto.disabled = true;

        });
    }
    window.addEventListener('DOMContentLoaded', async() => {
        await initBalance();
        initOpenButtonIfExists();
        bindControls();
        setStatus('Ready');
    });
    
})();