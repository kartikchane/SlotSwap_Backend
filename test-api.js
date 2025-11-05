import fetch from 'node-fetch';

const testSignup = async () => {
  try {
    console.log('Testing signup endpoint...');
    const response = await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'password123'
      })
    });

    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', text);

    if (response.ok) {
      const data = JSON.parse(text);
      console.log('✓ Signup successful!');
      console.log('Token:', data.token.substring(0, 20) + '...');
      console.log('User:', data.user);
    } else {
      console.log('✗ Signup failed');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testSignup();
