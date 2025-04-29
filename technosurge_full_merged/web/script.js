document.getElementById('tapButton').addEventListener('click', async () => {
  const username = prompt('Enter your Telegram username (without @):');
  if (!username) return;

  const res = await fetch(`/api/balance/${username}`);
  const data = await res.json();

  if (data.balance) {
    document.getElementById('balance').innerText = `USDT: ${data.balance}`;
  }
});
