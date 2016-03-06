import _ from 'lodash';

var __GRAPH__ = {};

export class CableNode {

  /**
   *
   */
  constructor(uniquePath, options) {

    this.uniquePath = uniquePath;
    this.id = _.uniqueId();
    this.__channels__ = [];   // children
    this.__slots__ = [];      // functions
    this.__bridges__ = [];    // bridgers to other Cables

    this.options = options;
    this.options.invocation = 'attempt';
  }

  addChannel(channelName) {
    const cableNode = CableNode(this.uniquePath + '.' + channelName, this.options);
    this.__channels__.push(cableNode);
    return cableNode;
  }

  publish(...params) {

    //const receiptFn = (!_.isFunction(publisher[channelName].receipt.receiptFn))
    //  ? Cable.singleReceiptFn
    //  : publisher[channelName].receipt.receiptFn;
    //
    params.unshift(function() {
    });

    __GRAPH__[this.id] = {};

    _[cable.options.invocation](function() {
      _publish.apply(cable, params);
      //publisher[channelName].receipt.receiptFn = undefined;
    });

    return this;
  }

  _publish(receiptFn, ...params) {

    if (__GRAPH__[this.id][this.uniquePath]) {
      return;
    }

    __GRAPH__[this.id][this.uniquePath] = true;

    // TODO break up list into 100 call packets so we do not slow down rendering
    _.each(this.__slots__, (subscriber) => {
      receiptFn(subscriber.method.apply(subscriber.host, params));
    });

    params.unshift(receiptFn);

    // FIXME what about cross calls on a broadcast?
    _.each(this.__bridges__, (bridge, key) => {
      bridge._helper.apply(bridge, params);
    });

    return this;
  }

  receipt(fn) {
    this.receiptFn = fn;
    return this;
  }

  broadcast(...params) {
    //const receiptFn = (!_.isFunction(publisher[channelName].receipt.receiptFn))
    //  ? Cable.singleReceiptFn
    //  : publisher[channelName].receipt.receiptFn;
    //
    //params.unshift(receiptFn);
    params.unshift(function() {
    });

    __GRAPH__[this.id] = {};

    _[this.options.invocation](() => {
      this._broadcast.apply(this, params);
      this.receiptFn = undefined;
    });

    return this;
  }

  _broadcast(receiptFn, ...params) {
    if (__GRAPH__[this.id][this.uniquePath]) {
      return;
    }

    __GRAPH__[this.id][this.uniquePath] = true;

    _.each(this.__slots__, (subscriber) => {
      receiptFn(subscriber.method.apply(subscriber.host, params));
    });

    params.unshift(receiptFn);

    // TODO loop over channels
    _.each(this.__channels__, (childChannel) => {
      childChannel._broadcast.apply(childChannel, params);
    });

    _.each(this.__bridges__, (bridge, key) => {
      bridge._broadcast.apply(bridge, params);
    });

    return this;
  }

  subscribe(host, method) {

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

    this.__slots__.push({
      host,
      method
    });

    return this;
  }
}

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

    channels[channelName] = channels[channelName] || {
        __slots__: [],
        __bridges__: []
      };

    publisher[channelName] = publisher[channelName] || function(...params) {

        const receiptFn = (!_.isFunction(publisher[channelName].receipt.receiptFn))
          ? Cable.singleReceiptFn
          : publisher[channelName].receipt.receiptFn;

        params.unshift(receiptFn);

        Cable.__graph__ = {};

        _[cable.options.invocation](function() {
          publisher[channelName]._helper.apply(cable, params);
          publisher[channelName].receipt.receiptFn = undefined;
        });

        return publisher;
      };

    publisher[channelName]._helper = publisher[channelName]._helper || function(receiptFn, ...params) {

        if (Cable.__graph__[uniquePath]) {
          return;
        }

        Cable.__graph__[uniquePath] = true;

        // TODO break up list into 100 call packets so we do not slow down rendering
        _.each(channels[channelName].__slots__, function(subscriber) {
          receiptFn(subscriber.method.apply(subscriber.host, params));
        });

        params.unshift(receiptFn);

        // FIXME what about cross calls on a broadcast?
        _.each(channels[channelName].__bridges__, function(bridge, key) {
          bridge._helper.apply(bridge, params);
        });

        return publisher;
      };

    publisher[channelName].receipt = publisher[channelName].receipt || function(fn) {
        publisher[channelName].receipt.receiptFn = fn;
        return publisher[channelName];
      };

    publisher[channelName].broadcast = publisher[channelName].broadcast || function(...params) {

        const receiptFn = (!_.isFunction(publisher[channelName].receipt.receiptFn))
          ? Cable.singleReceiptFn
          : publisher[channelName].receipt.receiptFn;

        params.unshift(receiptFn);

        Cable.__graph__ = {};

        _[cable.options.invocation](function() {
          publisher[channelName].broadcast._helper.apply(cable, params);
          publisher[channelName].receipt.receiptFn = undefined;
        });

        return publisher;
      };

    publisher[channelName].broadcast._helper = publisher[channelName].broadcast._helper || function(receiptFn,
                                                                                                    ...params) {

        if (Cable.__graph__[uniquePath]) {
          return;
        }

        Cable.__graph__[uniquePath] = true;

        _.each(channels[channelName].__slots__, function(subscriber) {
          receiptFn(subscriber.method.apply(subscriber.host, params));
        });

        params.unshift(receiptFn);

        _.each(publisher[channelName], function(childChannel, name) {
          if (_.isFunction(childChannel.broadcast) && name !== 'broadcast') {
            childChannel.broadcast._helper.apply(childChannel, params);
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
