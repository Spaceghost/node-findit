var findit = require('../');

var finder = findit(process.argv[2], {followSymlinks: true});

finder.on('path', function (file, stat, linkPath) {
  console.log(file);
})

finder.on('error', function (err) {
  console.log("error:", err.path, err.code);
});
