var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');

module.exports = findit;

function findit(basedir, opts) {
  opts = opts || {};
  var followSymlinks = !!opts.followSymlinks;
  var myFs = opts.fs || fs;
  var emitter = new EventEmitter();
  var stopped = false;
  var pending = 0;
  var seen = {};

  emitter.stop = stop;
  walkPath(basedir);
  return emitter;

  function recursiveReadDir(basedir) {
    pendStart();
    myFs.readdir(basedir, function(err, entries) {
      if (stopped) return;
      if (err) {
        handleError(err, basedir);
        pendEnd();
        return;
      }
      entries.forEach(function(entry) {
        walkPath(path.join(basedir, entry));
      });
      pendEnd();
    });
  }

  function walkPath(fullPath) {
    if (seen[fullPath]) {
      var err = new Error("file system loop detected");
      err.code = 'ELOOP';
      handleError(err, fullPath);
      return;
    }
    seen[fullPath] = true;

    pendStart();
    myFs.lstat(fullPath, function(err, stats) {
      if (stopped) return;
      if (err) {
        handleError(err, fullPath);
        pendEnd();
        return;
      }
      emitter.emit('path', fullPath, stats);
      if (stats.isDirectory()) {
        emitter.emit('directory', fullPath, stats, stop);
        recursiveReadDir(fullPath);
      } else if (stats.isFile()) {
        emitter.emit('file', fullPath, stats);
      } else if (stats.isSymbolicLink()) {
        emitter.emit('link', fullPath, stats);
        if (followSymlinks) recursiveReadLink(fullPath);
      }
      pendEnd();
    });
  }

  function recursiveReadLink(fullPath) {
    pendStart();
    myFs.readlink(fullPath, function(err, linkString) {
      if (stopped) return;
      if (err) {
        handleError(err, fullPath);
        pendEnd();
        return;
      }
      var linkPath = path.join(path.dirname(fullPath), linkString);
      emitter.emit('readlink', fullPath, linkPath);
      walkPath(linkPath);
      pendEnd();
    });
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    emitter.emit('stop');
  }

  function handleError(err, errPath) {
    if (!err || stopped) return;
    err.path = errPath;
    emitter.emit('error', err);
  }

  function pendStart() {
    pending += 1;
  }

  function pendEnd() {
    if (stopped) return;
    pending -= 1;
    if (pending === 0) {
      emitter.emit('end');
    } else if (pending < 0) {
      // this should never happen; if this gets thrown we need to debug findit
      // and this stack trace will help.
      throw new Error("pendEnd called too many times");
    }
  }
}
