import test from 'tape'
import _ from 'lodash'
import Cable from '../lib'

test('Cable Creation', (test) => {

  const cable = new Cable();

  test.equal(cable.id, 'root', 'without any channel name a cable is the root');
  test.equal(cable.channelPath, 'root', 'channel returns the channel of a cable');
  test.equal(cable.parentPath, '', 'with a parent a cable has not path');
  test.end();
});

test('Cable Channel Definition', (test) => {

  const cable = new Cable();

  cable.channel('W/A/B');
  cable.channel('X.A.B');
  cable.channel('Y:A:B');
  cable.channel('Z-A-B');

  test.equal(cable.W.A.B instanceof Cable, true, 'split on /');
  test.equal(cable.X.A.B instanceof Cable, true, 'split on .');
  test.equal(cable.Y.A.B instanceof Cable, true, 'split on :');
  test.equal(cable.Z.A.B instanceof Cable, true, 'split on -');

  test.deepEqual(cable._.channels, ['W', 'X', 'Y', 'Z'], 'root cable has all children W, X, Y, Z');
  test.deepEqual(cable.W._.channels, ['A'], 'A is a child cable of W');
  test.deepEqual(cable.W.A._.channels, ['B'], 'B is a child cable of A');
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

  test.plan(3);

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

/* -- is this useful?
 test('Cable Walk Tree', (test) => {

 const cable = Cable();
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
 */


/*



 test('Cable Internal Bridging', (test) => {

 const cable = Cable();

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

 const cable1 = Cable();
 const cable2 = Cable();

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

 const cable1 = Cable();
 const cable2 = Cable();

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

 const cable = Cable();

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
 */
