var xml2js = require('xml2js');

function parseXml(xml, callback) {
  xml2js.parseString(xml, {
    trim: true,
    explicitArray: false
  }, function(err, json) {
    var error = null,
      data;
    if (err) {
      error = new Error();
      err.name = 'XMLParseError';
      return callback(err, xml);
    }

    data = json ? (json.xml || json.root) : {};

    callback(error, data);
  });
}

module.exports = parseXml;
