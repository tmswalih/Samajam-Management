const pool = require('./db');

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
    return;
  }

  console.log('Connected to MySQL successfully!');
  console.log('Database:', connection.config.database);

  connection.query(
    'SELECT team_id, team_name FROM teams',
    (err, results) => {
      if (err) {
        console.error('Error fetching teams:', err.message);
      } else {
        console.log('Teams:', results);
      }

      connection.release();
    }
  );
});