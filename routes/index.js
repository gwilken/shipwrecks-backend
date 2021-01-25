// routes/index.js
const router = require('express').Router()
const bodyParser = require('body-parser')
const jsonParser = bodyParser.json()
const { Client } = require('@elastic/elasticsearch')
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const log = require('../utils/log')

const ELASTIC_PATH = process.env.ELASTIC_PATH || 'localhost:9200'
const ELASTIC_INDEX = process.env.ELASTIC_INDEX || 'wrecks'
const MONGO_PATH = process.env.MONGO_PATH || 'mongodb://0.0.0.0:27017';
const MONGO_DB = process.env.MONGO_DB || 'wrecks'
const MONGO_COLLECTION = process.env.MONGO_COLLECTION || '1.0'


let collection;

log('[ EXPRESS ] - Elastic Path:', ELASTIC_PATH)
log('[ EXPRESS ] - Mongo Path:', MONGO_PATH)

const elasticClient = new Client({ 
  node: `http://${ELASTIC_PATH}`
})

MongoClient.connect(MONGO_PATH, { useNewUrlParser: true, useUnifiedTopology: true }, async (err, client) => {
  if (err) {
    console.error('[ EXPRESS ] - Cant connect to Mongo:', err);
    client.close()
    process.exit()
  } else {
    console.log('[ EXPRESS ] - Mongo Ready.');   
    const db = client.db(MONGO_DB);
    collection = db.collection(MONGO_COLLECTION)
  }
});


router.post('/ping', (req, res) => {
  log('[ EXPRESS ] - ping on post /ping')
  res.send('PONG')
})


router.get('/ping', (req, res) => {
  log('[ EXPRESS ] - ping on get /ping')
  res.send('PONG')
})


router.post('/id', jsonParser, async (req, res) => {
  let objId = new ObjectID(req.body.id)
  collection.find({_id: objId}).toArray((err, doc) => {
    if (err) {
      res.send({
        error: true,
        error_message: err,
        results: null,
      })
    } else {
      res.send({
        results: doc,
        error: false,
        error_message: null,
      })
    }
  })  
})


router.get('/id/:id', async (req, res) => {
  let objId = new ObjectID(req.params.id)
  collection.find({_id: objId}).toArray((err, doc) => {
    if (err) {
      res.send({
        error: true,
        error_message: err,
        results: null,
      })
    } else {
      res.send({
        results: doc,
        error: false,
        error_message: null,
      })
    }
  })  
})


router.get('/geobox/:topRightLon/:topRightLat/:bottomLeftLon/:bottomLeftLat', async (req, res) => {  
  const { topRightLon, topRightLat, bottomLeftLon, bottomLeftLat } = req.params
  const topRight = [parseFloat(topRightLon), parseFloat(topRightLat)]
  const bottomLeft = [parseFloat(bottomLeftLon), parseFloat(bottomLeftLat)]

  let result = await elasticClient.search({
    index: ELASTIC_INDEX,
    body: {
      "size": 5000,
      "_source": ["vessel_name", "location_latitude", "location_longitude", "year_sunk", "id", "history_summary"],
      "query": {
        "bool" : {
          "must" : {
            "match_all" : {}
          },
          "filter" : {
            "geo_bounding_box" : {
              "location" : {
                "top_right" : topRight,
                "bottom_left" : bottomLeft
              }
            }
          }
        }
      }
    } 
  }).catch(err => {
    res.json(err.body.error)
  })
  if (result) {
    res.json(result.body)
  }
})


router.get('/near/:geoname', async (req, res) => {
  const { geoname } = req.params

  let geonameRes = await elasticClient.search({
    index: 'geonames',
    body: {
      "size": 1,
      "_source": ["location", "name"],
      "query": {
        "multi_match": {
          "query": geoname,
          "fields": ["name"]
        }
      }
    } 
  })

  if (geonameRes.body.hits.hits.length > 0) {
    let { lat, lon } = geonameRes.body.hits.hits[0]._source.location
    let wrecksRes = await elasticClient.search({
      index: ELASTIC_INDEX,
      body: {
        "size": 500,
        "query": {
          "bool" : {
            "must" : {
              "match_all" : {}
            },
            "filter" : {
              "geo_distance" : {
                "distance" : "75km",
                "location" : {
                  "lat": lat, 
                  "lon": lon
                }
              }
            }
          }
        }
      } 
    })

  if (wrecksRes.body.hits.hits.length > 0) {
    res.json({'name': geonameRes.body.hits.hits[0]._source.name, 'hits': wrecksRes.body.hits.hits})
  } else {
    res.send([])
  }

  } else {
    res.send([])
  }
})


router.get('/location/:lat/:lon/:distance', async (req, res) => {
  const { lat, lon, distance } = req.params
  let result = await elasticClient.search({
    index: ELASTIC_INDEX,
    body: {
      "size": 10000,
      "query": {
        "bool" : {
          "must" : {
            "match_all" : {}
          },
          "filter" : {
            "geo_distance" : {
              "distance" : distance,
              "location" : {
                "lat": lat, 
                "lon": lon
              }
            }
          }
        }
      }
    } 
  })
  res.json(result.body)
})


router.get('/meta/:query/:limit', async (req, res) => {
  const { query, limit } = req.params
  let result = await elasticClient.search({
    index: ELASTIC_INDEX,
    body: {
      "size" : limit,
      'query': {
        'multi_match': {
          'query': query,
          'fields': ['history', 'vessel_name']
        }
      }
    } 
  })
  res.json(result.body)
})


router.get('/id/:query', async (req, res) => {
  const { query } = req.params
  let result = await elasticClient.search({
    index: ELASTIC_INDEX,
    body: {
      'query': {
        'match': {
          'tempest_id': query
        }
      }
    } 
  })
 
  if (result.body.hits.hits[0]._source) {
    res.json(result.body.hits.hits[0]._source)
  } else {
    res.send()
  }
})

module.exports = router
