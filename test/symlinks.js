var test = require('tap').test;
var path = require('path');
var findit = require('../');

function helper(t, dir, options, callback) {
    var symlinks = [];
    var files = [];
    var dirs = [];
    
    var finder = findit(dir, options);
    
    finder.on('link', function (link, stat) {
        t.ok(stat.isSymbolicLink());
        symlinks.push(path.basename(link));
    });
    
    finder.on('file', function (file, stat) {
        t.ok(stat.isFile());
        files.push(path.basename(file));
    });
    
    finder.on('directory', function (dir, stat) {
        t.ok(stat.isDirectory());
        dirs.push(path.basename(dir));
    });
    
    finder.on('error', function (err) {
        t.fail(err);
    });
    
    finder.on('end', function () {
        symlinks.sort();
        files.sort();
        dirs.sort();
        
        callback({ symlinks: symlinks, files: files, dirs: dirs });
    });
}

test('links', function (t) {
    helper(t, __dirname + '/symlinks/dir1', { followSymlinks: false }, done);
    function done (data) {
        t.deepEqual(data.symlinks, [
            'dangling-symlink', 'link-to-dir2', 'link-to-file'
        ]);
        t.deepEqual(data.files, [ 'file1' ]);
        t.deepEqual(data.dirs, [ 'dir1' ]);
        t.end();
    }
});

test('follow links', function (t) {
    helper(t, __dirname + '/symlinks/dir1', { followSymlinks: true }, done);
    
    function done (data) {
        t.deepEqual(data.symlinks, [
            'cyclic-link-to-dir1', 'dangling-symlink', 'link-to-dir2',
            'link-to-file'
        ]);
        t.deepEqual(data.files, ['file', 'file1', 'file2']);
        t.deepEqual(data.dirs, [ 'dir1', 'link-to-dir2' ]);
        t.end();
    }
});