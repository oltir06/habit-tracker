const axios = require('axios');

const API_URL = 'http://localhost:3000';
let accessToken = '';

// Login and get token
async function login() {
    const response = await axios.post(`${API_URL}/auth/login`, {
        email: 'test@example.com',
        password: 'Test123456'
    });
    accessToken = response.data.accessToken;
    console.log('✅ Logged in');
}

// Test single endpoint
async function testEndpoint(endpoint, name) {
    const start = Date.now();
    await axios.get(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const duration = Date.now() - start;
    return { name, duration };
}

// Run load test
async function runLoadTest() {
    console.log('🚀 Starting load test...\n');

    await login();

    // Test without cache (first request)
    console.log('📊 Testing WITHOUT cache (first request):');
    const withoutCache = [];
    withoutCache.push(await testEndpoint('/habits', 'GET /habits'));
    withoutCache.push(await testEndpoint('/habits/stats', 'GET /habits/stats'));

    withoutCache.forEach(test => {
        console.log(`  ${test.name}: ${test.duration}ms`);
    });

    // Test with cache (second request)
    console.log('\n📊 Testing WITH cache (second request):');
    const withCache = [];
    withCache.push(await testEndpoint('/habits', 'GET /habits'));
    withCache.push(await testEndpoint('/habits/stats', 'GET /habits/stats'));

    withCache.forEach(test => {
        console.log(`  ${test.name}: ${test.duration}ms`);
    });

    // Calculate improvement
    console.log('\n📈 Performance Improvement:');
    for (let i = 0; i < withoutCache.length; i++) {
        const improvement = (withoutCache[i].duration / withCache[i].duration).toFixed(1);
        console.log(`  ${withoutCache[i].name}: ${improvement}x faster`);
    }

    // Sustained load test
    console.log('\n⚡ Sustained load test (100 requests):');
    const sustainedStart = Date.now();
    const promises = [];
    for (let i = 0; i < 100; i++) {
        promises.push(testEndpoint('/habits', 'GET /habits'));
    }
    await Promise.all(promises);
    const sustainedDuration = Date.now() - sustainedStart;
    console.log(`  100 requests completed in ${sustainedDuration}ms`);
    console.log(`  Average: ${(sustainedDuration / 100).toFixed(2)}ms per request`);

    // Get cache stats
    const metrics = await axios.get(`${API_URL}/metrics`);
    console.log('\n📊 Cache Statistics:');
    console.log(`  Hits: ${metrics.data.cache_hits}`);
    console.log(`  Misses: ${metrics.data.cache_misses}`);
    console.log(`  Hit Rate: ${metrics.data.cache_hit_rate}`);
    console.log(`  Total Keys: ${metrics.data.cache_total_keys}`);
}

runLoadTest().catch(console.error);
