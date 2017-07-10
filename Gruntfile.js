// Gruntfile for everything MTG

module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    uglify: {
      scripts: {
        expand: true,
        cwd: 'dev/server',
        src: ['*.js', '**/*.js'],
        dest: 'server',
        ext: '.js'
      }
    },

    sass: {
      dist: {
        files: [{
          expand: true,
          cwd: 'dev/client/sass',
          src: ['*.scss'],
          dest: 'dev/client/css',
          ext: '.css'
        }]
      }
    },

    cssmin: {
      target: {
        files: [{
          expand: true,
          cwd: 'dev/client/css',
          src: ['*.css', '!*.min.css'],
          dest: 'client/assets/css',
          ext: '.min.css'
        }]
      }
    }

  });

  grunt.loadNpmTasks('grunt-contrib-sass');

  grunt.registerTask('default', ['sass', 'cssmin']);
  grunt.registerTask('server', ['uglify']);
};
