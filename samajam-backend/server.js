







const express = require('express');
const pool = require('./db');
const createFestHandler = require('./fest-handler');
const createParticipationHandler = require('./handlers/participation-handler');

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

    if (Number(festId) <= 0 || !Number.isInteger(Number(festId))) {
                return res.status(400).json({
                    error: 'Invalid fest ID'
                });
    }
    pool.query(
        'SELECT fest_id FROM fests WHERE fest_id = ?',
        [festId],
        (err, festResults) => {
            if (err) {
                console.error('Error fetching fest:', err.message);
                return res.status(500).json({
                    error: 'Failed to fetch fest'
                });
            }

            if (festResults.length === 0) {
                return res.status(404).json({
                    error: 'Fest not found'
                });
            }
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
            } res.json(results);
        });    
}); 
});
app.post('/api/fests/:id/programmes', async (req, res) => {
    const festId = req.params.id;
    const { programme_id } = req.body;
    if (
    !Number.isInteger(Number(festId)) ||
    Number(festId) <= 0 ||
    !Number.isInteger(Number(programme_id)) ||
    Number(programme_id) <= 0
) {
    return res.status(400).json({
        error: 'Invalid fest or programme ID'
    });
}

try {
const [festRows] = await pool.promise().query(
    'SELECT fest_id, status FROM fests WHERE fest_id = ?',
    [festId]
);

if (festRows.length === 0) {
    return res.status(404).json({
        error: 'Fest not found'
    });
}

if (festRows[0].status !== 'Pending') {
    return res.status(400).json({
        error: 'Cannot add programme to a completed fest'
    });
}   
const [programmeRows] = await pool.promise().query(
    'SELECT programme_id, is_active FROM programmes WHERE programme_id = ?',
    [programme_id]
);

if (programmeRows.length === 0) {
    return res.status(404).json({
        error: 'Programme not found'
    });
}

if (!programmeRows[0].is_active) {
    return res.status(400).json({
        error: 'Programme is not active'
    });
}

const [insertResults] = await pool.promise().query(
    'INSERT INTO fest_programmes (fest_id, programme_id) VALUES (?, ?)',
    [festId, programme_id]
);

return res.status(201).json({
    message: 'Programme added to fest successfully',
    fest_programme_id: insertResults.insertId });

} catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            error: 'Programme is already added to this fest'
        });
    } else {
        console.error('Error adding programme to fest:', err.message);
        return res.status(500).json({
            error: 'Failed to add programme to fest'
        });
    }

}
});

app.delete('/api/fests/:id/programmes/:programmeId', async (req, res) => {
    const festId = req.params.id;
    const programmeId = req.params.programmeId;
    
    if (!Number.isInteger(Number(festId)) ||
        Number(festId) <= 0 ||
        !Number.isInteger(Number(programmeId)) ||
        Number(programmeId) <= 0
    ) {
        return res.status(400).json({
            error: 'Invalid fest or programme ID'
        });
    }

    try {
        const [festRows] = await pool.promise().query(
            'SELECT fest_id, status FROM fests WHERE fest_id = ?',
            [festId]
        );

        if (festRows.length === 0) {
            return res.status(404).json({
                error: 'Fest not found'
            });
        }

        if (festRows[0].status !== 'Pending') {
            return res.status(400).json({
                error: 'Cannot remove programme from a completed fest'
            });
        }

        const [programmeRows] = await pool.promise().query(
            'SELECT programme_id FROM programmes WHERE programme_id = ?',
            [programmeId]
        );

        if (programmeRows.length === 0) {
            return res.status(404).json({
                error: 'Programme not found'
            });
        }

        const [deleteResults] = await pool.promise().query(
            'DELETE FROM fest_programmes WHERE fest_id = ? AND programme_id = ?',
            [festId, programmeId]
        );

        if (deleteResults.affectedRows === 0) {
            return res.status(404).json({
                error: 'Programme not associated with this fest'
            });
        }

        return res.status(200).json({
            message: 'Programme removed from fest successfully'
        });

    } catch (err) {
        console.error('Error removing programme from fest:', err.message);
        return res.status(500).json({
            error: 'Failed to remove programme from fest'
        });
    }
});

app.post('/api/fests', createFestHandler(pool));

app.post('/api/fests/:id/assignments', async (req, res) => {
    const festId = req.params.id;

const {
    fest_programme_id,
    assigned_participant_id,
    substitute_participant_id,
    category_override,
    notes
} = req.body;

if (!Number.isInteger(Number(festId)) || 
    Number(festId) <= 0 ||
    (typeof fest_programme_id !== 'number' ||
        !Number.isInteger(fest_programme_id) ||
        fest_programme_id <= 0
    ) ||
    (typeof assigned_participant_id !== 'number' ||
        !Number.isInteger(assigned_participant_id) ||
        assigned_participant_id <= 0
    )  ||
    (
    substitute_participant_id !== undefined &&
    substitute_participant_id !== null &&
    (
typeof substitute_participant_id !== 'number' ||
        !Number.isInteger(substitute_participant_id) ||
        substitute_participant_id <= 0
    )
) ||
(notes !== undefined && notes !== null && (typeof notes !== 'string' || notes.length > 255))
) {
    return res.status(400).json({
        error: 'Invalid fest or assignment details'
    });
}

try {
    const [festProgramme] = await pool.promise().query(
        `SELECT fest_programme_id
         FROM fest_programmes
         WHERE fest_programme_id = ? AND fest_id = ?`,
        [fest_programme_id, festId]
    );

    if (festProgramme.length === 0) {
        return res.status(404).json({
            error: 'Fest programme not found'
        });
    }

const [participant] = await pool.promise().query(
    `SELECT participant_id, is_active, category
     FROM participants
     WHERE participant_id = ?`,
    [assigned_participant_id]
);

if (participant.length === 0) {
    return res.status(404).json({
        error: 'Participant not found'
    });
}

if (!participant[0].is_active) {
    return res.status(400).json({
        error: 'Participant is not active'
    });
}

const [assigned] = await pool.promise().query(
    `SELECT assignment_id
     FROM assignments
     WHERE fest_programme_id = ?`,
    [fest_programme_id]
);

if (assigned.length > 0) {
    return res.status(409).json({
        error: 'This fest programme is already assigned to a participant'
    });
}
const [programmeCategory] = await pool.promise().query(
    `SELECT p.allowed_category, p.is_active
     FROM programmes p
     JOIN fest_programmes fp ON p.programme_id = fp.programme_id
     WHERE fp.fest_programme_id = ?`,
    [fest_programme_id]
);
if (programmeCategory.length === 0) {
    return res.status(404).json({
        error: 'Programme not found for this fest programme'
    });
}
if(typeof category_override !== 'boolean') {
    return res.status(400).json({
        error: 'Only boolean values are allowed for category_override'
    });
}
if(!programmeCategory[0].is_active) {
    return res.status(400).json({
        error: 'Programme is not active'
    });
}


if (programmeCategory[0].allowed_category !== 'Both' &&
    !category_override &&
    programmeCategory[0].allowed_category !== participant[0].category
) {
    return res.status(400).json({
        error: 'Participant category does not match programme category'
    });
}

if(substitute_participant_id !== undefined &&
    substitute_participant_id !== null &&
    Number(substitute_participant_id) === Number(assigned_participant_id)) {
    return res.status(400).json({
        error: 'Substitute participant cannot be the same as the assigned participant'
    });
}

if (substitute_participant_id !== undefined &&
     substitute_participant_id !== null) {
        const [substituteParticipant] = await pool.promise().query(
    `SELECT participant_id, is_active, category
     FROM participants
     WHERE participant_id = ?`,
    [substitute_participant_id]
);
    if (substituteParticipant.length === 0) {
        return res.status(404).json({
            error: 'Substitute participant not found'
        });
    }

    if (!substituteParticipant[0].is_active) {
        return res.status(400).json({
            error: 'Substitute participant is not active'
        });
    }

    if (programmeCategory[0].allowed_category !== 'Both' &&
        !category_override &&
        programmeCategory[0].allowed_category !== substituteParticipant[0].category
    ) {
        return res.status(400).json({
            error: 'Substitute participant category does not match programme category'
        });
    }
}

const [result] = await pool.promise().query(
    `INSERT INTO assignments (
    fest_programme_id,
    assigned_participant_id,
    substitute_participant_id,
    category_override,
    notes
)
VALUES (?, ?, ?, ?, ?)`,
    [fest_programme_id, assigned_participant_id, substitute_participant_id ?? null, category_override, notes ?? null]
);
return res.status(201).json({
    message: 'Participant assigned to fest programme successfully',
    assignment_id: result.insertId

});
} catch (err) {
    console.error('Error inserting assignment:', err.message);
    return res.status(500).json({
        error: 'Failed to assign participant to fest programme'
    });
}
});

app.post('/api/fests/:id/participation-records', createParticipationHandler(pool));



app.get('/', (req, res) => {
  res.send('Samajam Management API is running!');
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
