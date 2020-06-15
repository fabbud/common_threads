const connection = require('./conf');
const express = require('express');
const app = express();
const port = 3000;
​
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
​
const { check, validationResult } = require('express-validator');
​
// GET - HOME
app.get('/', (req, res) => {
  res.send('Hello common threats');
});
​
// (1) GET - Retrieve all of the data from your table
app.get('/api/series', (request, response) => {
  connection.query('SELECT * from series', (err, results) => {
    if (err) {
      response.status(500).send('Error retrieving series');
    } else {
      response.json(results);
    }
  });
});
​
// (2) GET - Retrieve specific fields (i.e. series names)
app.get('/api/series/:field', (request, response) => {
  const getParam = request.params.field;
  connection.query(`SELECT ${getParam} from series`, (err, results) => {
    if (err) {
      response.status(500).send('Error retrieving series');
    } else {
      response.json(results);
    }
  });
});
​
// (3) GET - Retrieve a data set with the filter contains a string
app.get('/api/series', (request, response) => {
  let sqlQuery = 'SELECT * FROM series';
  let sqlValues = [];
  const getQuerys = request.query;
  const getKeys = Object.keys(request.query);
​
  // if (request.query.name) {
  //   getValue = `%${request.query.name}%`;
  //   sqlQuery += ' WHERE name like ?';
  //   sqlValues.push(getValue);
  // }
​
//http://localhost:3000/api/games?nameGame=Creed&date=
  sqlValues = getKeys.map( (query, index) => {
    getValue = `%${getQuerys[query]}%`;
    if (index === 0) {
      sqlQuery += ` WHERE ${query} like ?`;
    } else {
      sqlQuery += ` AND ${query} like ?`;
    }
    return getValue;
  })
​
  connection.query(sqlQuery, sqlValues, (err, results) => {
    if (err) {
      response.status(500).send('Error retrieving series');
    } else {
      response.json(results);
    }
  });
});
​
// (4) GET - Retrieve a data set with the filter starts with...
app.get('/api/series', (request, response) => {
  let sqlQuery = 'SELECT * FROM series';
  let sqlValues = [];
  const getQuerys = request.query;
  const getKeys = Object.keys(request.query);
​
  // if (request.query.name) {
  //   getValue = `${request.query.name}%`;
  //   sqlQuery += ' WHERE name like ?';
  //   sqlValues.push(getValue);
  // }
​
  sqlValues = getKeys.map( (query, index) => {
    getValue = `${getQuerys[query]}%`;
    if (index === 0) {
      sqlQuery += ` WHERE ${query} like ?`;
    } else {
      sqlQuery += ` AND ${query} like ?`;
    }
    return getValue;
  })
​
  connection.query(sqlQuery, sqlValues, (err, results) => {
    if (err) {
      response.status(500).send('Error retrieving series');
    } else {
      response.json(results);
    }
  });
});
​
// (5) GET - Retrieve a data set with the date filter greater than...
app.get('/api/series', (request, response) => {
  let sqlQuery = 'SELECT * FROM series';
  const sqlValues = [];
​
  if (request.query.premiere) {
    sqlQuery += ' WHERE premiere > ?';
    if (request.query.premiere.length === 4) {
      sqlValues.push(`${request.query.premiere}-01-01`);
    } else {
      sqlValues.push(`${request.query.premiere}`);
    }
  }
  
  connection.query(sqlQuery, sqlValues, (err, results) => {
    if (err) {
      response.status(500).send('Error retrieving series');
    } else {
      response.json(results);
    }
  });
});
​
// (6) GET - Ordered data recovery - The order should be passed as a route parameter
app.get('/api/series/:order', (request, response) => {
  const getOrder = request.params.order;
​
  connection.query(`SELECT * FROM series ORDER BY id ${getOrder}`, (err, results) => {
    if (err) {
      response.status(500).json({
        error: 'Error retrieving series',
        sql: err.sql,
      });
    } else {
      response.json(results);
    }
  });
});
​
​
// (7) POST - Insertion of a new entity
const userValidationMiddlewares = [
  check('name').isLength({ min: 2 }),
  check('premiere').isISO8601(),
  check('watched').isBoolean()
];
app.post('/api/series', userValidationMiddlewares, (request, response) => {
  const formData = request.body;
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    return response.status(422).json({ errors: errors.array() });
  } else {
    connection.query('INSERT INTO series SET ?', formData, (err, results) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return response.status(409).json({
            error: 'Series already exists',
          });
        }
        return response.status(500).json({
          error: err.message,
          sql: err.sql,
        });
      }
      // Show new user information
      return connection.query('SELECT * FROM series WHERE id = ?', results.insertId, (err2, records) => {
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
      });
    }) 
  }
});
​
​
// (8) PUT - Modification of an entity
app.put('/api/series/:id', userValidationMiddlewares, (request, response) => {
  const idSeries = request.params.id;
  const formData = request.body;
  const errors = validationResult(request);
​
  if (!errors.isEmpty()) {
    return response.status(422).json({ errors: errors.array() });
  }
  connection.query('UPDATE series SET ? WHERE id = ?', [formData, idSeries], (err, results) => {
    if (err) {
      return response.status(500).json({
        error: err.message,
        sql: err.sql,
      });
    }
    if (results.changedRows !== 0 || results.affectedRows !== 0) {
      // Show updated user information
      return connection.query('SELECT * FROM series WHERE id = ?', [idSeries], (err2, records) => {
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
          .status(200)
          .set('Location', location)
          .json(insertedUser);
      });
    } else {
      response.status(404).send(`Series does not exist`);
    }
  })
});
​
​
// (9) PUT - Toggle a Boolean value
app.put('/api/series/:id', (request, response) => {
  const idSeries = request.params.id;
  connection.query('UPDATE series SET watched = !watched WHERE id = ?', [idSeries], (err, results) => {
    if (err) {
      return response.status(500).json({
        error: err.message,
        sql: err.sql,
      });
    }
    if (results.changedRows !== 0 || results.affectedRows !== 0) {
      return connection.query('SELECT * FROM series WHERE id = ?', [idSeries], (err2, records) => {
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
          .status(200)
          .set('Location', location)
          .json(insertedUser);
      });
    } else {
      response.status(404).send(`Series does not exist`);
    }
  })
});
​
// (10) DELETE - Delete an entity
app.delete('/api/series/:id', (request, response) => {
  const idSeries = request.params.id;
  connection.query('DELETE FROM series WHERE id = ?', [idSeries], (err, results) => {
    if (err) {
      response.status(500).json({
        error: `Error deleting a movie`,
        sql: err.sql,
      });
    } else {
      response.sendStatus(200);
    }
  });
});
​
// (11) DELETE - Delete all entities where boolean value is false
app.delete('/api/series', (request, response) => {
  connection.query('DELETE FROM series WHERE watched IS FALSE', (err, results) => {
    if (err) {
      response.status(500).json({
        error: `Error deleting not watched series`,
        sql: err.sql,
      });
    } else {
      response.sendStatus(200);
    }
  });
});
​
app.listen(port, () => console.log(`Listening on ${port}`));
C