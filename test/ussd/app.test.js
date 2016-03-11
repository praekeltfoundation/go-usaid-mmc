var vumigo = require('vumigo_v02');
var fixtures = require('./fixtures');
var AppTester = vumigo.AppTester;


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
                            'What language would you like to use?',
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
            it("should display the main menu", function() {
                return tester
                    .setup.user.state('states:select_language')
                    .input('1')
                    .check.interaction({
                        state: 'states:main_menu'
                    })
                    .run();
            });
        });

        describe("when the user starts a session after having set a language", function() {
            it("should show the home menu", function() {
                return tester
                    .setup.user.lang('en')
                    .start()
                    .check.interaction({
                        state: 'states:main_menu',
                        reply: [
                            'Hi there! What do you want to do?',
                            '1. Show this menu again',
                            '2. Exit'
                        ].join('\n')
                    })
                    .run();
            });
        });
    });
});
