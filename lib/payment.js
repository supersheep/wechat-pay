var md5 = require('MD5');
var sha1 = require('sha1');
var request = require('request');
var _ = require('underscore');
var xml2js = require('xml2js');

var signTypes = {
  MD5: md5,
  SHA1: sha1
};

var RETURN_CODES = {
  SUCCESS: "SUCCESS",
  FAIL: "FAIL"
};

var URLS = {
  UNIFIED_ORDER: "https://api.mch.weixin.qq.com/pay/unifiedorder",
  REFUND: "https://api.mch.weixin.qq.com/secapi/pay/refund",
  REFUND_QUERY: "https://api.mch.weixin.qq.com/pay/refundquery",
  DOWNLOAD_BILL: "https://api.mch.weixin.qq.com/pay/downloadbill",
  SHORT_URL: "https://api.mch.weixin.qq.com/tools/shorturl"
};

var Payment = function (config) {
  this.appId = config.appId;
  this.partnerId = config.partnerId;
  this.partnerKey = config.partnerKey;
  this.mchId = config.mchId;
  this.subMchId = config.subMchId;
  this.notifyUrl = config.notifyUrl
  return this;
};

Payment.prototype.getBrandWCPayRequestParams = function (order, callback) {
  var self = this;
  var default_params = {
    appId: this.appId,
    timeStamp: this._generateTimeStamp(),
    nonceStr: this._generateNonceStr(),
    signType: "MD5"
  };

  order = this._extendWithDefault(order, [
    'appid',
    'mch_id',
    'sub_mch_id',
    'nonce_str',
    'notify_url'
  ]);

  this._getUnifiedOrder(order, function (err, data) {
    if (err) {
      return callback(err);
    }

    var params = _.extend(default_params, {
      package: "prepay_id=" + data.prepay_id,
      paySign: self._getSign(order)
    });

    callback(null, params);
  });
};

Payment.prototype._getUnifiedOrder = function (order, callback) {
  var self = this;
  var params = _.extend({
    "sign": this._getSign(order)
  }, order);

  request({
    url: URLS.UNIFIED_ORDER,
    method: "POST",
    body: this.buildXml(params)
  }, function (err, response, body) {
    if (err) {
      return callback(err);
    }

    self.validate(body, callback);
  });
};

Payment.prototype.buildXml = function(obj){
  var builder = new xml2js.Builder();
  var xml = builder.buildObject(obj);
  return xml;
}

Payment.prototype.validate = function(xml, callback){
  var self = this;
  xml2js.parseString(xml, {
    trim: true,
    explicitArray: false
  }, function (err, json) {
    var error = null, data;
    if (err) {
      error = new Error();
      err.name = "XMLParseError";
      return callback(err)
    }

    data = json.xml;

    if (data.return_code == RETURN_CODES.FAIL) {
      error = new Error(data.return_msg);
      error.name = "ProtocolError";
    }

    else if (data.result_code == RETURN_CODES.FAIL) {
      error = new Error(data.err_code);
      error.name = "BusinessError";
    }

    else if (self.appId !== data.appid) {
      error = new Error();
      error.name = "InvalidAppId";
    }

    else if (self.mchId !== data.mch_id) {
      error = new Error();
      error.name = "InvalidMchId";
    }

    else if (self.subMchId !== data.sub_mch_id) {
      error = new Error();
      error.name = "InvalidSubMchId";
    }

    else if (self._getSign(data) !== data.sign){
      error = new Error();
      error.name = "InvalidSignature";
    }

    callback(error, data);
  });
}

/**
 * 使用默认值扩展对象
 * @param  {Object} obj
 * @param  {Array} keysNeedExtend
 * @return {Object} extendedObject
 */
Payment.prototype._extendWithDefault = function (obj, keysNeedExtend) {
  var defaults = {
    appid: this.appId,
    mch_id: this.mchId,
    sub_mch_id: this.subMchId,
    nonce_str: this._generateNonceStr(),
    notify_url: this.notifyUrl
  };
  var extendObject = {};
  keysNeedExtend.forEach(function (k) {
    if (defaults[k]) {
      extendObject[k] = defaults[k];
    }
  });
  return _.extend(extendObject, obj);
}

Payment.prototype._getSign = function (pkg, signType) {
  pkg = _.clone(pkg);
  delete pkg.sign;
  signType = signType || "MD5";
  var string1 = this._toQueryString(pkg);
  var stringSignTemp = string1 + "&key=" + this.partnerKey;
  var signValue = signTypes[signType](stringSignTemp).toUpperCase();
  return signValue;
};

Payment.prototype._toQueryString = function (object) {
  return Object.keys(object).filter(function (key) {
    return object[key] !== undefined && object[key] !== '';
  }).sort().map(function (key) {
    return key + "=" + object[key];
  }).join("&");
}

Payment.prototype._generateTimeStamp = function () {
  return parseInt(+new Date() / 1000, 10) + ""
};

/**
 * [_generateNonceStr description]
 * @param  {[type]} length [description]
 * @return {[type]}        [description]
 */
Payment.prototype._generateNonceStr = function (length) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var maxPos = chars.length;
  var noceStr = "";
  var i;
  for (i = 0; i < (length || 32); i++) {
    noceStr += chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return noceStr;
};

exports.Payment = Payment;