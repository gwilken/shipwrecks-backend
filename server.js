const express = require('express');
const compression = require('compression');
const routes = require('./routes');
const path = require('path');

const log = require('./utils/log');

const PORT = process.env.PORT || 4000;

//const { setSecureHeaders } = require('./middleware');

const app = express();

app.use(compression());

// app.use(setSecureHeaders);

app.use('/api', routes);

app.use(express.static('./build'));

app.listen(PORT, function() {
  log('[ EXPRESS ] - Express listening on port:', PORT);
})
