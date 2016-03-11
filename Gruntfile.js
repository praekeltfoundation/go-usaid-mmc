module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.initConfig({
        paths: {
            src: {
                app: [
                    'src/app.js'
                ],
                app_ussd: [
                    'src/ussd/app.js'
                ],
                prd: [
                    'src/index.js',
                    '<%= paths.src.app %>',
                    'src/init.js'
                ],
                prd_ussd: [
                    'src/ussd/index.js',
                    '<%= paths.src.app_ussd %>',
                    'src/ussd/init.js'
                ],
                all: [
                    'src/**/*.js'
                ]
            },
            dest: {
                prd: 'go-app.js',
                prd_ussd: 'go-app-ussd.js'
            },
            test: [
                'test/setup.js',
                '<%= paths.src.app %>',
                'test/**/*.test.js'
            ]
        },

        jshint: {
            options: {jshintrc: '.jshintrc'},
            all: [
                'Gruntfile.js',
                '<%= paths.src.all %>',
                '<%= paths.test %>'
            ]
        },

        watch: {
            src: {
                files: [
                    '<%= paths.src.all %>',
                    '<%= paths.test %>'
                    //'<%= paths.test_ussd %>'
                ],
                tasks: ['default'],
                options: {
                    atBegin: true
                }
            }
        },

        concat: {
            options: {
                banner: [
                    '// WARNING: This is a generated file.',
                    '//          If you edit it you will be sad.',
                    '//          Edit src/app.js instead.',
                    '\n' // Newline between banner and content.
                ].join('\n')
            },
            prd: {
                src: ['<%= paths.src.prd %>'],
                dest: '<%= paths.dest.prd %>'
            },
            prd_ussd: {
                src: ['<%= paths.src.prd_ussd %>'],
                dest: '<%= paths.dest.prd_ussd %>'
            }
        },

        mochaTest: {
            test: {
                src: ['<%= paths.test %>'],
                options: {
                    reporter: 'spec'
                }
            }
        }
    });

    grunt.registerTask('test', [
        'jshint',
        'build',
        'mochaTest'
    ]);

    grunt.registerTask('build', [
        'concat',
    ]);

    grunt.registerTask('default', [
        'build',
        'test'
    ]);
};
