var util = require('util');
var events = require('events');
var chai = require('chai-nightwatch');
var expect = chai.expect;
var ChaiAssertion = chai.Assertion;
var Q = require('q');
var flag = require('chai-nightwatch/lib/chai/utils/flag.js');

module.exports = function(client) {
  var Protocol = require('./protocol.js')(client);
  var PresentAssertion = require('./expect/present.js');
  var AttributeAssertion = require('./expect/attribute.js');
  var CssAssertion = require('./expect/css.js');
  var TextAssertion = require('./expect/text.js');
  var EnabledAssertion = require('./expect/enabled.js');
  var VisibleAssertion = require('./expect/visible.js');
  var SelectedAssertion = require('./expect/selected.js');
  var TypeAssertion = require('./expect/type.js');
  var ValueAssertion = require('./expect/value.js');
  var Expect = {};

  ChaiAssertion.addMethod('before', function(ms) {
    var present = flag(this, 'present');
    flag(this, 'waitFor', ms);
    flag(this, 'before', true);
  });

  ChaiAssertion.addMethod('after', function(ms) {
    var present = flag(this, 'present');
    flag(this, 'after', true);
    flag(this, 'waitFor', ms);
  });

  ChaiAssertion.addProperty('present', function() {
    createAssertion(PresentAssertion, this);
  });

  ChaiAssertion.addProperty('enabled', function() {
    createAssertion(EnabledAssertion, this);
  });

  ChaiAssertion.addProperty('text', function() {
    createAssertion(TextAssertion, this);
  });

  ChaiAssertion.addProperty('value', function() {
    createAssertion(ValueAssertion, this);
  });

  ChaiAssertion.addProperty('visible', function() {
    createAssertion(VisibleAssertion, this);
  });

  ChaiAssertion.addProperty('selected', function() {
    createAssertion(SelectedAssertion, this);
  });

  ChaiAssertion.addMethod('attribute', function(attribute) {
    createAssertion(AttributeAssertion, this, [attribute]);
  });

  ChaiAssertion.addMethod('css', function(property) {
    createAssertion(CssAssertion, this, [property]);
  });

  function type(t) {
    createAssertion(TypeAssertion, this, [t]);
  }
  ChaiAssertion.addMethod('a', type);
  ChaiAssertion.addMethod('an', type);

  function createAssertion(AssertionClass, chaiAssert, args) {
    function F() {
      this.setAssertion(chaiAssert)
        .setClient(client)
        .setProtocol(Protocol)
        .init();

      return AssertionClass.apply(this, args);
    }
    F.prototype = AssertionClass.prototype;
    return new F();
  }

  function Element(selector, using) {
    this.selector = selector;
    this.locator = using || 'css selector';
    this.deferred = Q.defer();
    this.startTime = null;
    this.emitter = null;
  }
  util.inherits(Element, events.EventEmitter);

  Element.prototype.promise = function() {
    return this.deferred.promise;
  };

  Element.prototype.locate = function(emitter) {
    if (emitter) {
      this.emitter = emitter;
      this.startTime = new Date().getTime();
    }

    Protocol.elements(this.locator, this.selector, function(result) {
      if (result.status !== 0 || !result.value || result.value.length === 0) {
        this.deferred.reject(result);
      } else {
        this.deferred.resolve(result.value[0]);
      }
    }.bind(this));
  };

  Expect.element = function(selector, using) {
    var element = new Element(selector, using);
    var promise = element.promise();
    var expect  = chai.expect(promise);

    flag(expect, 'selector', selector);
    flag(expect, 'promise', promise);
    flag(expect, 'element', element);

    return {
      element : element,
      expect : expect
    };
  };

  return Expect;
};