const https = require('https');
const fs = require('fs');
const csv = require('csv-parser');
const precalculate = Math.PI/180;
const radiusOfEarth = 6371; // in km
const filename = 'coffee_shops.csv';

// This function is to download and save data file from a Url
const downloadRemoteFile = (filename, url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode != 200) {
        reject (`Failed to download file from ${url}`);
      } else {
        resolve(res);
      }
    });
  }).then((result) => {
    const path = `${__dirname}/${filename}`; 
    return new Promise((resolve, reject) => {
      const filePath = fs.createWriteStream(path);
      result.pipe(filePath)
        .on('finish',() => {
          filePath.close();
          resolve(true);
        })
        .on('error', reject);
    });  
  });
}

const readFile = (filename) => {
  let rows = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filename)
      .pipe(csv(['name', 'lat', 'lon']))
      .on('data', (data) => {
        if (!data.name || !data.lat || !data.lon) {
          reject (`Invalid row`);
        }
        rows.push(data);
      })
      .on('end', () => {
        resolve (rows);
      }).on('error', () => {
        reject (`Failed to read file ${filename}`);
      })
  });
}

// This function is calculate the distance between 2 geo location using Haversine formula
const getDistanceFrom2GeoLocation = (lat1, lon1, lat2, lon2) => {
  const deltaLat = (lat2 - lat1) * precalculate;
  const deltaLon = (lon2 - lon1) * precalculate;
  const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
    Math.cos(lat1 * precalculate) * Math.cos(lat2 * precalculate) * 
    Math.sin(deltaLon/2) * Math.sin(deltaLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return (radiusOfEarth * c); // distance in km
}

const start = async () => {
  // get input from the command line
  const [ lat, lon, fileUrl ] = process.argv.slice(2);
  if (!lat || !lon || !fileUrl) {
    console.log(`Please provide latitude, longitude and data file url`);
    return false;
  }
  // download and save file from a Url
  await downloadRemoteFile (filename, fileUrl);
  // read the downloaded file and parse to JSON format
  let rows = await readFile (filename);
  let distances = [];
  // calculate the distance netween 2 geolocation
  for (const row of rows) {
    distances.push({ 
      name: row.name, 
      distance: parseFloat(getDistanceFrom2GeoLocation (lat, lon, row.lat, row.lon).toFixed(4))
    });
  }
  // sort the object array by distance and show first 3 nearest location
  distances = distances.sort((a, b) => (a.distance > b.distance) ? 1 : -1).slice(0, 3);

  for (const row of distances) {
    console.log(`${row.name},${row.distance}`);
  }  
}

start();
