function createParticipationHandler(pool) {
    return async (req, res) => {
        const festId = Number(req.params.id);

        const {
            assignment_id,
            actual_participant_id,
            participated
        } = req.body;
    

    if (!Number.isInteger(festId) || festId <=0) {
        return res.status(400).json({
            error: 'Invalid fest ID'
        });
    }
    if( !Number.isInteger(assignment_id) || assignment_id <=0) {
        return res.status(400).json({
            error: 'Invalid assignment ID'
        });
    }
    if(!Number.isInteger(actual_participant_id) || actual_participant_id <=0) {
        return res.status(400).json({
            error: 'Invalid actual participant ID'
        });
    }
    if(participated !== true && participated !== false) {
        return res.status(400).json({
            error: 'Participated must be a boolean value'
        });
    }
    try{

    const [festRows] = await pool.promise().query(
        'SELECT * FROM fests WHERE fest_id = ?',
        [festId]
    );

    if (festRows.length === 0 ) {
        return res.status(404).json({
            message: 'Fest not found'
        });
    }
    const [assignmentRows] = await pool.promise().query(
        `SELECT *
        FROM assignments a
        JOIN fest_programmes fp
        ON a.fest_programme_id = fp.fest_programme_id
        WHERE a.assignment_id = ?
        AND fp.fest_id = ?`,
        [assignment_id, festId]
    );
    if (assignmentRows.length === 0 ) {
        return res.status(404).json({
            message: 'Assignment not found'
        });
    }
    const [participantRows] = await pool.promise().query(
    'SELECT * FROM participants WHERE participant_id = ?',
    [actual_participant_id]
    );
    if (participantRows.length === 0 ) {
        return res.status(404).json({
            message: 'Participant not found'
        });
    }
    if (participantRows[0].is_active !== 1) {
        return res.status(400).json({
            error: 'Participant is inactive'
        });
    }
    const [recordRows] = await pool.promise().query(
        'SELECT * FROM participation_records WHERE assignment_id = ?',
        [assignment_id]
    );
    if (recordRows.length > 0) {
        return res.status(409).json({
            error: 'Participation already exists'
        });
    }
    const [insertResults] = await pool.promise().query(
        'INSERT INTO participation_records (assignment_id, actual_participant_id, participated) VALUES (?, ?, ?)',
        [assignment_id, actual_participant_id, participated]
    );

    return res.status(201).json({
        message: 'Participation created successfully',
        record_id: insertResults.insertId
    });
} catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            error: 'Participation already exists'
        });
    }
    console.error('Error creating participation:', error);
    return res.status(500).json({
        error: 'Internal server error'
    });
}

};
}

module.exports = createParticipationHandler;