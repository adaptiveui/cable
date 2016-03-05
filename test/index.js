import test from 'tape'
import _ from 'lodash'
import Cable from '../lib'

test('Cable Creation', (test) => {

  const cable = Cable({asynchronous: false});

  test.deepEqual(typeof cable.__channels__, 'object', 'cable has channels');
  test.deepEqual(typeof cable.publish, 'function', 'cable has publish');
  test.deepEqual(typeof cable.subscribe, 'function', 'cable has subscribe');
  test.end();
});

test('Cable Walk Tree', (test) => {

  const cable = Cable({asynchronous: false});
  const tree = {
    one: {
      two: {
        three: {
          value: 1
        }
      }
    }
  };
  const subtree = cable.walkParents(tree, ['one', 'two']);

  test.deepEqual(subtree.three.value, 1, 'walks into objects');
  test.end();
});

test('Cable Communication Tree', (test) => {

  const cable = Cable({asynchronous: false});

  cable.channel('W/A/B');
  cable.channel('X.A.B');
  cable.channel('Y:A:B');
  cable.channel('Z-A-B');

  test.equal(typeof cable.__channels__.W.A.B, 'object', 'split on /');
  test.equal(typeof cable.__channels__.X.A.B, 'object', 'split on .');
  test.equal(typeof cable.__channels__.Y.A.B, 'object', 'split on :');
  test.equal(typeof cable.__channels__.Z.A.B, 'object', 'split on -');
  test.end();

});

test('Cable Communication Tree', (test) => {

  const cable = Cable({asynchronous: false});

  cable.channel('one');
  cable.channel('one.two');
  cable.channel('one.two.three');

  _.each(['publish', 'subscribe'], function(parent) {
    test.equal(typeof cable[parent], 'function', parent + ' is value object');
    test.equal(typeof cable[parent].one, 'function', parent + ' one is value function');
    test.equal(typeof cable[parent].one.two, 'function', parent + ' one.two is value function');
    test.equal(typeof cable[parent].one.two.three, 'function', parent + ' one.two.three is value function');
  });

  test.equal(typeof cable.__channels__, 'object', '__channels__  is value object');
  test.equal(typeof cable.__channels__.one, 'object', '__channels__  one is value object');
  test.equal(typeof cable.__channels__.one.two, 'object', '__channels__  one.two is value object');
  test.equal(typeof cable.__channels__.one.two.three, 'object', '__channels__  one.two.three is value object');
  test.end();

});

test('Cable Direct Messages', (test) => {

  const cable = Cable({asynchronous: false});

  cable.channel('one');
  cable.channel('one.two');
  cable.channel('one.two.three');

  test.plan(3);

  cable.subscribe.one(function(value) {
    test.equal(value, 1, 'publish sent 1 on channel one');
  });
  cable.subscribe.one.two(function(value) {
    test.equal(value, 2, 'publish sent 2 on channel one.two');
  });
  cable.subscribe.one.two.three(function(value) {
    test.equal(value, 3, 'publish sent 3 on channel one.two.three');
  });

  cable.publish.one(1);
  cable.publish.one.two(2);
  cable.publish.one.two.three(3);
  test.end();

});

test('Cable Broadcast Messages', (test) => {

  const cable = Cable({asynchronous: false});

  cable.channel('one');
  cable.channel('one.two');
  cable.channel('one.two.three');

  test.plan(3);

  cable.subscribe.one(function(value) {
    test.equal(value, 4, 'publish sent 4 on channel one');
  });
  cable.subscribe.one.two(function(value) {
    test.equal(value, 4, 'publish sent 4 on channel one.two');
  });
  cable.subscribe.one.two.three(function(value) {
    test.equal(value, 4, 'publish sent 4 on channel one.two.three');
  });

  cable.publish.one.broadcast(4);
  test.end();

});

test('Cable Signal-Slot Pattern', (test) => {

  const cable = Cable({asynchronous: false});
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

  cable.subscribe.one(slots, slots.a);
  cable.subscribe.one.two(slots, 'b');
  cable.subscribe.one.two.three(slots, slots.c);

  cable.publish.one(1);
  cable.publish.one.two(2);
  cable.publish.one.two.three(3);
  test.end();

});

test('Cable Helper Methods', (test) => {

  const cable = Cable({asynchronous: false});

  cable.channel('one');
  cable.channel('one.two');
  cable.channel('one.two.three');

  test.equal(cable.walkParents(cable.publish), cable.publish, 'a walk with no parents returns the object');
  test.equal(cable.walkParents(cable.subscribe), cable.subscribe, 'a walk with no parents returns the object');
  test.end();

});

test('Cable Sparse Tree', (test) => {

  const cable = Cable({asynchronous: false});

  cable.channel('one');
  cable.channel('one.twoA');
  cable.channel('one.twoB');
  cable.channel('one.twoC.threeA');
  cable.channel('one.twoC.threeB');
  cable.channel('one.twoC.threeC');
  cable.channel('one.twoD.threeA.fourA');

  test.plan(4);

  cable.subscribe.one.twoC.threeA(function(value) {
    test.equal(value, 4, 'publish sent 4 on channel one.twoC.threeA');
  });
  cable.subscribe.one.twoC.threeB(function(value) {
    test.equal(value, 4, 'publish sent 4 on channel one.twoC.threeB');
  });
  cable.subscribe.one.twoC.threeC(function(value) {
    test.equal(value, 4, 'publish sent 4 on channel one.twoC.threeC');
  });

  test.equal(typeof cable.subscribe.one.twoD.threeA.fourA, 'function', 'all channels exist');

  cable.publish.one.twoC.broadcast(4);
  test.end();

});

test('Cable Internal Bridging', (test) => {

  const cable = Cable({asynchronous: false});

  cable.channel('A.A');
  cable.channel('A.B');
  cable.channel('B.A');
  cable.channel('B.B');

  cable.bridge('A', 'B');

  test.plan(3);

  cable.subscribe.B(function(value) {
    test.equal(value, 1, 'bridge is called with local calls and broadcasts');
  });
  cable.subscribe.B.B(function(value) {
    test.equal(value, 1, 'bridge calls with broadcasts');
  });

  cable.publish.A(1);
  cable.publish.A.broadcast(1);
  test.end();

});

test('Cable External Bridging', (test) => {

  const cable1 = Cable({asynchronous: false});
  const cable2 = Cable({asynchronous: false});

  cable1.channel('A.A');
  cable1.channel('A.B');
  cable2.channel('B.A');
  cable2.channel('B.B');

  cable1.bridge('A', cable2.publish('B'));

  test.plan(3);

  cable2.subscribe.B(function(value) {
    test.equal(value, 1, 'bridge is called with local calls and broadcasts');
  });
  cable2.subscribe.B.B(function(value) {
    test.equal(value, 1, 'bridge calls with broadcasts');
  });

  cable1.publish.A(1);
  cable1.publish.A.broadcast(1);
  test.end();

});

test('Cable Graph Bridging', (test) => {

  const cable1 = Cable({asynchronous: false});
  const cable2 = Cable({asynchronous: false});

  cable1.channel('A.A');
  cable1.channel('A.B');
  cable2.channel('B.A');
  cable2.channel('B.B');
  cable2.channel('B.C');
  cable2.channel('B.C.A');

  cable1.bridge('A', cable2.publish('B'));
  cable2.bridge('B', cable1.publish('A'));

  test.plan(5);

  cable2.subscribe.B(function(value) {
    test.equal(value, 1, 'local calls');
  });
  cable2.subscribe.B.B(function(value) {
    test.equal(value, 1, 'broadcast to level1-child1');
  });
  cable2.subscribe.B.C(function(value) {
    test.equal(value, 1, 'broadcast to level1-child2');
  });
  cable2.subscribe.B.C.A(function(value) {
    test.equal(value, 1, 'broadcast to level2-child1');
  });

  cable1.publish.A(1);
  cable1.publish.A.broadcast(1);
  test.end();

});

test('Cable Receipt', (test) => {

  const cable = Cable({asynchronous: false});

  cable.channel('B.A');
  cable.channel('B.B');
  cable.channel('B.C');
  cable.channel('B.C.A');

  test.plan(8);

  cable.subscribe.B(function(value) {
    test.equal(value, 1, 'local calls');
    return 1;
  });
  cable.subscribe.B.B(function(value) {
    test.equal(value, 1, 'broadcast to level1-child1');
    return 1;
  });
  cable.subscribe.B.C(function(value) {
    test.equal(value, 1, 'broadcast to level1-child2');
    return 1;
  });
  cable.subscribe.B.C.A(function(value) {
    test.equal(value, 1, 'broadcast to level2-child1');
    return 1;
  });

  cable.publish.B.receipt(function(value) {
    test.equal(value, 1, 'receipt is always 1');
  }).broadcast(1);

  test.end();

});
