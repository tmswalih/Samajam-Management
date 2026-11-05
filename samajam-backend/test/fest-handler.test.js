const { test } = require('node:test');
const assert = require('node:assert/strict');
const createFestHandler = require('../fest-handler');

function createPoolMock({ teams = [1, 2], latestFest = null } = {}) {
    const insertedRows = [];
    let nextFestId = 10;

    const pool = {
        promise() {
            return {
                async query(sql, params = []) {
                    if (sql.includes('FROM teams')) {
                        const teamId = Number(params[0]);
                        return [teams.includes(teamId) ? [{ team_id: teamId }] : [], []];
                    }

                    if (sql.includes('FROM fests')) {
                        return [latestFest ? [latestFest] : [], []];
                    }

                    if (sql.includes('INSERT INTO fests')) {
                        insertedRows.push({ team_id: params[0], planned_date: params[1] });
                        return [{ insertId: nextFestId++ }, []];
                    }

                    throw new Error(`Unexpected query: ${sql}`);
                }
            };
        }
    };

    return { pool, insertedRows };
}

async function callHandler(handler, body) {
    let result;
    const res = {
        status(statusCode) {
            result = { statusCode };
            return this;
        },
        json(jsonBody) {
            result.body = jsonBody;
            return this;
        }
    };

    await handler({ body }, res);
    return result;
}

test('rejects creating a fest while the latest fest is Pending', async () => {
    const { pool, insertedRows } = createPoolMock({
        latestFest: { fest_id: 9, team_id: 1, status: 'Pending' }
    });

    const result = await callHandler(createFestHandler(pool), { team_id: 2 });

    assert.equal(result.statusCode, 400);
    assert.equal(result.body.error, 'The previous fest must be completed first');
    assert.equal(insertedRows.length, 0);
});

test('rejects consecutive fests assigned to the same team', async () => {
    const { pool, insertedRows } = createPoolMock({
        latestFest: { fest_id: 9, team_id: 1, status: 'Completed' }
    });

    const result = await callHandler(createFestHandler(pool), { team_id: 1 });

    assert.equal(result.statusCode, 400);
    assert.equal(result.body.error, 'The next fest must belong to the opposite team');
    assert.equal(insertedRows.length, 0);
});

test('creates an opposite-team fest after the latest fest is completed', async () => {
    const { pool, insertedRows } = createPoolMock({
        latestFest: { fest_id: 9, team_id: 1, status: 'Completed' }
    });

    const result = await callHandler(createFestHandler(pool), { team_id: 2 });

    assert.equal(result.statusCode, 201);
    assert.equal(result.body.message, 'Fest created successfully');
    assert.equal(result.body.fest_id, 10);
    assert.deepEqual(insertedRows, [{ team_id: 2, planned_date: null }]);
});

test('rejects a team ID that does not exist', async () => {
    const { pool, insertedRows } = createPoolMock({ teams: [1, 2] });

    const result = await callHandler(createFestHandler(pool), { team_id: 3 });

    assert.equal(result.statusCode, 400);
    assert.equal(result.body.message, 'Invalid team ID');
    assert.equal(insertedRows.length, 0);
});
