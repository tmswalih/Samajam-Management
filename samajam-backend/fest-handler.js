function createFestHandler(pool) {
    return async (req, res) => {
        const { team_id, planned_date } = req.body;

        if (!team_id) {
            return res.status(400).json({
                error: 'Team ID is required'
            });
        }

        try {
            const [teamRows] = await pool.promise().query(
                'SELECT * FROM teams WHERE team_id = ?',
                [team_id]
            );

            if (teamRows.length === 0) {
                return res.status(400).json({
                    message: 'Invalid team ID'
                });
            }

            const [festRows] = await pool.promise().query(
                `SELECT fest_id, team_id, status
                 FROM fests
                 ORDER BY fest_id DESC
                 LIMIT 1`
            );

            if (festRows.length > 0 && festRows[0].status === 'Pending') {
                return res.status(400).json({
                    error: 'The previous fest must be completed first'
                });
            }

            if (
                festRows.length > 0 &&
                Number(team_id) === festRows[0].team_id
            ) {
                return res.status(400).json({
                    error: 'The next fest must belong to the opposite team'
                });
            }

            const [insertResults] = await pool.promise().query(
                'INSERT INTO fests (team_id, planned_date) VALUES (?, ?)',
                [team_id, planned_date || null]
            );

            return res.status(201).json({
                message: 'Fest created successfully',
                fest_id: insertResults.insertId
            });
        } catch (err) {
            console.error('Error creating fest:', err.message);
            return res.status(500).json({
                error: 'Failed to create fest'
            });
        }
    };
}

module.exports = createFestHandler;
