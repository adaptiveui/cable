import _ from 'lodash';

/**
 * Cable is a messaging utility with tree and graph message broadcasting combining the centricity of mediators with the semantic protections of signal-slot.
 *
 * @module simpleui-cable
 * @license
 * simpleui-cable 1.1.1 <https://simpleui.io/>
 * Copyright 2017 Simple UI <https://simpleui.io/>
 * Available under MIT license <https://simpleui.io/license>
 */
export default class Cable {

  /**
   * @param {String} channelName the name of the cable object to be created
   * @param {Object} options define if the cable should execute async or sync
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

    options.invocation = ((options.asynchronous) ?
      'defer' :
      'attempt');

    this._ = {
      id: _.uniqueId(),
      channelName,
      options,
      root: undefined,
      parentsChannels: [],
      parentsPath: '',
      channels: [],
      bridges: [],
      slots: []
    };
  }

  /**
   * default method called for every slot
   * @note do not call this, it is used internally
   */
  static receiptFn() {
    // override method
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
   * @returns {String} contextual name of cable
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
   * @returns {String} the full cable id path which is completely unique among all cable objects created
   */
  get uniquePath() {
    return (this.parentsPath.length > 0)
      ? `${this.parentsPath}-${this.channelName}-${this.id}`
      : `${this.channelName}-${this.id}`;
  }

  /**
   * @returns {Cable} the parent cable object
   */
  set parent(cableParent) {
    this.root = cableParent;
  }

  /**
   * @returns {Cable} the parent cable object
   */
  get parent() {
    return this.root;
  }

  /**
   * @param {Cable} cableParent the parent (or root) object of the cable
   */
  set root(cableParent) {

    const parentsChannels = [];

    this._.root = cableParent;

    while (cableParent) {
      parentsChannels.push(cableParent.channelName);
      cableParent = cableParent.root;
    }

    this._.parentsChannels = (parentsChannels.length <= 0) ?
      parentsChannels :
      parentsChannels.reverse();

    this._.parentsPath = this._.parentsChannels.join(`-`);
  }

  /**
   * @returns {Cable} the parent cable object
   */
  get root() {
    return this._.root;
  }

  /**
   * add new cable(s) as children to broadcast to
   * @param {String} channelName a new cable object or a string of cable ids to create
   * @returns {Cable} parent cable
   */
  channel(channelName) {

    let cable = this;

    if (channelName instanceof Cable) {
      this._channel(channelName);
    }
    else if (_.isString(channelName)) {
      _.each(this._deconstructChannelPath(channelName), (name) => {

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

  /**
   * @param {Cable} cable set as child of parent cable object
   * @returns {Cable} parent cable
   * @private
   */
  _channel(cable) {

    cable.root = this;

    if (_.isUndefined(this[cable.channelName])) {
      this._.channels.push(cable.channelName);
    }

    this[cable.channelName] = cable;
    return this;
  }

  /**
   * connect two cable objects laterally, to form graph connections for communication
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

  /**
   * @param {String} channelString a string similar to #channel to search for existing children cables
   * @returns {Cable} the child at the end of the search path
   */
  lookup(channelString) {
    return _.reduce(this._deconstructChannelPath(channelString), (cable, channelName) => {
      return cable[channelName];
    }, this);
  }

  /**
   * send a message to all cables connected to this one (through child, parent, or bridge connections)
   * @param {*} any number of parameters to send
   * @returns {Cable}
   */
  flood(...params) {
    return this._message('_flood', params);
  }

  /**
   * send a message to all parent cables
   * @param {*} any number of parameters to send
   * @returns {Cable}
   */
  emit(...params) {
    return this._message('_emit', params);
  }

  /**
   * send a message to all slots on current cable
   * @param {*} any number of parameters to send
   * @returns {Cable}
   */
  publish(...params) {
    return this._message('_publish', params);
  }

  /**
   * send a message to all child cables
   * @param {*} any number of parameters to send
   * @returns {Cable}
   */
  broadcast(...params) {
    return this._message('_broadcast', params);
  }

  /**
   * setup the function receipt and invoke messaging async or async
   * @note do not call directly
   * @param {String} direction function name to invoke
   * @param {Array} params the parameters to send to all slots
   * @returns {Cable}
   * @private
   */
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

  /**
   * implementation of flooding
   * @private
   */
  _flood(callGraph, receiptFn, params) {

    if (callGraph[this.uniquePath]) {
      return;
    }

    callGraph[this.uniquePath] = true;

    this._invokeSlots(receiptFn, params);

    if (this._.root) {
      this._.root._flood(callGraph, receiptFn, params);
    }

    _.each(this._.channels, (channelName) => {
      this[channelName]._flood(callGraph, receiptFn, params);
    });

    _.each(this._.bridges, (bridge) => {
      bridge._flood(callGraph, receiptFn, params);
    });

    return this;
  }

  /**
   * implementation of emitting
   * @private
   */
  _emit(callGraph, receiptFn, params) {

    let cable = this._.root;

    if (!cable) {
      return this;
    }

    if (callGraph[this.uniquePath]) {
      return;
    }

    callGraph[this.uniquePath] = true;

    cable._invokeSlots(receiptFn, params);
    cable._emit(callGraph, receiptFn, params);

    _.each(this._.bridges, (bridge) => {
      bridge._emit(callGraph, receiptFn, params);
    });

    return this;
  }

  /**
   * implementation of publishing
   * @private
   */
  _publish(callGraph, receiptFn, params) {

    if (callGraph[this.uniquePath]) {
      return;
    }

    callGraph[this.uniquePath] = true;

    this._invokeSlots(receiptFn, params);

    _.each(this._.bridges, (bridge) => {
      bridge._publish(callGraph, receiptFn, params);
    });
    return this;
  }

  /**
   * implementation of broadcasting
   * @private
   */
  _broadcast(callGraph, receiptFn, params) {

    if (callGraph[this.uniquePath]) {
      return;
    }

    callGraph[this.uniquePath] = true;

    _.each(this._.channels, (channelName) => {
      this[channelName]._invokeSlots(receiptFn, params);
      this[channelName]._broadcast(callGraph, receiptFn, params);
    });

    _.each(this._.bridges, (bridge) => {
      bridge._broadcast(callGraph, receiptFn, params);
    });
    return this;
  }

  /**
   * invoke all slots on a cable (the heart of messaging)
   * @param {Function} receiptFn the callback method to be invoked for every message
   * @param {Array} params parameters to deliver to slots
   * @private
   */
  _invokeSlots(receiptFn, params) {
    _.each(this._.slots, (subscriber) => {
      receiptFn(subscriber.method.apply(subscriber.host, params));
    });

    _.each(Cable.taps, (tapFn) => {
      tapFn(this, params);
    });
  }

  /**
   * register a receipt function, which allows a slot to respond back to the cable
   * @note current only one per call
   * @param {Function} fn the function to call on each invocation of a slot
   * @returns {Cable}
   */
  receipt(fn) {
    // TODO allow multiple and then expire all after the call
    this._.receiptFn = fn;
    return this;
  }

  /**
   * listen to all messages sent, one cable
   * @param {Function} method
   */
  static tap(method) {
    Cable.taps = Cable.taps || [];
    Cable.taps.push(method);
  }

  /**
   * add a slot (listener) to a cable
   * @param {(Object|Function)} host either a method to invoke or an object to invoke a method on
   * @param {(String|Function)} [method=undefined] if an object is provided for host, then provide a string (name of function on host) or a function to be invoked on the host object
   * @returns {*}
   */
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

  /**
   * split a channel name into name parts using one of three characters /[./:]/
   * @param channelName a set of channel names to create cable objects as children
   * @returns {Array} an array of channel names ('A.B' => ['A', 'B'])
   * @private
   */
  _deconstructChannelPath(channelName) {
    const splitCharacter = this._splitChannelNameByGroupingCharacter(channelName);

    return (splitCharacter === '')
      ? [channelName]
      : channelName.split(splitCharacter);
  }

  /**
   * split a channel name into name parts using one of three characters /[./:]/
   * @param {String} channelName a set of channel names
   * @returns {Array} an array of channel names ('A.B' => ['A', 'B'])
   * @private
   */
  _splitChannelNameByGroupingCharacter(channelName) {
    return _.reduce(['.', '/', ':'], function getGroupingCharacter(splitCharacter, character) {
      return splitCharacter + ((channelName.indexOf(character) >= 0)
        ? character
        : '');
    }, '');
  }

  /*
   * @return {String} unique name for cable
   */
  toString() {
    return this.uniquePath;
  }
}