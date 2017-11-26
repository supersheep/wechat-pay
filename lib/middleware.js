var Payment = require('./payment').Payment;
var AES = require('./aes');
var parseXml = require('./parseXml');
var md5 = require('md5');
var util = require('util');

var getRawBody = function (req, callback) {
  if (req.rawBody) {
    return callback(null, req.rawBody);
  }

  var data='';
  req.setEncoding('utf8');
  req.on('data', function(chunk) {
     data += chunk;
  });

  req.on('end', function() {
    req.rawBody = data;
    callback(null, data);
  });
};

/**
 * 中间件基础类
 * @class Basic
 * @constructor
 * @param {String} partnerKey
 * @param {String} appId
 * @param {String} mchId
 * @param {String} notifyUrl
 * @param {String} pfx appkey
 * @chainable
 */
function Basic(config){
  this.payment = new Payment(config);
  return this;
}

/**
 * 完成中间件配置，并返回中间件
 * @method done
 * @for Basic
 * @chainable
 * @param  {Function} [handler] 默认处理方法
 */
Basic.prototype.done = function (handler) {
  var self = this;
  var payment = self.payment;
  return function (req, res, next) {
    if (req.method !== 'POST') {
      var error = new Error();
      error.name = 'NotImplemented';
      return self.fail(error, res);
    }
    getRawBody(req, function (err, rawBody) {
      if (err) {
        err.name = 'BadMessage' + err.name;
        return self.fail(err, res);
      }
      payment.validate(rawBody, function(err, message){
        res.reply = function(data){
          if(data instanceof Error){
            self.fail(data, res);
          }else{
            self.success(data, res);
          }
        };

        if(err){
          return self.fail(err, res);
        }

        handler(message, req, res, next);
      });
    });
  };
};


Basic.prototype.success = function(result, res){
  return res.end(this.payment.buildXml({
    return_code: 'SUCCESS'
  }));
};

Basic.prototype.fail = function(err, res){
  return res.end(this.payment.buildXml({
    return_code: 'FAIL',
    return_msg: err.name
  }));
};

function Notify(config){
  if (!(this instanceof Notify)) {
    return new Notify(config);
  }
  Basic.call(this,config);
  return this;
}

util.inherits(Notify, Basic);

/**
 * 中间件基础类
 * @class Refund
 * @constructor
 * @param {String} partnerKey
 * @param {String} appId
 * @param {String} mchId
 * @param {String} notifyUrl
 * @param {String} pfx appkey
 * @chainable
 */
function Refund(config){
  this.key = md5(config.partnerKey).toLowerCase();
  this.payment = new Payment(config);
  return this;
}

/**
 * 完成中间件配置，并返回中间件
 * @method done
 * @for Refund
 * @chainable
 * @param  {Function} [handler] 默认处理方法
 */
Refund.prototype.done = function (handler) {
  var self = this;
  var payment = self.payment;
  var key = self.key;

  return function (req, res, next) {
    if (req.method !== 'POST') {
      var error = new Error();
      error.name = 'NotImplemented';
      return self.fail(error, res);
    }
    getRawBody(req, function (err, rawBody) {
      if (err) {
        err.name = 'BadMessage' + err.name;
        return self.fail(err, res);
      }

      payment.validate(rawBody, function(err, message){
        res.reply = function(data){
          if(data instanceof Error){
            self.fail(data, res);
          }else{
            self.success(data, res);
          }
        };

        if(err){
          return self.fail(err, res);
        }

        var refundResXml;
        try {
          var aes = new AES(key, 'aes-256-ecb');
          refundResXml = aes.decode(message.req_info);
        } catch (e) {
          return self.fail(e, res);
        }

        try {
          parseXml(refundResXml, function(e, refundRes) {
            if (e) {
              return self.fail(e, res);
            }
  
            handler(refundRes, req, res, next);
          });
        } catch (e) {
          return self.fail(e, res);
        }
      });
    });
  };
};
function RefundNotify(config){
  if (!(this instanceof RefundNotify)) {
    return new RefundNotify(config);
  }
  Refund.call(this,config);

  return this;
}

util.inherits(Refund, Basic);
util.inherits(RefundNotify, Refund);


var middleware = function (config) {
  return {
    getNotify: function () {
      return new Notify(config);
    },
    getRefundNotify: function () {
      return new RefundNotify(config);
    }
  };
};

middleware.Notify = Notify;

module.exports = middleware;
