const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testAuth() {
  console.log('🧪 Testing Authentication Endpoints...\n');

  try {
    // Test 1: Register a new user
    console.log('1️⃣ Testing Registration...');
    const registerData = {
      username: 'testuser' + Date.now(),
      email: `test${Date.now()}@example.com`,
      password: 'test123456',
      fullName: 'Test User'
    };
    
    const registerResponse = await axios.post(`${API_URL}/auth/register`, registerData);
    console.log('✅ Registration successful!');
    console.log('Token:', registerResponse.data.token ? 'Received' : 'Missing');
    console.log('User:', registerResponse.data.user);
    
    const token = registerResponse.data.token;
    const username = registerResponse.data.user.username;
    
    // Test 2: Login with the same user
    console.log('\n2️⃣ Testing Login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: username,
      password: 'test123456'
    });
    console.log('✅ Login successful!');
    console.log('Token:', loginResponse.data.token ? 'Received' : 'Missing');
    
    // Test 3: Verify token
    console.log('\n3️⃣ Testing Token Verification...');
    const verifyResponse = await axios.get(`${API_URL}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Token verification successful!');
    console.log('User:', verifyResponse.data.user);
    
    console.log('\n✅ All authentication tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAuth();
