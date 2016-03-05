# Cable

[![Coverage Status](https://coveralls.io/repos/github/adaptiveui/cable/badge.svg?branch=master)](https://coveralls.io/github/adaptiveui/cable?branch=master)
[![Build Status](https://travis-ci.org/adaptiveui/cable.svg?branch=master)](https://travis-ci.org/adaptiveui/cable)
[![Dependency Status](https://david-dm.org/adaptiveui/cable.svg)](https://david-dm.org/adaptiveui/cable.svg?style=flat-square)

#### adaptiveui-cable

Cable is a messaging utility with tree and graph message broadcasting combining the centricity of mediators with the semantic protections of signal-slot.

## Install

Install with npm.

```sh
npm install --save adaptiveui-cable
```

Install with bower.

```sh
bower install --save adaptiveui-cable
```

### Lodash Dependency

This library requires a small set of lodash. Use [lodash-modularize](https://www.npmjs.com/package/lodash-modularize) to limit how much of lodash is included in your project.

## Quick Usage

```js
import Cable from "adaptiveui-cable"

const cable = Cable();

cable.channel('opened');
cable.channel('closed');

cable.subscribe.closed(function(a, b) {
  assert(a === 'info');
});
cable.publish.closed('info');
```

## Usage

### Cable API

#### Initializing

A cable object is Mediator. It is a hub for messaging multiple events along channels.

```javascript
const cable = Cable();
```

#### Channels

Every message sent on `Cable` must be through a pre-defined channel. Every channel creates a signal function which traps all of the listeners (slots) attached to it.

> A signal is improves reliability because they exist as objects, so there is less chance of communication breaking down

```javascript
cable.channel('initialized');
cable.channel('opened');
cable.channel('closed');
```

Channels can be built into communication hierarchies, so that published messages at the top of the communication tree propagate down the channel tree.

```javascript
cable.channel('chat-send');
cable.channel('chat-startup');
cable.channel('chat-shutdown');
cable.channel('file/send');
cable.channel('file/startup');
cable.channel('file/shutdown');
```

The characters `/`, `.`, `-`, `:` can be used to split channel strings. Which ever you choose must be used through the entire channel string.

#### Publishing

Once a channel is defined we can publish messages. You can send as many parameters as needed.

```javascript
cable.channel('opened');
cable.publish.opened('p1', 'p2');
```

If a channel hierarchy is defined, then it is important to understand the difference between messaging and broadcasting.

We will define component validation events.

```javascript
cable.channel('component:form:text:validate');
cable.channel('component:form:select:validate');
cable.channel('component:form:radio:validate');
cable.channel('component:form:checkbox:validate');
```

We can validate each component by looping over the types of form components.

```javascript
// invoke each validation method
_.each(cable.publish.component.form, function(type) {
  type.validate();
});
```

##### Publishing Hierarchy

Every channel parent can be published on. You can:

- publish to a parent channel only
- publish to a parent channel and all children

To publish on any channel, but not propagate the message down, just invoke any channel on `publish`.

```javascript
cable.channel('p1.p2.p3.p4');
cable.publish.p1('1');
cable.publish.p1.p2('2');
cable.publish.p1.p2.p3('2');
cable.publish.p1.p2.p3.p4('2');
```

If you want to publish to the parent and all children, you need to `broadcast`. The following is the same as the code above.

```javascript
cable.channel('p1.p2.p3.p4');
cable.publish.p1.broadcast('1');
```

#### Subscribing

We want to respond to messages sent. The `subscribe` object mirrors the `publish` object; every channel exists on the `subscribe` object.

```javascript
cable.channel('closed');
cable.subscribe.closed(function(v) {
  assert(v === 1);
})
cable.publish.closed(1);
```

As many subscribers can be added to any channel. A subscription also works like _slots_, where the object and method are provided and not just a function.

```javascript
const component = {
  onClosed() {}
};

cable.subscribe.closed(component, 'onClosed');
cable.subscribe.closed(component, component.onClosed);
```

A child subscriber will be called either by a direct publisher call or a parent broadcast.

```javascript
cable.channel('component/select/closed');
cable.subscribe.component(function(v) { /* will be called */ });
cable.subscribe.component.select(function(v) { /* will be called */ });
cable.subscribe.component.select.closed(function(v) { /* will be called */ });
cable.publish.component('send to only components');
cable.publish.component.broadcast('send to all components and child channels');
```

#### Bridging

Bridging is a mechanism to create graphs of messaging inside of a cable or spanning multiple cables.

```javascript
cable.channel('a.b.c.d');
cable.channel('w.x.y.z');

cable.bridge('a.b', 'w');

// this will call subscribers on a, a.b, w, w.x, w.x.y, w.x.y.z
cable.publish.a.broadcast();
```

Two different cable objects can be bridged so messages in one will trigger subscribers in the other.

```javascript
cable1.channel('a.b.c.d');
cable2.channel('w.x.y.z');

cable1.bridge('a.b', cable2.publish('w.x'));

cable2.subscribe.w.x(function() { /* will be called */ });
cable1.publish.a.b();
```

Channels can be chained in graphs as well as tree structures.

```javascript
cable1.channel('A');
cable2.channel('B');

cable1.bridge('A', cable2.publish.B);
cable2.bridge('B', cable1.publish.A);

cable2.subscribe.B(function() { /* will be called */ });
cable1.publish.A();

cable1.subscribe.A(function() { /* will be called */ });
cable2.publish.B();
```

## License

MIT © [mwjaworski](http://adaptiveui.io)

This software is released under the MIT license:

Copyright (c) 2016 mwjaworski mjaworski@acm.org

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.))
