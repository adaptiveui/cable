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
      options: options,
      cablePath: '',
      channels: [],
      bridges: [],
      slots: []
    };
  }

  /**
   * @returns {String} unique name of cable
   */
  get id() {
    return (_.isUndefined(this._.id))
      ? ''
      : this._.id;
  }

  /**
   * @returns {String} unique string of parent ids concatenated with '-'
   */
  get parentPath() {
    return this.parents().join('-');
  }

  /**
   * @returns {String} the full channel path; the parentPath follows by the id
   */
  get channelPath() {
    return (this.parentPath.length > 0)
      ? this.parentPath + '-' + this.id
      : this.id;
  }

  /**
   * @returns {Array}
   */
  parents() {

    var cableParent = this.root;
    var parentIds = [];

    while(cableParent) {
      parentIds.push(cableParent.id);
      cableParent = cableParent.root;
    }

    return (parentIds.length <= 0)
      ? parentIds
      : parentIds.reverse();
  }

  /**
   * add a new cable(s)
   * @param channelName a new cable object or a string of cable ids to create
   * @returns {*}
   */
  channel(channelName) {

    var cable = this;

    if (channelName instanceof Cable) {
      this._channel(channelName);
    }
    else if (_.isString(channelName)) {
      _.each(transformChannelPath(channelName), (name) => {

        const child = (_.isUndefined(cable[name]))
          ? new Cable(name, cable._.options)
          : cable[name];

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

  /**
   *
   * @param {(Cable|String)} bridgeFromCable a string pointing to a child cable or a cable
   * @param {(Cable|String)} [bridgeToCable=this]
   */
  bridge(bridgeFromCable, bridgeToCable = this) {

    // if bridgeFromCable is a string
    bridgeFromCable = (_.isString(bridgeFromCable))
      ? this.lookup(bridgeFromCable)
      : bridgeFromCable;

    // if bridgeToCable is a string
    bridgeToCable = (_.isString(bridgeToCable))
      ? this.lookup(bridgeToCable)
      : bridgeToCable;

    bridgeToCable._.bridges.push(bridgeFromCable);
    return this;
  }

  lookup(channelString) {
    return _.reduce(transformChannelPath(channelString), function(cable, channelName) {
      return cable[channelName];
    }, this);
  }

  publish(...params) {

    //const receiptFn = (!_.isFunction(publisher[channelName].receipt.receiptFn))
    //  ? Cable.singleReceiptFn
    //  : publisher[channelName].receipt.receiptFn;
    //
    //params.unshift(function() {
    //});
    //
    __GRAPH__ = {};

    _[this._.options.invocation](() => {
      this._publish.apply(this, params);
      //publisher[channelName].receipt.receiptFn = undefined;
    });

    return this;
  }

  //_publish(receiptFn, ...params) {
  _publish(...params) {

    console.log('this.channelPath', this.channelPath);
    if (__GRAPH__[this.channelPath]) {
      return;
    }

    __GRAPH__[this.channelPath] = true;

    // TODO break up list into 100 call packets so we do not slow down rendering
    _.each(this._.slots, (subscriber) => {
      //receiptFn(subscriber.method.apply(subscriber.host, params));
      subscriber.method.apply(subscriber.host, params);
    });

    //params.unshift(receiptFn);
    //
    //// FIXME what about cross calls on a broadcast?
    _.each(this._.bridges, (bridge) => {
      bridge._publish.apply(bridge, params);
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
    //params.unshift(function() {
    //});

    __GRAPH__ = {};

    _[this._.options.invocation](() => {
      this._broadcast.apply(this, params);
      //this.receiptFn = undefined;
    });

    return this;
  }

  _broadcast(...params) {
     //_broadcast(receiptFn, ...params) {

    console.log('this.channelPath', this.channelPath);
    if (__GRAPH__[this.channelPath]) {
      return;
    }

    __GRAPH__[this.channelPath] = true;

    _.each(this._.slots, (subscriber) => {
      //receiptFn(subscriber.method.apply(subscriber.host, params));
      subscriber.method.apply(subscriber.host, params);
    });

    //params.unshift(receiptFn);

    // TODO loop over channels
    _.each(this._.channels, (channelName) => {
      this[channelName]._broadcast.apply(this[channelName], params);
    });

    _.each(this._.bridges, (bridge) => {
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