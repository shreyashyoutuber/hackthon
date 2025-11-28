(async () => {
  const base = 'http://localhost:3000';
  try {
    console.log('1) Sending verification...');
    let r = await fetch(base + '/api/send-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.user@example.com', fullName: 'Test User', userType: 'student', skipEmail: true })
    });
    let j = await r.json();
    console.log('send-verification response:', j);

    const code = j.code || '000000';

    console.log('\n2) Verifying code:', code);
    r = await fetch(base + '/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.user@example.com', code })
    });
    j = await r.json();
    console.log('verify-code response:', j);

    console.log('\n3) Creating user...');
    r = await fetch(base + '/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.user@example.com', password: 'Testing123' })
    });
    j = await r.json();
    console.log('create-user response:', j);

  } catch (err) {
    console.error('Test script error:', err);
  }
})();
