import _ from 'lodash';

/*
 * Cable is a messaging utility with tree and graph message broadcasting combining the centricity of mediators with the semantic protections of signal-slot.
 *
 * @module adaptiveui-cable
 * @license
 * adaptiveui-cable 1.0.0 <https://adaptiveui.io/>
 * Copyright 2016 Adaptive UI <https://adaptiveui.io/>
 * Available under MIT license <https://adaptiveui.io/license>
 */
// TODO add preventPropagation()
export default function Cable(options) {

  if (!(this instanceof Cable)) {
    return new Cable(options);
  }

  this.publish = function(channelName) {
    return this.walkPublish(channelName);
  };

  this.subscribe = function(channelName) {
    return this.walkSubscribe(channelName);
  };

  this.__id__ = _.uniqueId();
  this.__channels__ = {};
  this.options = _.merge({
    asynchronous: true
  }, options);

  this.options.invocation = (!!this.options.asynchronous)
    ? 'defer'
    : 'attempt';
};

var findGroupingCharacter = function findGroupingCharacter(channelName) {
  return _.reduce(['.', '/', ':', '-'], function getGroupingCharacter(splitCharacter, character) {
    return splitCharacter + ((channelName.indexOf(character) >= 0)
        ? character
        : '');
  }, '')
};

var calculateParentSet = function calculateParentSet(channelName) {
  const splitCharacter = findGroupingCharacter(channelName);
  return (splitCharacter === '')
    ? [channelName]
    : channelName.split(splitCharacter);
};

Cable.singleReceiptFn = (function(value) {

});

Cable.prototype = {

  bridge(localChannel, bridgeToChannel) {

    localChannel = (_.isString(localChannel))
      ? this.walkChannel(localChannel)
      : localChannel;

    // TODO check if it is a function or error
    bridgeToChannel = (_.isString(bridgeToChannel))
      ? this.walkPublish(bridgeToChannel)
      : bridgeToChannel;

    localChannel.__bridges__.push(bridgeToChannel);
    return this;
  },

  /*
   *
   */
  channel(channelName) {

    const cable = this;
    const channelNames = calculateParentSet(channelName);

    var parents = [];

    _.each(channelNames, function(name) {
      cable.shallowChannel(name, parents);
      parents.push(name);
    });

    return this;
  },

  /*
   * one.twoC.threeA, []
   * one.twoC.threeA, ['one']
   * one.twoC.threeA, ['one', 'twoC']
   */
  shallowChannel(channelName, parents) {

    const cable = this;
    const uniquePath = this.__id__ + '--' + parents.join('-') + '-' + channelName;
    const parentList = (parents || []);
    const childrenAllExist = this.childrenAllExist(this.__channels__, parentList);
    const alreadyExists = !childrenAllExist;

    if (alreadyExists) {
      return;
    }

    const channels = this.walkParents(this.__channels__, parentList);
    const subscriber = this.walkParents(this.subscribe, parentList);
    const publisher = this.walkParents(this.publish, parentList);

    // store the bridge for each channel level
    channels[channelName] = channels[channelName] || {
        __slots__: [],
        __bridges__: []
      };

    publisher.receipt = publisher.receipt || function(fn) {
        Cable.receiptFn = fn;
        return publisher;
      };

    publisher[channelName] = publisher[channelName] || function(...params) {
        Cable.__graph__ = {};
        Cable.receiptFn = Cable.singleReceiptFn;
        //(!_.isFunction(Cable.receiptFn))
        //  ? Cable.singleReceiptFn
        //  : Cable.receiptFn;

        _[cable.options.invocation](function() {
          publisher[channelName]._helper.apply(cable, params);
        });

        //Cable.receiptFn = undefined;
        return publisher;
      };

    publisher[channelName]._helper = publisher[channelName]._helper || function(...params) {

        if (Cable.__graph__[uniquePath]) {
          return;
        }

        Cable.__graph__[uniquePath] = true;

        _.each(channels[channelName].__slots__, function(subscriber) {
          Cable.receiptFn(subscriber.method.apply(subscriber.host, params));
        });

        // FIXME what about cross calls on a broadcast?
        _.each(channels[channelName].__bridges__, function(bridge, key) {
          bridge._helper.apply(bridge, params);
        });

        return publisher;
      };

    publisher[channelName].broadcast = publisher[channelName].broadcast || function(...params) {
        Cable.__graph__ = {};
        Cable.receiptFn = Cable.singleReceiptFn;
        //(!_.isFunction(Cable.receiptFn))
        //  ? Cable.singleReceiptFn
        //  : Cable.receiptFn;

        _[cable.options.invocation](function() {
          publisher[channelName].broadcast._helper.apply(cable, params);
        });

        //Cable.receiptFn = undefined;
        return publisher;
      };

    publisher[channelName].broadcast._helper = publisher[channelName].broadcast._helper || function(...params) {

        if (Cable.__graph__[uniquePath]) {
          return;
        }

        Cable.__graph__[uniquePath] = true;

        _.each(channels[channelName].__slots__, function(subscriber) {
          Cable.receiptFn(subscriber.method.apply(subscriber.host, params));
        });

        _.each(publisher[channelName], function(childChannel, name) {
          if (_.isFunction(childChannel.broadcast) && name !== 'broadcast') {
            childChannel.broadcast._helper.apply(cable, params);
          }
        });

        _.each(channels[channelName].__bridges__, function(bridge, key) {
          bridge.broadcast._helper.apply(bridge, params);
        });

        return publisher;
      };

    subscriber[channelName] = subscriber[channelName] || function(host, method) {

        const isSlot = !_.isUndefined(method);

        method = (isSlot)
          ? method
          : host;

        // TODO what does a function type default to?
        host = (isSlot)
          ? host
          : {};

        if (isSlot && _.isString(method)) {
          method = host[method];
        }

        channels[channelName].__slots__.push({
          host: host,
          method: method
        });

        return subscriber;
      };

    return this;
  },

  childrenAllExist(tree, descentRule) {

    const n = descentRule.length;
    var root = tree;
    var i = 0;

    while (!!descentRule[i] && !!root[descentRule[i]]) {
      root = root[descentRule[i]];
      i += 1;
    }

    return i === n;
  },

  walkChannel(channelName) {
    return this.walkParents(this.__channels__, calculateParentSet(channelName));
  },

  walkPublish(channelName) {
    return this.walkParents(this.publish, calculateParentSet(channelName));
  },

  walkSubscribe(channelName) {
    return this.walkParents(this.subscribe, calculateParentSet(channelName));
  },

  walkParents(tree, descentRule) {
    return (_.size(descentRule) > 0)
      ? this.walkParents(tree[_.head(descentRule)], _.tail(descentRule))
      : tree;
  },

  /*
   * @return {String} source of cable
   */
  toString() {
    return '';
  }

};
