fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [{ role: 'user', parts: [{ text: 'Hello' }] }] })
}).then(res => res.json()).then(console.log).catch(console.error);
