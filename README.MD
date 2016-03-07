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

const cable = new Cable();

cable.channel('opened');
cable.channel('closed');

cable.closed.subscribe(function(a, b) {
  assert(a === 'info');
}).publish('info');
```

## Usage

### Cable API

#### Initializing

A cable object is Mediator. It is a hub for messaging multiple events along channels.

```javascript
const cable = new Cable();
```

The `Cable` object takes the following configuration properties.

| Property       | Type        | Default Value | Purpose                                                    |
|:---------------|:------------|:--------------|:-----------------------------------------------------------|
| `asynchronous` | __boolean__ | `true`        | All publish calls happen after the current stack has ended |

#### Channels

A `Cable` object is a signal which can have slots (methods to invoke) attached to it. Every channel defined on a `Cable` creates a new `Cable` with a `channelName`.

> A `Cable` improves reliability because each exists as an object; there is less chance of a communication break down.

```javascript
cable.channel('initialized');
cable.channel('opened');
cable.channel('closed');
assert(cable.closed instanceof Cable);
```

Cables can be built into communication hierarchies, so that published messages at the top of the communication tree propagate down or up the channel tree.

```javascript
cable.channel('chat:send');
cable.channel('chat:startup');
cable.channel('chat:shutdown');
cable.channel('file/send');
cable.channel('file/startup');
cable.channel('file/shutdown');
```

The characters `/`, `.`, `:` can be used to split channel strings. Whichever you choose must be used through the entire channel string. You cannot define a channel with different split characters like `a/b:c.d`, but `a.b.c.d` or `a:b:c:d` or `a/b/c/d`.

#### Messaging

There are three directions messages can be passed in the hierarchy: up, across, and down.

| Direction | Method      |
|:----------|:------------|
| Up        | `emit`      |
| Across    | `publish`   |
| Down      | `broadcast` |

To invoke all subscribers that the cable has a hierarchical relationship with you would call:

```javascript
cable.emit()      // invoke subscribers on parent cables
cable.publish()   // invoke subscribers on cable
cable.broadcast() // invoke subscribers on child cables
```

#### Publishing

Once a cable channel is defined we can publish messages. You can send as many parameters as needed.

```javascript
cable.channel('opened');
cable.opened.publish('p1', 'p2');
```

If a channel hierarchy is defined, then it is important to understand the difference between publishing, emitting, and broadcasting.

We will define component validation events.

```javascript
cable.channel('component:form:text:validate');
cable.channel('component:form:select:validate');
cable.channel('component:form:radio:validate');
cable.channel('component:form:checkbox:validate');
```

We can validate each component by looping over the types of form components.

```javascript
_.each(cable.component.form, function(type) {
  type.validate.publish();
});
```

#### Broadcasting

While a `publish` will invoke all subscribes on a `Cable`, a broadcast will invoke all subscribers on all channels (i.e. children cables) on that cable, indefinitely.

The loop above which published to all validation methods could be re-written as the following with a `broadcast`.

```javascript
cable.component.form.broadcast();
```

If we define four nested `Cable` objects (i.e. four channels) we can invoke each of these manually.

```javascript
cable.channel('p1.p2.p3.p4');   // Equal(1)
cable.p1.publish('1');          // Equal(2)
cable.p1.p2.publish('1');       // Equal(3)
cable.p1.p2.p3.publish('1');    // Equal(3)
cable.p1.p2.p3.p4.publish('1'); // Equal(3)
```

We can accomplish the same with the following; notice that `broadcast` does not call the current cable's subscribers.

```javascript
cable.channel('p1.p2.p3.p4');   // Equal(1)
cable.p1.publish('1');          // Equal(2)
cable.p1.broadcast('1');        // Equal(3)
```

#### Emitting

Emitting sends messages from a cable to all of it's parents, but similar to broadcasting it does not invoke subscribers on the `Cable`.

#### Subscribing

We want to respond to messages sent. The `subscribe` object mirrors the `publish` object; every channel exists on the `subscribe` object.

```javascript
cable.channel('closed');
cable.closed.subscribe(function(v) {
  assert(v === 1);
}).publish(1);
```

As many subscribers can be added to any channel. A subscription also works like _slots_, where the object and method are provided and not just a function.

```javascript
const component = {
  onClosed() {}
};

cable.closed.subscribe(component, 'onClosed');
cable.closed.subscribe(component, component.onClosed);
```

A child subscriber will be called either by a direct publisher call or a parent broadcast.

```javascript
cable.channel('component/select/closed');
cable.component.subscribe(function(v) { /* will be called */ });
cable.component.select.subscribe(function(v) { /* will be called */ });
cable.component.select.closed.subscribe(function(v) { /* will be called */ });
cable.component.publish('send to only components');
cable.component.broadcast.publish('send to all components and child channels');
```

#### Bridging

Bridging is a mechanism to create graphs of messaging inside of a cable or spanning multiple cables.

```javascript
cable.channel('a.b.c.d');
cable.channel('w.x.y.z');

cable.bridge('a.b', 'w');

// this will call subscribers on a, a.b, w, w.x, w.x.y, w.x.y.z
cable.a.broadcast();
```

Two different cable objects can be bridged so messages in one will trigger subscribers in the other.

```javascript
cable1.channel('a.b.c.d');
cable2.channel('w.x.y.z');

cable1.bridge('a.b', cable2.lookup('w.x'));

cable2.w.x.subscribe(function() { /* will be called */ });
cable1.a.b.publish();
```

Channels can be chained in graphs as well as tree structures.

```javascript
cable1.channel('A');
cable2.channel('B');

cable1.bridge('A', cable2.B);
cable2.bridge('B', cable1.A);

cable2.B.subscribe(function() { /* will be called */ });
cable1.A.publish();

cable1.A.subscribe(function() { /* will be called */ });
cable2.B.publish();
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
