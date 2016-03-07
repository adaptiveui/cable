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

    channelName = (_.isString(channelName))
      ? channelName
      : (_.isString(options))
      ? options
      : 'root';

    options = _.defaults(options, {
      asynchronous: true
    });

    options.invocation = ((options.asynchronous)
      ? 'defer'
      : 'attempt');

    this._ = {
      id: _.uniqueId(),
      channelName: channelName,
      options: options,
      parents: [],
      root: undefined,
      parentsPath: '',
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
   * @returns {String} unique name of cable
   */
  get channelName() {
    return (_.isUndefined(this._.channelName))
      ? ''
      : this._.channelName;
  }

  /**
   * @returns {String} unique string of parent ids concatenated with '-'
   */
  get parentsPath() {
    return (_.isUndefined(this._.parentsPath))
      ? ''
      : this._.parentsPath;
  }

  /**
   * @returns {String} the full channel path; the parentPath follows by the id
   */
  get uniquePath() {
    return (this.parentsPath.length > 0)
      ? this.parentsPath + '-' + this.channelName + '-' + this.id
      : this.channelName + '-' + this.id;
  }

  /**
   * @returns {Array}
   */
  set root(cableParent) {

    const parentsChannels = [];

    this._.root = cableParent;

    while (cableParent) {
      parentsChannels.push(cableParent.channelName);
      cableParent = cableParent.root;
    }

    this._.parents = (parentsChannels.length <= 0)
      ? parentsChannels
      : parentsChannels.reverse();

    this._.parentsPath = this._.parents.join('-');
  }

  get root() {
    return this._.root;
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

    if (_.isUndefined(this[cable.channelName])) {
      this._.channels.push(cable.channelName);
    }

    this[cable.channelName] = cable;
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

    _[this._.options.invocation](() => {
      this._publish({}, params);
      //publisher[channelName].receipt.receiptFn = undefined;
    });

    return this;
  }

  //_publish(receiptFn, ...params) {
  _publish(callGraph, params) {

    if (callGraph[this.uniquePath]) {
      return;
    }

    callGraph[this.uniquePath] = true;

    // TODO break up list into 100 call packets so we do not slow down rendering
    _.each(this._.slots, (subscriber) => {
      //receiptFn(subscriber.method.apply(subscriber.host, params));
      subscriber.method.apply(subscriber.host, params);
    });

    //params.unshift(receiptFn);
    //
    //// FIXME what about cross calls on a broadcast?
    _.each(this._.bridges, (bridge) => {
      console.log('bridge', callGraph);
      bridge._publish(callGraph, params);
    });

    return this;
  }

  //receipt(fn) {
  //  this.receiptFn = fn;
  //  return this;
  //}

  broadcast(...params) {
    //const receiptFn = (!_.isFunction(publisher[channelName].receipt.receiptFn))
    //  ? Cable.singleReceiptFn
    //  : publisher[channelName].receipt.receiptFn;
    //
    //params.unshift(receiptFn);
    //params.unshift(function() {
    //});

    _[this._.options.invocation](() => {
      this._broadcast({}, params);
      //this.receiptFn = undefined;
    });

    return this;
  }

  _broadcast(callGraph, params) {
    //_broadcast(receiptFn, ...params) {

    console.log('this.uniquePath', this.uniquePath);
    if (callGraph[this.uniquePath]) {
      return;
    }

    callGraph[this.uniquePath] = true;
    //params.unshift(receiptFn);

    _.each(this._.channels, (channelName) => {
      _.each(this[channelName]._.slots, (subscriber) => {
        //receiptFn(subscriber.method.apply(subscriber.host, params));
        subscriber.method.apply(subscriber.host, params);
      });

      this[channelName]._broadcast(callGraph, params);
    });

    _.each(this._.bridges, (bridge) => {
      bridge._broadcast(callGraph, params);
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