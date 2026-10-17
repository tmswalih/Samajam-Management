const pool = require('./db');

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
    return;
  }

  console.log('Connected to MySQL successfully!');
  connection.release(); 
});