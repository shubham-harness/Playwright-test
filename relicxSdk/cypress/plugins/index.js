const fs = require('fs');

const relicxTasks = (on) => {
    on('task', {
      deleteFile(filePath) {
        return new Promise((resolve, reject) => {
          fs.unlink(filePath, (err) => {
            if (err) {
              return reject(err);
            }
            resolve(null);
          });
        });
      },
    });
  };

module.exports = { relicxTasks };
