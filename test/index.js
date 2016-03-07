import test from 'tape'
import _ from 'lodash'
import Cable from '../lib'

test('Cable Creation', (test) => {

  const cable = new Cable();

  test.equal(cable.channelName, 'root', 'without any channel name a cable is the root');
  test.equal(cable.parentsPath, '', 'with a parent a cable has not path');
  test.equal(cable.uniquePath, 'root-' + cable.id, 'channel returns the channel of a cable');
  test.equal(cable.root, undefined, 'cable root is empty if none defined');
  test.end();
});

test('Cable Channel Definition', (test) => {

  const cable = new Cable();

  cable.channel('W/A/B');
  cable.channel('X.A.B');
  cable.channel('Y:A:B');

  test.equal(cable.W.A.B instanceof Cable, true, 'split on /');
  test.equal(cable.X.A.B instanceof Cable, true, 'split on .');
  test.equal(cable.Y.A.B instanceof Cable, true, 'split on :');

  test.deepEqual(cable._.channels, ['W', 'X', 'Y'], 'root cable has all children W, X, Y');
  test.deepEqual(cable.W._.channels, ['A'], 'A is a child cable of W');
  test.deepEqual(cable.W.A._.channels, ['B'], 'B is a child cable of A');
  test.end();

});

test('Cable Parent Chain', (test) => {

  const cable = new Cable();

  cable.channel('W/A/B/X/Y/Z');

  test.equal(cable.channelName, 'root', 'undefined cables are root');
  test.equal(cable.W.channelName, 'W', '(W) id is the name of the cable');
  test.equal(cable.W.A.channelName, 'A', '(A) id is the name of the cable');
  test.equal(cable.W.A.B.channelName, 'B', '(B) id is the name of the cable');

  test.equal(cable.parentsPath, '', 'cable has no parent');
  test.equal(cable.W.parentsPath, 'root', 'parent path of parent');
  test.equal(cable.W.A.parentsPath, 'root-W', 'parent path of parent');
  test.equal(cable.W.A.B.parentsPath, 'root-W-A', 'parent path of parent');
  test.equal(cable.W.A.B.X.parentsPath, 'root-W-A-B', 'parent path of parent');
  test.end();

});

test('Cable Prevent Duplicate Channel Definitions', (test) => {

  const cable = new Cable();

  cable.channel('W/A/B');
  test.equal(cable.W.special, undefined, 'special property is not a normal cable property');
  cable.W.special = 1;
  test.equal(cable.W.special, 1, 'special property added to W');

  cable.channel('W.A.B');
  test.equal(cable.W.special, 1, 'special property stays on W, because W existed and does not get erased');
  test.deepEqual(cable._.channels, ['W'], 'channels list mirrors children cables');
  test.end();

});

test('Cable Root Publish/Subscribe', (test) => {

  const cable = new Cable();
  var publishCount = 1;

  test.plan(3);

  cable.subscribe(function(value) {
    test.equal(value, publishCount, 'published ' + publishCount);
    publishCount += 1;
  });

  cable.publish(1);
  cable.publish(2);
  cable.publish(3);
});

test('Cable Children Publish/Subscribe', (test) => {

  var cable = new Cable();

  cable.channel('one');
  cable.channel('one.two');
  cable.channel('one.two.three');

  test.plan(3);

  _.each(['one', 'two', 'three'], function(childrenName, key) {

    cable[childrenName].subscribe(function(v) {
      test.equal(v, key, childrenName + ' is sent ' + v);
    });

    cable[childrenName].publish(key);
    cable = cable[childrenName];
  });
});

test('Cable Children Emit/Subscribe', (test) => {

  const cable = new Cable();
  var walkCable = cable;

  cable.channel('one');
  cable.channel('one.two');
  cable.channel('one.two.three');
  cable.channel('one.two.three.four');

  test.plan(3);

  _.each(['one', 'two', 'three'], function(childrenName, key) {
    walkCable[childrenName].subscribe(function(v) {
      test.equal(v, 1, '1 is sent to all');
    });
    walkCable = walkCable[childrenName];
  });

  cable.one.two.three.four.emit(1);
});

test('Cable Signal-Slot Pattern', (test) => {

  const cable = new Cable();
  const slots = {
    a(value) {
      test.equal(this, slots, 'signal-slot should use object');
      test.equal(value, 1, 'publish sent 1 on channel one');
    },
    b(value) {
      test.equal(this, slots, 'signal-slot should use object');
      test.equal(value, 2, 'publish sent 2 on channel one.two');
    },
    c(value) {
      test.equal(this, slots, 'signal-slot should use object');
      test.equal(value, 3, 'publish sent 3 on channel one.two.three');
    }
  };

  cable.channel('one');
  cable.channel('one.two');
  cable.channel('one.two.three');

  test.plan(6);

  cable.one.subscribe(slots, slots.a);
  cable.one.two.subscribe(slots, 'b');
  cable.one.two.three.subscribe(slots, slots.c);

  cable.one.publish(1);
  cable.one.two.publish(2);
  cable.one.two.three.publish(3);

});

test('Cable Broadcast Publish/Subscribe', (test) => {

  const cable = new Cable();

  cable.channel('one');
  cable.channel('one.two');
  cable.channel('one.two.three');

  test.plan(2);

  cable.one.subscribe(function(value) {
    test.equal(value, 4, 'publish sent 4 on channel one');
  });
  cable.one.two.subscribe(function(value) {
    test.equal(value, 4, 'publish sent 4 on channel one.two');
  });
  cable.one.two.three.subscribe(function(value) {
    test.equal(value, 4, 'publish sent 4 on channel one.two.three');
  });

  cable.one.broadcast(4);

});

test('Cable Auto-Attach Children', (test) => {

  const cable = new Cable();

  cable.channel('one');
  cable.channel('one.twoA');
  cable.channel('one.twoB');
  cable.channel('one.twoC.threeA');
  cable.channel('one.twoC.threeB');
  cable.channel('one.twoC.threeC');
  cable.channel('one.twoD.threeA.fourA');

  test.plan(5);

  test.deepEqual(cable.one.twoC._.channels, ['threeA', 'threeB', 'threeC'], 'all channels on an internal Cable exist');
  test.equal(typeof cable.one.twoD.threeA.fourA.subscribe, 'function', 'all channels exist');

  cable.one.twoC.threeA.subscribe(function(value) {
    test.equal(value, 4, 'publish sent 4 on channel one.twoC.threeA');
  });
  cable.one.twoC.threeB.subscribe(function(value) {
    test.equal(value, 4, 'publish sent 4 on channel one.twoC.threeB');
  });
  cable.one.twoC.threeC.subscribe(function(value) {
    test.equal(value, 4, 'publish sent 4 on channel one.twoC.threeC');
  });

  cable.one.twoC.broadcast(4);

});

test('Cable Internal Bridging', (test) => {

  const cable = new Cable();

  // TODO how do we distinguish between cables? The root is the same for double calls

  cable.channel('A.A');
  cable.channel('A.B');
  cable.channel('Zero.B.A');
  cable.channel('Zero.B.B');

  cable.bridge('Zero.B', 'A');

  test.plan(3);

  cable.Zero.subscribe(function(value) {
    test.equal(value, 1, 'bridge is called with local calls and emits');
  });
  cable.Zero.B.subscribe(function(value) {
    test.equal(value, 1, 'bridge is called with local calls and broadcasts');
  });
  cable.Zero.B.B.subscribe(function(value) {
    test.equal(value, 1, 'bridge calls with broadcasts');
  });

  cable.A.emit(1);
  cable.A.publish(1);
  cable.A.broadcast(1);

});

test('Cable External Bridging', (test) => {

  const cable1 = new Cable();
  const cable2 = new Cable();

  cable1.channel('A.A');
  cable1.channel('A.B');
  cable2.channel('B.A');
  cable2.channel('B.B');

  cable1.bridge(cable2.lookup('B'), 'A');

  test.plan(2);

  cable2.B.subscribe(function(value) {
    test.equal(value, 1, 'bridge is called with local calls and broadcasts');
  });
  cable2.B.B.subscribe(function(value) {
    test.equal(value, 1, 'bridge calls with broadcasts');
  });

  cable1.A.publish(1);
  cable1.A.broadcast(1);

});

test('Cable Recursive Bridging', (test) => {

  const cable1 = new Cable();
  const cable2 = new Cable();

  cable1.channel('A.A');
  cable1.channel('A.B');
  cable2.channel('B.A');
  cable2.channel('B.B');
  cable2.channel('B.C');
  cable2.channel('B.C.A');

  cable1.bridge(cable2.lookup('B'), 'A');
  cable2.bridge(cable1.lookup('A'), 'B');

  test.plan(4);

  cable2.B.subscribe(function(value) {
    test.equal(value, 1, 'local calls');
  });
  cable2.B.B.subscribe(function(value) {
    test.equal(value, 1, 'broadcast to level1-child1');
  });
  cable2.B.C.subscribe(function(value) {
    test.equal(value, 1, 'broadcast to level1-child2');
  });
  cable2.B.C.A.subscribe(function(value) {
    test.equal(value, 1, 'broadcast to level2-child1');
  });

  cable1.A.publish(1);
  cable1.A.broadcast(1);

});

test('Cable Receipt Publish', (test) => {

  const cable = new Cable();

  cable.channel('B');

  test.plan(2);

  cable.B.subscribe(function(value) {
    test.equal(value, 1, 'broadcast to level1-child1');
    return 1;
  });

  cable.B.receipt(function(value) {
    test.equal(value, 1, 'receipt is always 1');
  }).publish(1);

});

test('Cable Receipt Broadcast', (test) => {

  const cable = new Cable();

  cable.channel('B.A');
  cable.channel('B.B');
  cable.channel('B.C');
  cable.channel('B.C.A');

  test.plan(6);

  cable.B.B.subscribe(function(value) {
    test.equal(value, 1, 'broadcast to level1-child1');
    return 1;
  });
  cable.B.C.subscribe(function(value) {
    test.equal(value, 1, 'broadcast to level1-child2');
    return 1;
  });
  cable.B.C.A.subscribe(function(value) {
    test.equal(value, 1, 'broadcast to level2-child1');
    return 1;
  });

  cable.B.receipt(function(value) {
    test.equal(value, 1, 'receipt is always 1');
  }).broadcast(1);

});
