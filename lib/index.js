import _ from 'lodash';

var __GRAPH__ = {};

var findGroupingCharacter = function findGroupingCharacter(channelName) {
  return _.reduce(['.', '/', ':', '-'], function getGroupingCharacter(splitCharacter, character) {
    return splitCharacter + ((channelName.indexOf(character) >= 0)
        ? character
        : '');
  }, '')
};

var transformChannelPath = function transformChannelPath(channelName) {
  const splitCharacter = findGroupingCharacter(channelName);
  return (splitCharacter === '')
    ? [channelName]
    : channelName.split(splitCharacter);
};

/*
 * Cable is a messaging utility with tree and graph message broadcasting combining the centricity of mediators with the semantic protections of signal-slot.
 *
 * @module adaptiveui-cable
 * @license
 * adaptiveui-cable 1.0.0 <https://adaptiveui.io/>
 * Copyright 2016 Adaptive UI <https://adaptiveui.io/>
 * Available under MIT license <https://adaptiveui.io/license>
 */
export default class Cable {

  /**
   *
   */
  constructor(channelName, options) {

    const id = (_.isString(channelName))
      ? channelName
      : (_.isString(options))
      ? options
      : 'root';

    options = _.defaults(options, {
      asynchronous: true,
      root: undefined
    });

    options.invocation = ((options.asynchronous)
      ? 'defer'
      : 'attempt');

    this.root = options.root;
    this._ = {
      id: id,
      path: _.reduce(this.root, function(path, cable) {
        return path + '-' + cable.id;
      }, ''),
      options: options,
      cablePath: '',
      channels: [],
      bridges: [],
      slots: []
    };
  }

  get id() {
    return (_.isUndefined(this._.path))
      ? ''
      : this._.id;
  }

  get parentPath() {
    return (_.isUndefined(this._.path))
      ? ''
      : this._.path;
  }

  get channelPath() {
    return (this.parentPath.length > 0)
      ? this.parentPath + '-' + this.id
      : this.id;
  }

  channel(channelName) {

    var cable = this;

    if (_.isUndefined(channelName)) {
      return this.path + '-' + this.id;
    }
    else if (channelName instanceof Cable) {
      this._channel(channelName);
    }
    else if (_.isString(channelName)) {
      _.each(transformChannelPath(channelName), (name) => {

        const child = (_.isUndefined(this[name]))
          ? new Cable(name, this._.options)
          : this[name];

        cable._channel(child);
        cable = child;
      });
    }
    else {
      throw new Error('cannot add channel without a non-string or Cable object');
    }

    return this;
  }

  _channel(cable) {

    cable.root = this;

    if (_.isUndefined(this[cable.id])) {
      this._.channels.push(cable.id);
    }

    this[cable.id] = cable;
    return this;
  }

  bridge(bridgeToCable) {
    this.__bridges__.push(bridgeToCable);
  }

  publish(...params) {

    //const receiptFn = (!_.isFunction(publisher[channelName].receipt.receiptFn))
    //  ? Cable.singleReceiptFn
    //  : publisher[channelName].receipt.receiptFn;
    //
    //params.unshift(function() {
    //});
    //
    //__GRAPH__[this.id] = {};

    _[this._.options.invocation](() => {
      this._publish.apply(this, params);
      //publisher[channelName].receipt.receiptFn = undefined;
    });

    return this;
  }

  //_publish(receiptFn, ...params) {
  _publish(...params) {
    //if (__GRAPH__[this.id][this.uniquePath]) {
    //  return;
    //}
    //
    //__GRAPH__[this.id][this.uniquePath] = true;

    // TODO break up list into 100 call packets so we do not slow down rendering
    _.each(this._.slots, (subscriber) => {
      //receiptFn(subscriber.method.apply(subscriber.host, params));
      subscriber.method.apply(subscriber.host, params);
    });

    //params.unshift(receiptFn);
    //
    //// FIXME what about cross calls on a broadcast?
    //_.each(this.__bridges__, (bridge, key) => {
    //  bridge._helper.apply(bridge, params);
    //});

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

    host = (isSlot)
      ? host
      : {}; // TODO what does a function type default to?

    if (isSlot && _.isString(method)) {
      method = host[method];
    }

    this._.slots.push({
      host,
      method
    });

    return this;
  }
}