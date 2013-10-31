
/**
 * Module dependencies
 */

var _ = require('lodash'),
    utils = require('../../../utils/helpers'),
    hasOwnProperty = utils.object.hasOwnProperty;

/**
 * Model.toObject()
 *
 * Returns a cloned object containing just the model
 * values. Useful for doing operations on the current values
 * minus the instance methods.
 *
 * @param {Object} context, Waterline collection instance
 * @param {Object} proto, model prototype
 * @api public
 * @return {Object}
 */

var toObject = module.exports = function(context, proto) {

  this.context = context;
  this.proto = proto;

  this.object = Object.create(proto.__proto__);

  this.addAssociations();
  this.addProperties();
  this.makeObject();
  this.filterJoins();
  this.filterFunctions();

  return this.object;
};


/**
 * Add Association Keys
 *
 * If a showJoins flag is active, add all association keys.
 *
 * @param {Object} keys
 * @api private
 */

toObject.prototype.addAssociations = function() {
  var self = this;

  if(!this.proto._properties) return;
  if(!this.proto._properties.showJoins) return;

  // Copy prototype over for attributes
  for(var association in this.proto.associations) {

    // Handle hasMany attributes
    if(hasOwnProperty(this.proto.associations[association], 'value')) {

      var records = [];
      var values = this.proto.associations[association].value;

      values.forEach(function(record) {
        var item = Object.create(record.__proto__);
        Object.keys(record).forEach(function(key) {
          item[key] = _.cloneDeep(record[key]);
        });
        records.push(item);
      });

      this.object[association] = records;
      continue;
    }

    // Handle belongsTo attributes
    var record = this.proto[association];
    var item = Object.create(record.__proto__);

    Object.keys(record).forEach(function(key) {
      item[key] = _.cloneDeep(record[key]);
    });

    this.object[association] = item;
  }
};

/**
 * Add Properties
 *
 * Copies over non-association attributes to the newly created object.
 *
 * @api private
 */

toObject.prototype.addProperties = function() {
  var self = this;

  Object.keys(this.proto).forEach(function(key) {
    if(hasOwnProperty(self.object, key)) return;
    self.object[key] = _.cloneDeep(self.proto[key]);
  });
};

/**
 * Make Object
 *
 * Runs toJSON on all associated values
 *
 * @api private
 */

toObject.prototype.makeObject = function() {
  var self = this;

  if(!this.proto._properties) return;
  if(!this.proto._properties.showJoins) return;

  // Handle Belongs-To Joins
  Object.keys(this.proto.associations).forEach(function(association) {

    // Call toJSON on each associated record
    if(Array.isArray(self.object[association])) {
      var records = [];

      self.object[association].forEach(function(item) {
        records.push(item.toJSON());
      });

      self.object[association] = records;
      return;
    }

    self.object[association] = self.object[association].toJSON();
  });

};

/**
 * Remove Non-Joined Associations
 *
 * @api private
 */

toObject.prototype.filterJoins = function() {

  var attributes = this.context._attributes;
  var properties = this.proto._properties;

  for(var attribute in attributes) {
    if(!hasOwnProperty(attributes[attribute], 'model') && !hasOwnProperty(attributes[attribute], 'collection')) continue;

    // If no properties and a collection attribute, delete the association and return
    if(!properties && hasOwnProperty(attributes[attribute], 'collection')) {
      delete this.object[attribute];
      continue;
    }

    // If showJoins is false remove the association object
    if(properties && !properties.showJoins) delete this.object[attribute];

    if(properties && properties.joins) {

      // Build up a join key name based on the attribute's model/collection name
      var joinsName = attribute;
      if(attributes[attribute].model) joinsName = attributes[attribute].model.toLowerCase();
      if(attributes[attribute].collection) joinsName = attributes[attribute].collection.toLowerCase();

      if(properties.joins.indexOf(joinsName) < 0) {
        delete this.object[attribute];
      }
    }
  }
};

/**
 * Filter Functions
 *
 * @api private
 */

toObject.prototype.filterFunctions = function() {
  for(var key in this.object) {
    if(typeof this.object[key] === 'function') {
      delete this.object[key];
    }
  }
};