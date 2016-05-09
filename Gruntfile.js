module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.initConfig({
        paths: {
            src: {
                app_sms: [
                    'src/sms_app.js'
                ],
                app_ussd: [
                    'src/ussd_app.js'
                ],
                prd_sms: [
                    'src/index.js',
                    '<%= paths.src.app_sms %>',
                    'src/init.js'
                ],
                prd_ussd: [
                    'src/index.js',
                    '<%= paths.src.app_ussd %>',
                    'src/init.js'
                ],
                all: [
                    'src/**/*.js'
                ]
            },
            dest: {
                prd_sms: 'go-app-sms.js',
                prd_ussd: 'go-app-ussd.js'
            },
            test_sms: [
                'test/setup.js',
                '<%= paths.src.app_sms %>',
                'test/sms_app.test.js'
            ],
            test_ussd: [
                'test/setup.js',
                '<%= paths.src.app_ussd %>',
                'test/ussd_app.test.js'
            ]
        },

        jshint: {
            options: {jshintrc: '.jshintrc'},
            all: [
                'Gruntfile.js',
                '<%= paths.src.all %>',
                '<%= paths.test_sms %>',
                '<%= paths.test_ussd %>'
            ]
        },

        watch: {
            src: {
                files: [
                    '<%= paths.src.all %>',
                    '<%= paths.test_sms %>',
                    '<%= paths.test_ussd %>'
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
            prd_sms: {
                src: ['<%= paths.src.prd_sms %>'],
                dest: '<%= paths.dest.prd_sms %>'
            },
            prd_ussd: {
                src: ['<%= paths.src.prd_ussd %>'],
                dest: '<%= paths.dest.prd_ussd %>'
            }
        },

        mochaTest: {
            options: {
                reporter: 'spec'
            },
            test_sms: {
                src: ['<%= paths.test_sms %>']
            },
            test_ussd: {
                src: ['<%= paths.test_ussd %>']
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
