import _ from 'lodash';

var findGroupingCharacter = function findGroupingCharacter(channelName) {
  return _.reduce(['.', '/', ':'], function getGroupingCharacter(splitCharacter, character) {
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
      root: undefined,
      parentsChannels: [],
      parentsPath: '',
      options: options,
      channels: [],
      bridges: [],
      slots: []
    };
  }

  static receiptFn() {

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

    this._.parentsChannels = (parentsChannels.length <= 0)
      ? parentsChannels
      : parentsChannels.reverse();

    this._.parentsPath = this._.parentsChannels.join('-');
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

  // TODO test emit function and complete documentation
  emit(...params) {
    return this._message('_emit', params);
  }

  publish(...params) {
    return this._message('_publish', params);
  }

  broadcast(...params) {
    return this._message('_broadcast', params);
  }

  _message(direction, params) {

    const receiptFn = (_.isFunction(this._.receiptFn))
      ? this._.receiptFn
      : Cable.receiptFn;

    this._.receiptFn = undefined;
    _[this._.options.invocation](() => {
      this[direction]({}, receiptFn, params);
    });

    return this;
  }

  _emit(callGraph, receiptFn, params) {

    var cable = this._.root;

    if (!cable) {
      return this;
    }

    if (callGraph[this.uniquePath]) {
      return;
    }

    callGraph[this.uniquePath] = true;

    _.each(cable._.slots, (subscriber) => {
      receiptFn(subscriber.method.apply(subscriber.host, params));
    });

    cable._emit(callGraph, receiptFn, params);

    _.each(this._.bridges, (bridge) => {
      bridge._emit(callGraph, receiptFn, params);
    });

    return this;
  }

  _publish(callGraph, receiptFn, params) {

    if (callGraph[this.uniquePath]) {
      return;
    }

    callGraph[this.uniquePath] = true;

    _.each(this._.slots, (subscriber) => {
      receiptFn(subscriber.method.apply(subscriber.host, params));
    });

    _.each(this._.bridges, (bridge) => {
      bridge._publish(callGraph, receiptFn, params);
    });
    return this;
  }

  _broadcast(callGraph, receiptFn, params) {

    if (callGraph[this.uniquePath]) {
      return;
    }

    callGraph[this.uniquePath] = true;

    _.each(this._.channels, (channelName) => {

      _.each(this[channelName]._.slots, (subscriber) => {
        receiptFn(subscriber.method.apply(subscriber.host, params));
      });

      this[channelName]._broadcast(callGraph, receiptFn, params);
    });

    _.each(this._.bridges, (bridge) => {
      bridge._broadcast(callGraph, receiptFn, params);
    });
    return this;
  }

  receipt(fn) {
    this._.receiptFn = fn;
    return this;
  }

  subscribe(host, method) {

    const cable = this;
    const isSlot = !_.isUndefined(method);

    method = (isSlot)
      ? method
      : host;

    host = (isSlot)
      ? host
      : cable;

    if (isSlot && _.isString(method)) {
      method = host[method];
    }

    this._.slots.push({
      host,
      method
    });

    return this;
  }

  /*
   * @return {String} source of cable
   */
  toString() {
    return '';
  }
}