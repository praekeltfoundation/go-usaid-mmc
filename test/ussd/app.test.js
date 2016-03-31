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

        describe("when user selects 'Get FREE SMSs about your MMC recovery'  on main menu page 1", function() {
            it("should show the healthsites menu", function() {
                return tester
                    .setup.user.state('states:main_menu')
                    .input('3')
                    .check.interaction({
                        state: 'states:healthsites',
                        reply: [
                            'Welcome to Healthsites. What type of clinic are you looking for?',
                            '1. Nearest Clinic',
                            '2. MMC Clinic',
                            '3. HCT Clinic'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when user selects '4. Rate your clinic’s MMC service'  on main menu page 1", function() {
            it("should show the service ratings menu", function() {
                return tester
                    .setup.user.state('states:main_menu')
                    .input('4')
                    .check.interaction({
                        state: 'states:service_rating_1',
                        reply: [
                            'At which clinic did you get circumcised? Please be specific with the name and ' +
                            'location. e.g. Peterville Clinic, Rivonia, Johannesburg'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when user responds 'I have not been circumcised' in service rating question 2", function() {
            it("should respond with 'looking for ratings by circumcised men'", function() {
                return tester
                    .setup.user.state('states:service_rating_1')
                    .inputs('User entered location', '3')
                    .check.interaction({
                        state: 'states:service_rating_end2',
                        reply: [
                            'Thank you for your interest. We are only looking for ratings from men who have had ' +
                            'their circumcision at a clinic recently.',
                            '1. Main Menu',
                            '2. Exit'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when user responds 'Yes/No' in service rating question 2", function() {
            it("should finish the questionnaire and get a Thank you response", function() {
                return tester
                    .setup.user.state('states:service_rating_1')
                    .inputs('User entered location', '1', '5', '1')
                    .check.interaction({
                        state: 'states:service_rating_end1',
                        reply: [
                            'Thanks for rating your circumcision experience. We appreciate your feedback, it will ' +
                            'help us improve our MMC service.',
                            '1. Main Menu',
                            '2. Exit'
                        ].join('\n')
                    })
                    .run();
            });
        });

    });
});
