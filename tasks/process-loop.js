var child_process = require("child_process")
var async = require('async')
var path = require('path')
var util = require('util')

module.exports = function (grunt) {
  var _ = grun.util._

  return function processLoop(op, cb) {
    // rip up the op into vars
    var filesSrc                      = op.filesSrc
      , mocha_path                    = op.mocha_path
      , localopts                     = op.localopts
      , localOtherOptionsStringified  = op.localOtherOptionsStringified
      , itLabel                       = op.itLabel
      , limit                         = op.limit || 5
      , parallelType                  = op.parallelType

    // pick a way to split up the work
    if (parallelType = 'directory') {  // async by directory
      async
        .mapLimit(_.chain(filesSrc)
                    // group by the directory path
                    .groupBy(function(file) {
                      return path.dirname(file)
                    })
                    // rework the data into something async will be ok with
                    .map(function(files, dir) {
                      return [files, dir]
                    })
                    .value()
                , limit
                , function(args, _cb) {
                    // update the label, do the work
                    work(itLabel + ':' + args[1].replace('/', '-')
                        , args[0]
                        , _cb)
                }
                , cb)
    } else if (parallelType = 'file') {// async by file
      async
        .mapLimit(filesSrc
                , limit
                , function(file, _cb) {
                    // update the label, do the work
                    work(itLabel + ':' + file.replace('/', '-')
                        , file
                        , _cb)
                }
                , cb)
    }  else {                          // not async
      work(itLabel, filesSrc, cb)
    }

    function work(_itLabel, _filesSrc, _cb) {

      // inform the world that we are going to start
      grunt.log.writeln("[grunt-loop-mocha] iteration: ", _itLabel);

      // update the reporter file
      if (localMochaOptions.reporter === "xunit-file") {
        process.env.XUNIT_FILE = reportLocation + "/xunit-" + _itLabel + ".xml";
        grunt.log.writeln("[grunt-loop-mocha] xunit output: ", process.env.XUNIT_FILE);
      }

      // push the files into localopts
      _filesSrc.forEach(function (el) {
        localopts.push(el);
      });

      // more notify
      grunt.log.writeln("[grunt-loop-mocha] mocha argv: ", localopts.toString());

      // start a process
      var child = child_process
                    .spawn(mocha_path
                        , localopts
                        , {env: _.merge(process.env, localOtherOptionsStringified)});

      // pipe the output (in paralell this is going to be noisey)
      child.stdout.pipe(process.stdout)
      child.stderr.pipe(process.stderr)

      // report back the outcome
      child.on('close', function (code) {
        _cb(null, {_itLabel: code})
      });
    }
  }
}