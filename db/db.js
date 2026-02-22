const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = {
    connectionString: process.env.DATABASE_URL
};

// Required for AWS RDS, but breaks local/GitHub Actions tests
if (process.env.NODE_ENV !== 'test') {
    poolConfig.ssl = {
        rejectUnauthorized: false
    };
}

const pool = new Pool(poolConfig);

// Test connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Database connected:', res.rows[0].now);
    }
});

module.exports = pool;