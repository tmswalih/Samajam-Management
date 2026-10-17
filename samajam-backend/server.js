
const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());

app.get('/api/teams', (req, res) => {
    pool.query('SELECT * FROM teams', (err, results) => {
        if (err) {
            console.error('Error fetching teams:', err.message);
            return res.status(500).json({
                error: 'Failed to fetch teams'
            });
        }

        res.json(results);
    });
});

app.get('/api/participants', (req, res) => {
  pool.query('SELECT * FROM participants', (err, results) => {
      if (err) {
          console.error('Error fetching participants:', err.message);
          return res.status(500).json({
              error: 'Failed to fetch participants'
          });
      }

      res.json(results);
  });
});

app.get('/api/programmes', (req, res) => {
  pool.query('SELECT * FROM programmes', (err, results) => {
      if (err) {
          console.error('Error fetching programmes:', err.message);
          return res.status(500).json({
              error: 'Failed to fetch programmes'
          });
      }

      res.json(results);
  });
});

app.get('/api/fests', (req, res) => {
  pool.query(`SELECT f.*, t.team_name
 FROM fests f
 JOIN teams t ON f.team_id = t.team_id`,
  (err, results) => {
      if (err) {
          console.error('Error fetching fests:', err.message);
          return res.status(500).json({
              error: 'Failed to fetch fests'
          });
      }

      res.json(results);
  });
});

app.get('/api/fests/:id', (req, res) => {
  pool.query(`SELECT f.*, t.team_name
 FROM fests f
 JOIN teams t ON f.team_id = t.team_id
 WHERE f.fest_id = ?`,
     [req.params.id], 
     (err, results) => {
         if (err) {
             console.error('Error fetching fest:', err.message);
             return res.status(500).json({
                 error: 'Failed to fetch fest'
             });
         }
         if (results.length === 0) {
             return res.status(404).json({
                 error: 'Fest not found'
             });
         }

         res.json(results);
     });
});
app.get('/api/fests/:id/programmes', (req, res) => {
    const festId = req.params.id;

    pool.query(
        `SELECT p.*
         FROM fest_programmes fp
         JOIN programmes p
             ON fp.programme_id = p.programme_id
         WHERE fp.fest_id = ?`,
        [festId],
        (err, results) => {
            if (err) {
                console.error('Error fetching fest programmes:', err.message);
                return res.status(500).json({
                    error: 'Failed to fetch fest programmes'
                });
            }

            res.json(results);
        }
    );
});


app.get('/', (req, res) => {
  res.send('Samajam Management API is running!');
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});