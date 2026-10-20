

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

app.post('/api/fests', async (req, res) => {
    const { team_id, planned_date } = req.body;

    
    if (!team_id) {
        return res.status(400).json({
            error: 'Team ID is required'
        });
    }

    const [teamRows] = await pool.promise().query(
  'SELECT * FROM teams WHERE team_id = ?',
  [team_id]
);

    if( teamRows.length === 0) {
        return res.status(400).json({
            message: 'Invalid team ID'
        });
    }
 
    
    pool.query(
        `SELECT fest_id, team_id, status
         FROM fests
         ORDER BY fest_id DESC
         LIMIT 1`,
        (err, results) => {
            if (err) {
                console.error('Error checking latest fest:', err.message);
                return res.status(500).json({
                    error: 'Failed to check latest fest'
                });
            }

           
            if (results.length > 0 && results[0].status === 'Pending') {
                return res.status(400).json({
                    error: 'The previous fest must be completed first'
                });
            }

            
            if (
                results.length > 0 &&
                Number(team_id) === results[0].team_id
            ) {
                return res.status(400).json({
                    error: 'The next fest must belong to the opposite team'
                });
            }

           
            pool.query(
                'INSERT INTO fests (team_id, planned_date) VALUES (?, ?)',
                [team_id, planned_date || null],
                (err, insertResults) => {
                    if (err) {
                        console.error('Error creating fest:', err.message);
                        return res.status(500).json({
                            error: 'Failed to create fest'
                        });
                    }

                    res.status(201).json({
                        message: 'Fest created successfully',
                        fest_id: insertResults.insertId
                    });
                }
            );
        }
    );
});

app.get('/', (req, res) => {
  res.send('Samajam Management API is running!');
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});