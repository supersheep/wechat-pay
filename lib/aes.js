var crypto = require('crypto');

function AES(key, algorithm) {
  if (!this instanceof AES) {
    return new AES();
  }

  var iv = algorithm.indexOf('ecb') > -1 ? '' : key;
  this.cipher = crypto.createCipheriv(algorithm, key, iv);
  this.decipher = crypto.createDecipheriv(algorithm, key, iv);
  this.decipher.setAutoPadding(false);

  return this;
}

AES.prototype.decode = function(str, inputEncoding, outputEncoding) {
  inputEncoding = inputEncoding || 'base64';
  outputEncoding = outputEncoding || 'utf8';

  var decipherChunks = [];
  decipherChunks.push(this.decipher.update(str, inputEncoding, outputEncoding));
  decipherChunks.push(this.decipher.final(outputEncoding));
  return decipherChunks.join('');
}

module.exports = AES;
