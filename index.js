require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const connection = require('./conf');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const { check, validationResult } = require('express-validator');

//Home
app.get('/', (req, res) => {
  res.send('Welcome to My Games database');
});

// 1: GET - Retrieve all of the data from your table
app.get('/api/games', (req, res) => {
  connection.query('SELECT * FROM games', (err, results) => {
    if (err) {
      res.status(500).json({
        error: err.message,
        sql: err.sql,
      });
    } else {
      res.json(results);
    }
  });
});

//2: GET - Retrieve specific fields (i.e. id, names, dates, etc.)
app.get('/api/games/:field', (req, res) => {
  const field = req.params.field;
  connection.query(`SELECT ${field} FROM games`, (err, results) => {
    if (err) {
      res.status(500).json({
        error: err.message,
        sql: err.sql,
      });
    } else {
      res.json(results);
    }
  });
});

// 3: GET - Retrieve a data set with the following filters (use one route per filter type):

// 3.1: A filter for data that contains... (e.g. name containing the string 'wcs')
app.get('/api/games', (req, res) => {
  let sqlQuery = 'SELECT * FROM games';
  let sqlValues = [];
  let getValue = '';
  if (req.query.name) {
    getValue = `%${req.query.name}%`;
    sqlQuery += ' WHERE name like ?';
    sqlValues.push(getValue);
  }
  console.log(sqlValues);

  connection.query(sqlQuery, sqlValues, (err, results) => {
    if (err) {
      res.status(500).send('Error retrieving games');
    } else {
      res.json(results);
    }
  });
});

//3.2: A filter for data that starts with... (e.g. name beginning with 'campus')
app.get('/api/games', (req, res) => {
  let sqlQuery = 'SELECT * FROM games';
  let sqlValues = [];
  let getValue = '';
  if (req.query.name) {
    getValue = `${req.query.name}%`;
    sqlQuery += ' WHERE name like ?';
    sqlValues.push(getValue);
  }
  console.log(sqlValues);

  connection.query(sqlQuery, sqlValues, (err, results) => {
    if (err) {
      res.status(500).send('Error retrieving games');
    } else {
      res.json(results);
    }
  });
});

//3.3: A filter for data that is greater than... (e.g. date greater than 18/10/2010)
app.get('/api/games', (req, res) => {
  let sqlQuery = 'SELECT * FROM games';
  let sqlValues = [];
  let releaseDate = req.query.releaseDate;
  if (releaseDate) {
    sqlQuery += ' WHERE releaseDate > ?';
    if (releaseDate.length === 4) {
      sqlValues.push(`${releaseDate}-01-01`);
    } else {
      sqlValues.push(releaseDate);
    }
  }

  connection.query(sqlQuery, sqlValues, (err, results) => {
    if (err) {
      res.status(500).send('Error retrieving games');
    } else {
      res.json(results);
    }
  });
});

//4: GET - Ordered data recovery (i.e. ascending, descending) - The order should be passed as a route parameter
//http://localhost:3000/api/games/ASC
app.get('/api/games/:order', (req, res) => {
  let orderBy = req.params.order;

  connection.query(
    `SELECT * FROM games ORDER BY name ${orderBy}`,
    (err, results) => {
      if (err) {
        res.status(500).send('Error retrieving games');
      } else {
        res.json(results);
      }
    },
  );
});

// 5: POST - Insertion of a new entity
const gameValidation = [
  check('name').isLength({ min: 2 }),
  check('releaseDate').isISO8601(),
  check('isPurchased').isBoolean(),
];

app.post('/api/games', gameValidation, (request, response) => {
  const formData = request.body;
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    return response.status(422).json({ errors: errors.array() });
  } else {
    connection.query('INSERT INTO games SET ?', formData, (err, results) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return response.status(409).json({
            error: 'Game already exists',
          });
        }
        return response.status(500).json({
          error: err.message,
          sql: err.sql,
        });
      }
      //showing new game info
      return connection.query(
        'SELECT * FROM games WHERE id = ?',
        results.insertId,
        (err2, records) => {
          if (err2) {
            return response.status(500).json({
              error: err2.message,
              sql: err2.sql,
            });
          }
          const insertedUser = records[0];
          const host = request.get('host');
          const location = `http://${host}${request.url}/${insertedUser.id}`;
          return response
            .status(201)
            .set('Location', location)
            .json(insertedUser);
        },
      );
    });
  }
});

//6: PUT - Modification of an entity
app.put('/api/games/:id', (req, res) => {
  const formData = req.body;
  const id = req.params.id;

  return connection.query(
    'UPDATE games SET ? WHERE id = ?',
    [formData, id],
    (err, results) => {
      if (err) {
        return res.status(500).json({
          error: err.message,
          sql: err.sql,
        });
      }
      return connection.query(
        'SELECT * FROM games WHERE id = ?',
        [id],
        (err2, records) => {
          if (err2) {
            return res.status(500).json({
              error: err2.message,
              sql: err2.sql,
            });
          }
          const updatedGame = records[0];
          return res.status(201).json(updatedGame);
        },
      );
    },
  );
});

// 7: PUT - Toggle a Boolean value
app.put('/api/games/:id', (req, res) => {
  const gameId = req.params.id;

  return connection.query(
    'UPDATE games SET isPurchased = !isPurchased WHERE id = ?',
    [gameId],
    (err, results) => {
      if (err) {
        return res.status(500).json({
          error: err.message,
          sql: err.sql,
        });
      }
      return connection.query(
        'SELECT * FROM games WHERE id = ?',
        [gameId],
        (err2, records) => {
          if (err2) {
            return res.status(500).json({
              error: err2.message,
              sql: err2.sql,
            });
          }
          const updatedGame = records[0];
          return res.status(201).json(updatedGame);
        },
      );
    },
  );
});

// 8: DELETE - Delete an entity
app.delete('/api/games/:id', (req, res) => {
  const gameId = req.params.id;

  return connection.query(
    `DELETE FROM games WHERE id = ${gameId}`,
    (err, results) => {
      if (err) {
        return res.status(500).json({
          error: err.message,
          sql: err.sql,
        });
      }
      return connection.query('SELECT * FROM games', (err2, records) => {
        if (err2) {
          return res.status(500).json({
            error: err2.message,
            sql: err2.sql,
          });
        }
        return res.status(201).json(records);
      });
    },
  );
});

// 9: DELETE - Delete all entities where boolean value is false
app.delete('/api/games/not_purchased', (req, res) => {
  return connection.query(
    `DELETE FROM games WHERE isPurchased is FALSE`,
    (err, results) => {
      if (err) {
        return res.status(500).json({
          error: 'Error deleting not purchased games',
          sql: err.sql,
        });
      }
      return connection.query('SELECT * FROM games', (err2, records) => {
        if (err2) {
          return res.status(500).json({
            error: err2.message,
            sql: err2.sql,
          });
        }
        return res.status(201).json(records);
      });
    },
  );
});

app.listen(process.env.PORT, (err) => {
  if (err) {
    throw new Error('Something bad happened...');
  }

  console.log(`Server is listening on ${process.env.PORT}`);
});
