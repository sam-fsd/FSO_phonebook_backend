require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const Person = require('./models/person');
const axios = require('axios');

morgan.token('body', (req, res) => JSON.stringify(req.body));

const app = express();

app.use(express.json());
app.use(cors());
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms :body')
);
app.use(express.static('dist'));

app.get('/api/persons', (req, res) => {
  Person.find({}).then((people) => {
    res.json(people);
  });
});

app.get('/info', (req, res) => {
  const dateTime = new Date().toString();
  Person.find({}).then((people) => {
    const info = `
    <p>Phonebook has info for ${people.length} people</p>
    <p>${dateTime}</p>`;
    res.send(info);
  });
});

app.get('/api/persons/:id', (req, res, next) => {
  Person.findById(req.params.id)
    .then((foundPerson) => {
      res.status(200).json(foundPerson);
    })
    .catch((error) => next(error));
});

app.delete('/api/persons/:id', (req, res, next) => {
  Person.findByIdAndDelete(req.params.id)
    .then((result) => {
      res.status(204).end();
    })
    .catch((error) => next(error));
});

app.put('/api/persons/:id', (req, res, next) => {
  const body = req.body;

  const person = {
    name: body.name,
    number: body.number,
  };

  const opts = { runValidators: true, new: true };

  Person.findByIdAndUpdate(req.params.id, person, opts)
    .then((result) => {
      res.status(201).json(result);
    })
    .catch((error) => {
      next(error);
    });
});

app.post('/api/persons', (req, res, next) => {
  const body = req.body;

  if (!body.name) {
    return res.status(400).json({ error: 'Missing the name' });
  }
  if (!body.number) {
    return res.status(400).json({ error: 'Missing the number' });
  }

  Person.findOne({ name: body.name })
    .then((foundPerson) => {
      if (foundPerson) {
        let idStr = foundPerson.id;
        const data = {
          name: body.name,
          number: body.number,
        };
        axios
          .put(`${BASE_URL}/api/persons/${idStr}`, data)
          .then((result) => {
            res.status(200).json(result.data);
          })
          .catch((error) => {
            next(error);
          });
      } else {
        const person = new Person({
          name: body.name,
          number: body.number,
        });

        person
          .save()
          .then((savedPerson) => {
            res.status(201).json(savedPerson);
          })
          .catch((error) => next(error));
      }
    })
    .catch((error) => {
      console.log(error);
      next(error);
    });
});

const errorHandler = (error, req, res, next) => {
  console.error(error.message);

  if (error.name === 'CastError') {
    return res.status(400).send({ error: 'Malformatted id' });
  } else if (error.name === 'ValidationError') {
    return res.status(400).json({ error: error.message });
  }

  next(error);
};

app.use(errorHandler);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
