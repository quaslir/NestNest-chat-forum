let rouletteRunning = false;
let rouletteAngle = 0;
let rouletteSpeed = 0;
let wininngNumber = null;
const numbers = [
    {num: 0, color :'green'},
    {num: 1, color :'red'},
    {num: 2, color :'black'},
    {num: 3, color :'red'},
    {num: 4, color :'black'},
    {num: 5, color :'red'},
    {num: 6, color :'black'},
    {num: 7, color :'red'},
    {num: 8, color :'black'},
    {num: 9, color :'red'},
    {num: 10, color :'black'},
    {num: 11, color :'black'},
    {num: 12, color :'red'},
    {num: 13, color :'black'},
    {num: 14, color :'red'},
    {num: 15, color :'black'},
    {num: 16, color :'red'},
    {num: 17, color :'black'},
    {num: 18, color :'red'},
    {num: 19, color :'black'},
    {num: 20, color :'red'},
    {num: 21, color :'black'},
    {num: 22, color :'red'},
    {num: 23, color :'black'},
    {num: 24, color :'red'},
    {num: 25, color :'black'},
    {num: 26, color :'red'},
    {num: 27, color :'black'},
    {num: 28, color :'red'},
    {num: 29, color :'black'},
    {num: 30, color :'red'},
    {num: 31, color :'black'},
    {num: 32, color :'red'},
    {num: 33, color :'black'},
    {num: 34, color :'red'},
    {num: 35, color :'black'},
    {num: 36, color :'red'},
];
function drawRoulette (ctx, radius) {
    const sectorAngle = (2 * Math.PI) / numbers.length;
    ctx.clearRect(0,0, ctx.canvas.width, ctx.canvas.height);
    ctx.rotate(rouletteAngle);
    numbers.forEach((item, i) => {
        ctx.beginPath();
        ctx.fillStyle = 'white';
        ctx.font = `${radius * 0.1}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.rotate(i * sectorAngle * sectorAngle / 2);
        ctx.translate(radius * 0.85, 0);
        ctx.rotate(Math.PI / 2);
        ctx.fillText(item.num, 0,0 );
        ctx.restore();

    });
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(ctx.canvas.width / 2 - 10, 10);
    ctx.lineTo(ctx.canvas.width / 2 + 10, 10);
    ctx.lineTo(ctx.canvas.width / 2, 40);
    ctx.closePath();
    ctx.fillStyle = 'gold';
    ctx.fill();

}
function spinRoulette() {
    if(rouletteRunning) return;
    rouletteRunning = true;
    rouletteSpeed = Math.random() * 0.3 + 0.25;
    const spinInterval = setInterval(() => {
        rouletteAngle += rouletteSpeed;
        rouletteSpeed *= 0.985;
        const canvas = document.getElementById('roulette-canvas');
        const ctx = canvas.getContext('2d');
        drawRoulette(ctx, canvas.width / 2 - 10);
        if(rouletteSpeed < 0.002) {
            clearInterval(spinInterval);
            rouletteRunning = false;
            determineWinner();

        }
    },16);
 }
 function determineWinner() {
    const sectorAngle = (2* Math.PI) / numbers.length;
    let normalizedAngle = rouletteAngle % (2 * Math.PI);
    normalizedAngle = (2 * Math.PI - normalizedAngle + Math.PI / 2) % (2 * Math.PI);
    const winningIndex = Math.floor(normalizedAngle / sectorAngle);
    wininngNumber = numbers[winningIndex];
    document.getElementById('roulette-result').textContent = `🎯 Winning number: ${wininngNumber.num} (${wininngNumber.color})`;
 }
 document.getElementById('spin-roulette').addEventListener('click', spinRoulette);