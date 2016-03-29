var vumigo = require('vumigo_v02');
var fixtures = require('./fixtures');
var AppTester = vumigo.AppTester;
var assert = require('assert');


describe("app", function() {
    describe("GoApp", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoApp();

            tester = new AppTester(app);

            tester
                .setup.config.app({
                    name: 'test_app'
                })
                .setup(function(api) {
                    fixtures().forEach(api.http.fixtures.add);
                });
        });

        describe("when the user starts a session without being registered", function() {
            it("should ask to select language for future sessions", function() {
                return tester
                    .start()
                    .check.interaction({
                        state: 'states:select_language',
                        reply: [
                            'Welcome to MMC Service. Choose your language:',
                            '1. English',
                            '2. isiZulu',
                            '3. Sesotho',
                            '4. Siswati',
                            '5. isiNdebele',
                            '6. Setswana',
                            '7. isiXhosa',
                            '8. Xitsonga'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when the user selects a language", function() {
            it("should save result to contact and display the main menu", function() {
                return tester
                    .setup.user.state('states:select_language')
                    .input('1')
                    .check.interaction({
                        state: 'states:main_menu'
                    })
                    .check(function(api, im, app) {
                        assert.strictEqual(app.contact.extra.language_choice, 'en');
                    })
                    .run();
            });
        });

        describe("when the user starts a session after having set a language", function() {
            it("should show the main menu", function() {
                return tester
                    .setup.user.lang('en')
                    .start()
                    .check.interaction({
                        state: 'states:main_menu',
                        reply: [
                            'Medical Male Circumcision (MMC):',
                            '1. Find a clinic',
                            '2. Speak to an expert for FREE',
                            '3. Get FREE SMSs about your MMC recovery',
                            '4. Rate your clinic’s MMC service',
                            '5. Next',
                            '6. Exit'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when next is selected on main menu page 1", function() {
            it("should show the main menu page 2", function() {
                return tester
                    .setup.user.state('states:main_menu')
                    .input('5')
                    .check.interaction({
                        state: 'states:main_menu_pg2',
                        reply: [
                            'Medical Male Circumcision (MMC):',
                            '1. Join Brothers for Life',
                            '2. Change Language',
                            '3. Back',
                            '4. Exit'
                        ].join('\n')
                    })
                    .run();
            });
        });

    });
});
