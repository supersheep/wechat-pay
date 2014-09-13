var Payment = require('./payment').Payment;
var util = require('util');

var getRawBody = function (req, callback) {
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
 * @param {String} appid
 * @param {String} paysignkey appkey
 * @param {String} partnerid
 * @param {String} partnerkey
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
        }

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
}

Basic.prototype.fail = function(err, res){
  return res.end(this.payment.buildXml({
    return_code: 'FAIL',
    return_msg: err.name
  }));
}

function Alarm(config){
  if (!(this instanceof Alarm)) {
    return new Alarm(config);
  }
  return this;
}
util.inherits(Alarm, Basic);

function Notify(config){
  if (!(this instanceof Notify)) {
    return new Notify(config);
  }
  Basic.call(this,config);
  return this;
}
util.inherits(Notify, Basic);

function PayFeedback(config){
  if (!(this instanceof PayFeedback)) {
    return new PayFeedback(config);
  }
  Basic.call(this,config);
  return this;
}
util.inherits(PayFeedback, Basic);

function BizPayGetPackage(config){
  if (!(this instanceof BizPayGetPackage)) {
    return new BizPayGetPackage(config);
  }
  Basic.call(this,config);
  return this;
}
util.inherits(BizPayGetPackage, Basic);

var middleware = function (config) {
  return {
    getPayFeedback: function () {
      return new PayFeedback(config);
    },
    getBizPayGetPackage: function () {
      return new BizPayGetPackage(config);
    },
    getNotify: function () {
      return new Notify(config);
    },
    getAlarm: function () {
      return new Alarm(config);
    }
  }
};

middleware.PayFeedback = PayFeedback;
middleware.BizPayGetPackage = BizPayGetPackage;
middleware.Notify = Notify;
middleware.Alarm = Alarm;

module.exports = middleware;