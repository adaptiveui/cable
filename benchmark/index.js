var Benchmark = require('benchmark');
var suite = new Benchmark.Suite;

import _ from 'lodash'
import Cable from '../lib'

suite.add('Cable#create', function() {
  Cable()
}).run({
  'async': true
});